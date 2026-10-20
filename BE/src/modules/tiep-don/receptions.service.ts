import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  MucDoDiUng,
  MucDoUuTienTiepDon,
  PhanHeNhatKyHeThong,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';

import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import {
  RECEPTION_REPOSITORY,
  type FollowUpWithRelations,
  type ReceptionRepository,
  type ReceptionWithRelations,
} from './repositories/reception.repository.interface';

@Injectable()
export class ReceptionsService {
  constructor(
    @Inject(RECEPTION_REPOSITORY)
    private readonly receptionRepository: ReceptionRepository,
    private readonly realtimeService: RealtimeService,
    private readonly auditLogsService: AuditLogsService,
    private readonly thongBaoService: ThongBaoService,
  ) {}

  // Xử lý logic nghiệp vụ cho chức năng: tiếp đón
  async searchPatients(search: string) {
    const patients = await this.receptionRepository.searchPatients(
      search?.trim() ?? '',
    );
    return {
      message: 'Tìm kiếm bệnh nhân thành công',
      data: patients.map((patient) => ({
        id: patient.id,
        code: patient.maBenhNhan,
        fullName: patient.hoTen,
        phoneNumber: patient.soDienThoai,
        email: patient.email,
        dateOfBirth: patient.ngaySinh?.toISOString().slice(0, 10) ?? null,
        gender: patient.gioiTinh,
        address: patient.diaChi,
        identityNumber: patient.soCanCuoc,
        healthInsuranceNumber: patient.maTheBaoHiemYTe,
        allergies: patient.diUng.map((allergy) => ({
          id: allergy.id,
          agent: allergy.tacNhanDiUng,
          reaction: allergy.phanUng,
          severity: allergy.mucDo,
          confirmationStatus: allergy.trangThaiXacNhan,
        })),
      })),
    };
  }

  async searchAllPatients(search: string, currentUser?: AuthenticatedUser) {
    const specialtyIds = await this.getManagedSpecialtyIds(currentUser);
    const patients = await this.receptionRepository.searchAllPatients(
      search?.trim() ?? '',
      specialtyIds,
    );
    let managedSpecialty: string | null = null;
    if (specialtyIds && specialtyIds.length > 0) {
      managedSpecialty = await this.receptionRepository.findSpecialtyName(
        specialtyIds[0],
      );
    }
    return {
      message: 'Lấy danh sách bệnh nhân thành công',
      data: patients.map((patient) => this.patientResponse(patient)),
      managedSpecialty,
    };
  }

  async findPatientRecord(id: number, currentUser: AuthenticatedUser) {
    const specialtyIds = await this.getManagedSpecialtyIds(currentUser);
    const patient = await this.receptionRepository.findPatientRecord(id, specialtyIds);
    if (!patient) throw new BadRequestException('Không tìm thấy bệnh nhân');
    return {
      message: 'Lấy hồ sơ bệnh nhân thành công',
      data: {
        ...this.patientResponse(patient),
        visits: patient.luotKham.map((visit: any) => ({
          id: visit.id,
          date: visit.createdAt,
          specialty: visit.chuyenKhoa.tenChuyenKhoa,
          doctor: visit.bacSi?.hoTen ?? null,
          reason: visit.lyDoKham,
          examination: visit.hoSoKham
            ? {
                diagnosis: visit.hoSoKham.chanDoan,
                conclusion: visit.hoSoKham.ketLuan,
                notes: visit.hoSoKham.ghiChuBacSi,
              }
            : null,
          prescription: visit.hoSoKham?.donThuoc
            ? {
                status: visit.hoSoKham.donThuoc.trangThai,
                refusal: visit.hoSoKham.donThuoc.lyDoTuChoi
                  ? {
                      reason: visit.hoSoKham.donThuoc.lyDoTuChoi,
                      refusedAt: visit.hoSoKham.donThuoc.thoiGianTuChoi,
                      pharmacist:
                        visit.hoSoKham.donThuoc.nguoiTuChoi?.hoTen ?? null,
                    }
                  : null,
                items: visit.hoSoKham.donThuoc.chiTiet.map((line: any) => ({
                  medicine: line.thuoc.tenThuoc,
                  quantity: line.soLuong,
                  dosage: line.lieuDung,
                  frequency: line.tanSuat,
                })),
              }
            : null,
        })),
      },
    };
  }

