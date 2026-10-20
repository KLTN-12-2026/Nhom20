import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TrangThaiChung,
  TrangThaiHoSoKham,
  TrangThaiLuotKham,
} from '@prisma/client';

import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { ExaminationHistoryQueryDto } from './dto/examination-history-query.dto';
import { SaveExaminationDto } from './dto/save-examination.dto';
import { kiemTraDuLieuKhamChuyenKhoa } from './dto/kham-chuyen-khoa/kiem-tra-du-lieu-kham-chuyen-khoa';
import { PrescriptionSafetyService } from './prescription-safety.service';
import {
  EXAMINATION_REPOSITORY,
  type ExaminationRepository,
  type ExaminationWithRelations,
} from './repositories/examination.repository.interface';

@Injectable()
export class ExaminationsService {
  constructor(
    @Inject(EXAMINATION_REPOSITORY)
    private readonly repository: ExaminationRepository,
    private readonly realtimeService: RealtimeService,
    private readonly thongBaoService: ThongBaoService,
    private readonly prescriptionSafetyService: PrescriptionSafetyService,
  ) {}

  // Lấy lượt khám đang diễn ra của bác sĩ
  async findActiveVisit(userId: number) {
    const doctorId = await this.requireDoctorId(userId);
    const visit = await this.repository.findActiveVisitByDoctorId(doctorId);
    if (!visit) {
      return {
        message: 'Không có lượt khám nào đang diễn ra',
        data: null,
      };
    }
    return {
      message: 'Lấy lượt khám đang diễn ra thành công',
      data: this.visitResponse(visit),
    };
  }

  // Lấy thông tin chi tiết cho chức năng: khám bệnh
  async findByAppointment(userId: number, appointmentId: number) {
    const { visit } = await this.requireOwnedVisit(userId, appointmentId);
    return {
      message: 'Lấy thông tin lượt khám thành công',
      data: this.visitResponse(visit),
    };
  }

  saveDraft(userId: number, appointmentId: number, dto: SaveExaminationDto) {
    return this.save(userId, appointmentId, dto, TrangThaiHoSoKham.BAN_NHAP);
  }

  complete(userId: number, appointmentId: number, dto: SaveExaminationDto) {
    if (!dto.symptoms?.trim())
      throw new BadRequestException('Triệu chứng lâm sàng là thông tin bắt buộc');
    if (!dto.diagnosis?.trim())
      throw new BadRequestException('Chẩn đoán là thông tin bắt buộc');
    if (!dto.conclusion?.trim())
      throw new BadRequestException('Kết luận và dặn dò là thông tin bắt buộc');
    this.validatePrescriptionBeforeComplete(dto);
    return this.save(userId, appointmentId, dto, TrangThaiHoSoKham.DA_HOAN_TAT);
  }

  // --- Hàm dựa trên lượt khám, hỗ trợ bệnh nhân đến trực tiếp không có lichHenId. ---
  // Lấy thông tin chi tiết cho chức năng: khám bệnh
  async findByVisit(userId: number, visitId: number) {
    const { visit } = await this.requireOwnedVisitById(userId, visitId);
    return {
      message: 'Lấy thông tin lượt khám thành công',
      data: this.visitResponse(visit),
    };
  }

  saveDraftByVisit(userId: number, visitId: number, dto: SaveExaminationDto) {
    return this.saveByVisit(userId, visitId, dto, TrangThaiHoSoKham.BAN_NHAP);
  }

  completeByVisit(userId: number, visitId: number, dto: SaveExaminationDto) {
    if (!dto.symptoms?.trim())
      throw new BadRequestException('Triệu chứng lâm sàng là thông tin bắt buộc');
    if (!dto.diagnosis?.trim())
      throw new BadRequestException('Chẩn đoán là thông tin bắt buộc');
    if (!dto.conclusion?.trim())
      throw new BadRequestException('Kết luận và dặn dò là thông tin bắt buộc');
    this.validatePrescriptionBeforeComplete(dto);
    return this.saveByVisit(
      userId,
      visitId,
      dto,
      TrangThaiHoSoKham.DA_HOAN_TAT,
    );
  }

  // Thiếu liều dùng hoặc cách dùng là lỗi nhập đơn, không sinh thành cảnh báo AI.
  private validatePrescriptionBeforeComplete(dto: SaveExaminationDto) {
    const lines = dto.prescription ?? [];
    if (lines.some((line) => !line.dosage?.trim())) {
      throw new BadRequestException(
        'Vui lòng nhập liều dùng cho tất cả thuốc trước khi hoàn tất',
      );
    }
    if (lines.some((line) => !line.instructions?.trim())) {
      throw new BadRequestException(
        'Vui lòng nhập cách dùng cho tất cả thuốc trước khi hoàn tất',
      );
    }
  }

  // Lấy danh sách dữ liệu cho chức năng: khám bệnh
  async findHistory(userId: number, query: ExaminationHistoryQueryDto) {
    const doctorId = await this.requireDoctorId(userId);
    const to = query.to ? this.endOfDay(query.to) : undefined;
    const result = await this.repository.findHistory({
      doctorId,
      search: query.search?.trim() || undefined,
      from: query.from ? this.startOfDay(query.from) : undefined,
      to,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      message: 'Lấy lịch sử khám thành công',
      data: { items: result.items.map((item) => this.recordResponse(item)) },
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: khám bệnh
  async findOne(userId: number, id: number) {
    const doctorId = await this.requireDoctorId(userId);
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ khám');
    if (record.luotKham.bacSiId !== doctorId)
      throw new ForbiddenException('Bạn không được xem hồ sơ của bác sĩ khác');
    return {
      message: 'Lấy chi tiết hồ sơ khám thành công',
      data: this.recordResponse(record),
    };
  }

  // Cập nhật dữ liệu cho chức năng: khám bệnh
  private async save(
    userId: number,
    appointmentId: number,
    dto: SaveExaminationDto,
    status: TrangThaiHoSoKham,
  ) {
    const { visit } = await this.requireOwnedVisit(userId, appointmentId);
    const allowedVisitStatuses = new Set<TrangThaiLuotKham>([
      TrangThaiLuotKham.DA_VAO_PHONG,
      TrangThaiLuotKham.DANG_CHO,
    ]);
    if (!allowedVisitStatuses.has(visit.trangThai)) {
      throw new BadRequestException(
        'Lượt khám không ở trạng thái cho phép cập nhật phiếu khám',
      );
    }
    if (visit.hoSoKham?.trangThai === TrangThaiHoSoKham.DA_HOAN_TAT) {
      throw new BadRequestException('Hồ sơ khám đã hoàn tất và không thể sửa');
    }

    // Chỉ lưu dữ liệu đúng form của chuyên khoa đã được gán cho lượt khám.
    const specialtyData = kiemTraDuLieuKhamChuyenKhoa(
      visit.chuyenKhoa.maChuyenKhoa,
      dto.specialtyData ?? dto.specialtyContent,
    );

    const lines = dto.prescription ?? [];
    const medicineIds = [...new Set(lines.map((line) => line.medicineId))];
    if (medicineIds.length !== lines.length) {
      throw new BadRequestException(
        'Một thuốc không được xuất hiện hai lần trong đơn',
      );
    }
    const medicines = medicineIds.length
      ? await this.repository.findMedicines(medicineIds)
      : [];
    const medicineById = new Map(
      medicines.map((medicine) => [medicine.id, medicine]),
    );
    for (const id of medicineIds) {
      const medicine = medicineById.get(id);
      if (!medicine)
        throw new BadRequestException(`Không tìm thấy thuốc ${id}`);
      if (medicine.trangThai !== TrangThaiChung.DANG_HOAT_DONG) {
        throw new BadRequestException(
          `Thuốc ${medicine.tenThuoc} đang ngừng hoạt động`,
        );
      }
    }

    const writeStatus =
      status === TrangThaiHoSoKham.DA_HOAN_TAT
        ? TrangThaiHoSoKham.BAN_NHAP
        : status;
    let record = await this.repository.save({
      visitId: visit.id,
      status: writeStatus,
      symptoms: dto.symptoms?.trim() || undefined,
      diagnosis: dto.diagnosis?.trim() || undefined,
      icd10Code: dto.icd10Code?.trim() || undefined,
      vitals: dto.vitals,
      specialtyContent: specialtyData,
      specialtyId: visit.chuyenKhoaId,
      specialtyData,
      conclusion: dto.conclusion?.trim() || undefined,
      doctorNotes: dto.doctorNotes?.trim() || undefined,
      followUpDate: dto.followUpDate
        ? this.startOfDay(dto.followUpDate)
        : undefined,
      prescription: lines.map((line) => ({
        medicineId: line.medicineId,
        quantity: line.quantity,
        dosage: line.dosage.trim(),
        frequency: line.frequency.trim(),
        days: line.days,
        instructions: line.instructions?.trim() || undefined,
        unitPrice: medicineById.get(line.medicineId)!.giaBan,
      })),
    });

    const warnings = await this.prescriptionSafetyService.refreshWarnings(
      record.donThuoc?.id,
    );

    if (status === TrangThaiHoSoKham.DA_HOAN_TAT) {
      if (record.donThuoc) {
        await this.prescriptionSafetyService.ensureNoPendingCriticalWarning(
          record.donThuoc.id,
        );
      }
      record = await this.repository.markComplete(record.id, visit.id);
      const prescription = record.donThuoc;
      if (prescription) {
        const payload = this.recordResponse(record);
        this.realtimeService.emitToRoom(
          REALTIME_ROOMS.role('PHARMACIST'),
          REALTIME_EVENTS.PRESCRIPTION_CREATED,
          payload,
        );
        await this.thongBaoService.notifyRoles(['PHARMACIST'], {
          title: 'Có đơn thuốc mới',
          content: `${record.luotKham.benhNhan.hoTen} vừa có đơn thuốc cần cấp.`,
          type: 'DON_THUOC',
          link: '/duoc-si/don-cho-cap',
        });
      }
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.specialty(visit.chuyenKhoaId),
        REALTIME_EVENTS.QUEUE_UPDATED,
        { visitId: visit.id, status: TrangThaiLuotKham.DA_HOAN_TAT },
      );
    }
    return {
      message:
        status === TrangThaiHoSoKham.DA_HOAN_TAT
          ? (record.donThuoc
              ? 'Đã hoàn tất khám và chuyển đơn sang Dược sĩ'
              : 'Đã hoàn tất khám bệnh thành công')
          : 'Đã lưu bản nháp phiếu khám',
      data: { ...this.recordResponse(record), warnings },
    };
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: khám bệnh
  private async requireOwnedVisit(userId: number, appointmentId: number) {
    const doctorId = await this.requireDoctorId(userId);
    const visit = await this.repository.findVisitByAppointmentId(appointmentId);
    if (!visit)
      throw new NotFoundException(
        'Lịch hẹn chưa được check-in để tạo lượt khám',
      );
    if (visit.bacSiId !== doctorId)
      throw new ForbiddenException(
        'Lượt khám không được phân cho bác sĩ hiện tại',
      );
    return { doctorId, visit };
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: khám bệnh
  private async requireOwnedVisitById(userId: number, visitId: number) {
    const doctorId = await this.requireDoctorId(userId);
    const visit = await this.repository.findVisitById(visitId);
    if (!visit) throw new NotFoundException('Không tìm thấy lượt khám');
    if (visit.bacSiId !== doctorId)
      throw new ForbiddenException(
        'Lượt khám không được phân cho bác sĩ hiện tại',
      );
    return { doctorId, visit };
  }

  // Cập nhật dữ liệu cho chức năng: khám bệnh
  private async saveByVisit(
    userId: number,
    visitId: number,
    dto: SaveExaminationDto,
    status: TrangThaiHoSoKham,
  ) {
    const { visit } = await this.requireOwnedVisitById(userId, visitId);
    const allowedVisitStatuses = new Set<TrangThaiLuotKham>([
      TrangThaiLuotKham.DA_VAO_PHONG,
      TrangThaiLuotKham.DANG_CHO,
    ]);
    if (!allowedVisitStatuses.has(visit.trangThai)) {
      throw new BadRequestException(
        'Lượt khám không ở trạng thái cho phép ghi hồ sơ',
      );
    }

    if (visit.hoSoKham?.trangThai === TrangThaiHoSoKham.DA_HOAN_TAT) {
      throw new BadRequestException('Hồ sơ khám đã hoàn tất và không thể sửa');
    }

    // Chỉ lưu dữ liệu đúng form của chuyên khoa đã được gán cho lượt khám.
    const specialtyData = kiemTraDuLieuKhamChuyenKhoa(
      visit.chuyenKhoa.maChuyenKhoa,
      dto.specialtyData ?? dto.specialtyContent,
    );

    const lines = dto.prescription ?? [];
    const medicineIds = [...new Set(lines.map((line) => line.medicineId))];
    if (medicineIds.length !== lines.length) {
      throw new BadRequestException(
        'Một thuốc không được xuất hiện hai lần trong đơn',
      );
    }
    const medicines = medicineIds.length
      ? await this.repository.findMedicines(medicineIds)
      : [];
    const medicineById = new Map(
      medicines.map((medicine) => [medicine.id, medicine]),
    );
    for (const medicineId of medicineIds) {
      const medicine = medicineById.get(medicineId);
      if (!medicine)
        throw new BadRequestException(`Không tìm thấy thuốc ${medicineId}`);
      if (medicine.trangThai !== TrangThaiChung.DANG_HOAT_DONG) {
        throw new BadRequestException(
          `Thuốc ${medicine.tenThuoc} đang ngừng hoạt động`,
        );
      }
    }

    const writeStatus =
      status === TrangThaiHoSoKham.DA_HOAN_TAT
        ? TrangThaiHoSoKham.BAN_NHAP
        : status;
    let record = await this.repository.save({
      visitId: visit.id,
      status: writeStatus,
      symptoms: dto.symptoms,
      diagnosis: dto.diagnosis,
      icd10Code: dto.icd10Code,
      vitals: dto.vitals,
      specialtyContent: specialtyData,
      specialtyId: visit.chuyenKhoaId,
      specialtyData,
      conclusion: dto.conclusion,
      doctorNotes: dto.doctorNotes,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      prescription: lines.map((p) => {
        const med = medicineById.get(p.medicineId);
        if (!med)
          throw new BadRequestException(
            `Thuốc ID ${p.medicineId} không tồn tại`,
          );
        return { ...p, unitPrice: med.giaBan };
      }),
    });

    const warnings = await this.prescriptionSafetyService.refreshWarnings(
      record.donThuoc?.id,
    );

    if (status === TrangThaiHoSoKham.DA_HOAN_TAT) {
      if (record.donThuoc) {
        await this.prescriptionSafetyService.ensureNoPendingCriticalWarning(
          record.donThuoc.id,
        );
      }
      record = await this.repository.markComplete(record.id, visit.id);
    }

    if (status === TrangThaiHoSoKham.DA_HOAN_TAT && record.donThuoc) {
      const payload = {
        prescriptionId: record.donThuoc.id,
        code: record.donThuoc.maDonThuoc,
        patientName: record.luotKham.benhNhan.hoTen,
      };
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.role('PHARMACIST'),
        REALTIME_EVENTS.PRESCRIPTION_CREATED,
        payload,
      );
      await this.thongBaoService.notifyRoles(['PHARMACIST'], {
        title: 'Có đơn thuốc mới',
        content: `${record.luotKham.benhNhan.hoTen} vừa có đơn thuốc cần cấp.`,
        type: 'DON_THUOC',
        link: '/duoc-si/don-cho-cap',
      });
    }
    if (status === TrangThaiHoSoKham.DA_HOAN_TAT) {
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.specialty(visit.chuyenKhoaId),
        REALTIME_EVENTS.QUEUE_UPDATED,
        { visitId: visit.id, status: TrangThaiLuotKham.DA_HOAN_TAT },
      );
    }
    return {
      message:
        status === TrangThaiHoSoKham.DA_HOAN_TAT
          ? (record.donThuoc
              ? 'Đã hoàn tất khám và chuyển đơn sang Dược sĩ'
              : 'Đã hoàn tất khám bệnh thành công')
          : 'Đã lưu bản nháp phiếu khám',
      data: { ...this.recordResponse(record), warnings },
    };
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: khám bệnh
  private async requireDoctorId(userId: number) {
    const doctorId = await this.repository.findDoctorId(userId);
    if (!doctorId)
      throw new NotFoundException('Tài khoản chưa liên kết hồ sơ bác sĩ');
    return doctorId;
  }

  private visitResponse(
    visit: Awaited<
      ReturnType<ExaminationRepository['findVisitByAppointmentId']>
    >,
  ) {
    if (!visit) return null;
    return {
      id: visit.id,
      status: visit.trangThai,
      reason: visit.lyDoKham,
      specialty: {
        id: visit.chuyenKhoa.id,
        code: visit.chuyenKhoa.maChuyenKhoa,
        name: visit.chuyenKhoa.tenChuyenKhoa,
      },
      patient: {
        id: visit.benhNhan.id,
        code: visit.benhNhan.maBenhNhan,
        fullName: visit.benhNhan.hoTen,
        phoneNumber: visit.benhNhan.soDienThoai,
        allergies: visit.benhNhan.diUng.map((allergy) => ({
          id: allergy.id,
          agent: allergy.tacNhanDiUng,
          reaction: allergy.phanUng,
          severity: allergy.mucDo,
          confirmationStatus: allergy.trangThaiXacNhan,
          updatedAt: allergy.updatedAt.toISOString(),
        })),
      },
      recordId: visit.hoSoKham?.id ?? null,
      draft: visit.hoSoKham ? this.recordResponse(visit.hoSoKham) : null,
    };
  }

  private recordResponse(record: ExaminationWithRelations) {
    return {
      id: record.id,
      code: `HS-${record.id.toString().padStart(4, '0')}`,
      status: record.trangThai,
      symptoms: record.trieuChung,
      diagnosis: record.chanDoan,
      icd10Code: record.maIcd10,
      vitals: record.sinhHieu,
      specialtyContent: record.noiDungChuyenKhoa,
      specialtyData:
        record.chiTietChuyenKhoa?.duLieu ?? record.noiDungChuyenKhoa,
      conclusion: record.ketLuan,
      doctorNotes: record.ghiChuBacSi,
      followUpDate: record.ngayTaiKham?.toISOString() ?? null,
      submittedAt: record.thoiGianNop?.toISOString() ?? null,
      updatedAt: record.updatedAt.toISOString(),
      patient: {
        id: record.luotKham.benhNhan.id,
        code: record.luotKham.benhNhan.maBenhNhan,
        fullName: record.luotKham.benhNhan.hoTen,
        phoneNumber: record.luotKham.benhNhan.soDienThoai,
      },
      doctor: {
        id: record.luotKham.bacSi!.id,
        fullName: record.luotKham.bacSi!.hoTen,
        specialty: record.luotKham.bacSi!.chuyenKhoa.tenChuyenKhoa,
      },
      prescription: record.donThuoc
        ? {
            id: record.donThuoc.id,
            code: record.donThuoc.maDonThuoc,
            status: record.donThuoc.trangThai,
            items: record.donThuoc.chiTiet.map((line) => ({
              id: line.id,
              medicine: {
                id: line.thuoc.id,
                code: line.thuoc.maThuoc,
                name: line.thuoc.tenThuoc,
                unit: line.thuoc.donViTinh,
              },
              quantity: line.soLuong,
              dosage: line.lieuDung,
              frequency: line.tanSuat,
              days: line.soNgaySuDung,
              instructions: line.huongDanSuDung,
              unitPrice: Number(line.donGia),
              total: Number(line.thanhTien),
            })),
          }
        : null,
    };
  }

  private startOfDay(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private endOfDay(value: string) {
    return new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
  }
}