  // Trưởng khoa chỉ xem hồ sơ phát sinh từ chuyên khoa mình phụ trách; các role khác giữ phạm vi hiện có.
  private async getManagedSpecialtyIds(currentUser?: AuthenticatedUser) {
    if (!currentUser?.roles.includes('DOCTOR')) return undefined;

    const specialtyIds = await this.receptionRepository.findManagedSpecialtyIds(
      currentUser.id,
    );
    if (specialtyIds.length === 0) {
      throw new ForbiddenException(
        'Chỉ trưởng khoa mới được xem hồ sơ bệnh nhân của khoa mình',
      );
    }
    return specialtyIds;
  }

  private patientResponse(patient: any) {
    return {
      id: patient.id,
      code: patient.maBenhNhan,
      fullName: patient.hoTen,
      phoneNumber: patient.soDienThoai,
      email: patient.email,
      dateOfBirth: patient.ngaySinh?.toISOString().slice(0, 10) ?? null,
      gender: patient.gioiTinh,
      address: patient.diaChi,
      identityNumber: patient.soCanCuoc,
      healthInsuranceNumber: patient.maTheBaoHiemYTe,
      allergies: (patient.diUng ?? []).map((allergy: any) => ({
        id: allergy.id,
        agent: allergy.tacNhanDiUng,
        reaction: allergy.phanUng,
        severity: allergy.mucDo,
        confirmationStatus: allergy.trangThaiXacNhan,
      })),
    };
  }

  // Lấy thông tin chi tiết cho chức năng: tiếp đón
  async findTodayQueue() {
    const appointments = await this.receptionRepository.findTodayQueue(
      this.today(),
    );
    return {
      message: 'Lấy hàng đợi tiếp đón thành công',
      data: {
        items: appointments
          .map((item) => this.toResponse(item))
          .sort((left, right) => {
            if (left.isNewPatient !== right.isNewPatient) {
              return left.isNewPatient ? 1 : -1;
            }
            return left.ticket.ordinalNumber - right.ticket.ordinalNumber;
          }),
      },
    };
  }

  async findTicket(queueNumber: string) {
    const ticket = await this.receptionRepository.findTicketByQueueNumber(
      queueNumber.trim(),
    );
    if (!ticket?.luotKham) {
      throw new BadRequestException('Không tìm thấy phiếu tiếp đón');
    }

    const visit = ticket.luotKham;
    return {
      message: 'Lấy phiếu tiếp đón thành công',
      data: {
        queueNumber: ticket.maSoThuTu,
        patientName: visit.benhNhan.hoTen,
        phoneNumber: visit.benhNhan.soDienThoai,
        specialty: visit.chuyenKhoa.tenChuyenKhoa,
        doctorAndRoom: visit.bacSi?.hoTen ?? 'Chưa phân công bác sĩ',
        priority: this.priorityLabel(visit.mucDoUuTien),
        issuedAt: ticket.createdAt.toISOString(),
      },
    };
  }

  // Lễ tân chỉ xem danh sách tái khám từ hồ sơ đã hoàn tất để gọi chăm sóc thủ công.
  // Hệ thống không triển khai hay tạo bản ghi cho kênh nhắn tin bên ngoài.
  async findFollowUps() {
    const today = this.today();
    const tomorrow = this.addDays(today, 1);
    const records = await this.receptionRepository.findFollowUps(
      today,
      tomorrow,
    );

    return {
      message: 'Lấy danh sách nhắc tái khám thành công',
      data: {
        today: records
          .filter(
            (record) =>
              this.dateKey(record.ngayTaiKham) === this.dateKey(today),
          )
          .map((record) => this.toFollowUpResponse(record)),
        tomorrow: records
          .filter(
            (record) =>
              this.dateKey(record.ngayTaiKham) === this.dateKey(tomorrow),
          )
          .map((record) => this.toFollowUpResponse(record)),
      },
    };
  }

  // Gom số liệu theo tuần để Tổng quan chỉ cần gọi một API duy nhất.
  async getDashboard() {
    const today = this.today();
    const endDate = this.addDays(today, 6);
    const dashboard = await this.receptionRepository.getDashboardData(
      today,
      endDate,
    );
    const specialtyNames = new Map(
      dashboard.specialties.map((specialty) => [
        specialty.id,
        specialty.tenChuyenKhoa,
      ]),
    );
    const totalsByDate = new Map(
      dashboard.appointmentsByDay.map((item) => [
        this.dateKey(item.ngayHen),
        item._count._all,
      ]),
    );

    return {
      message: 'Lấy dữ liệu tổng quan thành công',
      data: {
        range: {
          from: this.dateKey(today),
          to: this.dateKey(endDate),
        },
        appointmentsByDay: Array.from({ length: 7 }, (_, index) => {
          const date = this.addDays(today, index);
          return {
            date: this.dateKey(date),
            total: totalsByDate.get(this.dateKey(date)) ?? 0,
          };
        }),
        appointmentStatuses: dashboard.appointmentStatuses.map((item) => ({
          status: item.trangThai,
          total: item._count._all,
        })),
        queueStatuses: dashboard.queueStatuses.map((item) => ({
          status: item.trangThai,
          total: item._count._all,
        })),
        queueBySpecialty: dashboard.queueBySpecialty.map((item) => ({
          specialtyId: item.chuyenKhoaId,
          specialtyName:
            specialtyNames.get(item.chuyenKhoaId) ?? 'Chưa xác định',
          total: item._count._all,
        })),
        upcomingAppointments: dashboard.upcomingAppointments.map((item) =>
          this.toDashboardAppointment(item),
        ),
      },
    };
  }

  // Tạo mới dữ liệu cho chức năng: tiếp đón
  async create(dto: CreateReceptionDto, currentUserId: number) {
    if (!dto.patientId) {
      if (
        !dto.fullName ||
        !dto.phoneNumber ||
        !dto.dateOfBirth ||
        !dto.gender
      ) {
        throw new BadRequestException(
          'Bệnh nhân mới cần đầy đủ họ tên, số điện thoại, ngày sinh và giới tính',
        );
      }
    }
    if (
      !(await this.receptionRepository.doctorMatchesSpecialty(
        dto.doctorId,
        dto.specialtyId,
      ))
    ) {
      throw new BadRequestException(
        'Bác sĩ không thuộc chuyên khoa đã chọn hoặc đã ngừng hoạt động',
      );
    }

    const now = new Date();
    const today = this.today();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const maxStartMinutes = 23 * 60 + 58;
    const currentMinutes = hours * 60 + minutes;
    const effectiveMinutes = Math.min(currentMinutes, maxStartMinutes);
    const startH = Math.floor(effectiveMinutes / 60);
    const startM = effectiveMinutes % 60;

    const startTime = new Date(Date.UTC(1970, 0, 1, startH, startM));
    let endTime = new Date(startTime.getTime() + 30 * 60_000);
    const maxEnd = new Date(Date.UTC(1970, 0, 1, 23, 59, 59));
    if (endTime > maxEnd) {
      endTime = maxEnd;
    }
    const reception = await this.receptionRepository.create({
      patientId: dto.patientId,
      ...(!dto.patientId
        ? {
            patient: {
              code: this.createCode(),
              fullName: dto.fullName!.trim(),
              phoneNumber: dto.phoneNumber!.replace(/[\s.-]/g, ''),
              dateOfBirth: new Date(`${dto.dateOfBirth!}T00:00:00.000Z`),
              gender: dto.gender!,
              email: dto.email?.trim().toLowerCase() || null,
              identityNumber: dto.identityNumber?.trim() || null,
              healthInsuranceNumber: dto.healthInsuranceNumber?.trim() || null,
              address: dto.address?.trim() || null,
            },
          }
        : {}),
      specialtyId: dto.specialtyId,
      doctorId: dto.doctorId,
      confirmerId: currentUserId,
      date: today,
      startTime,
      endTime,
      appointmentCode: this.createCode(),
      visitCode: this.createCode(),
      queuePrefix: `TT${dto.specialtyId}`,
      reason: dto.reason.trim(),
      symptoms: dto.symptoms?.trim() || null,
      priority: dto.priority ?? MucDoUuTienTiepDon.THONG_THUONG,
      note: dto.note?.trim() || null,
      allergies: (dto.allergies ?? [])
        .map((allergy) => ({
          agent: allergy.agent.trim(),
          reaction: allergy.reaction?.trim() || null,
          severity: allergy.severity ?? MucDoDiUng.CHUA_XAC_DINH,
        }))
        .filter((allergy) => allergy.agent.length > 0),
    });
    const response = this.toResponse(reception);

    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.BENH_NHAN,
      'Tiếp đón bệnh nhân trực tiếp',
      `Cấp phiếu ${response.ticket.queueNumber} cho ${response.patient.fullName}`,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('ADMIN'),
      REALTIME_EVENTS.APPOINTMENT_UPDATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('RECEPTIONIST'),
      REALTIME_EVENTS.APPOINTMENT_UPDATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.doctor(dto.doctorId),
      REALTIME_EVENTS.QUEUE_TICKET_CREATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.doctor(dto.doctorId),
      REALTIME_EVENTS.QUEUE_UPDATED,
      response,
    );
    if (reception.bacSi) {
      await this.thongBaoService.notifyUsers([reception.bacSi.nguoiDungId], {
        title: 'Bệnh nhân đã vào hàng đợi',
        content: `${response.patient.fullName} đã được tiếp đón, số thứ tự ${response.ticket.queueNumber}.`,
        type: 'HANG_DOI',
        link: '/bac-si/hang-doi',
      });
    }

    return {
      message: 'Tiếp đón và cấp phiếu thành công',
      data: response,
    };
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private dateKey(date: Date | null) {
    return date?.toISOString().slice(0, 10) ?? '';
  }

  private createCode() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
  }

  private toResponse(reception: ReceptionWithRelations) {
    const ticket = reception.luotKham?.phieuHangCho;
    if (!ticket || !reception.luotKham) {
      throw new Error('Lượt tiếp đón chưa có phiếu hàng đợi');
    }
    return {
      id: reception.id,
      code: reception.maLichHen,
      patient: {
        id: reception.benhNhan.id,
        code: reception.benhNhan.maBenhNhan,
        fullName: reception.benhNhan.hoTen,
        phoneNumber: reception.benhNhan.soDienThoai,
      },
      specialty: {
        id: reception.chuyenKhoa.id,
        name: reception.chuyenKhoa.tenChuyenKhoa,
      },
      doctor: reception.bacSi
        ? { id: reception.bacSi.id, fullName: reception.bacSi.hoTen }
        : null,
      reason: reception.lyDoKham,
      priority: reception.luotKham.mucDoUuTien,
      source: reception.nguonDatLich,
      isNewPatient: reception.benhNhan._count.luotKham <= 1,
      ticket: {
        id: ticket.id,
        queueNumber: ticket.maSoThuTu,
        ordinalNumber: ticket.soThuTu,
        status: ticket.trangThai,
        issuedAt: ticket.createdAt.toISOString(),
      },
      createdAt: reception.createdAt.toISOString(),
    };
  }

  private toDashboardAppointment(appointment: ReceptionWithRelations) {
    return {
      id: appointment.id,
      code: appointment.maLichHen,
      patient: {
        fullName: appointment.benhNhan.hoTen,
        phoneNumber: appointment.benhNhan.soDienThoai,
      },
      specialty: appointment.chuyenKhoa.tenChuyenKhoa,
      doctor: appointment.bacSi?.hoTen ?? null,
      time: this.timeKey(appointment.gioBatDau),
      date: this.dateKey(appointment.ngayHen),
      status: appointment.trangThai,
    };
  }

  private timeKey(date: Date) {
    return date.toISOString().slice(11, 16);
  }

  private priorityLabel(priority: MucDoUuTienTiepDon) {
    const labels: Record<MucDoUuTienTiepDon, string> = {
      THONG_THUONG: 'Thông thường',
      TRE_EM: 'Trẻ em',
      NGUOI_CAO_TUOI: 'Người cao tuổi',
      MANG_THAI: 'Phụ nữ mang thai',
      KHAN_CAP: 'Khẩn cấp',
    };
    return labels[priority];
  }

  private toFollowUpResponse(record: FollowUpWithRelations) {
    return {
      recordId: record.id,
      date: this.dateKey(record.ngayTaiKham),
      patient: {
        id: record.luotKham.benhNhan.id,
        code: record.luotKham.benhNhan.maBenhNhan,
        fullName: record.luotKham.benhNhan.hoTen,
        phoneNumber: record.luotKham.benhNhan.soDienThoai,
      },
      doctor: {
        id: record.luotKham.bacSi!.id,
        fullName: record.luotKham.bacSi!.hoTen,
      },
      specialty: {
        id: record.luotKham.chuyenKhoa.id,
        name: record.luotKham.chuyenKhoa.tenChuyenKhoa,
      },
      conclusion: record.ketLuan,
    };
  }
}
