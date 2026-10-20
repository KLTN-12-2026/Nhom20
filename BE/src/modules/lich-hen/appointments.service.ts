import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NguonDatLich,
  PhanHeNhatKyHeThong,
  Prisma,
  TrangThaiLichHen,
} from '@prisma/client';

import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
  type AppointmentWithRelations,
} from './repositories/appointment.repository.interface';

const REMOVABLE_STATUSES = new Set<TrangThaiLichHen>([
  TrangThaiLichHen.CHO_XAC_NHAN,
  TrangThaiLichHen.DA_TU_CHOI,
  TrangThaiLichHen.DA_HUY,
]);

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: AppointmentRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly realtimeService: RealtimeService,
    private readonly thongBaoService: ThongBaoService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: lịch hẹn
  async findAll(query: AppointmentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [result, stats] = await Promise.all([
      this.appointmentRepository.findAll({
        search: query.search?.trim(),
        specialtyId: query.specialtyId,
        doctorId: query.doctorId,
        date: query.date ? this.toDate(query.date) : undefined,
        status: query.status,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.appointmentRepository.getTodayStats(this.today()),
    ]);
    return {
      message: 'Lấy danh sách lịch hẹn thành công',
      data: {
        items: result.items.map((item) => this.toResponse(item)),
        stats,
      },
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: lịch hẹn
  async findDoctorAppointments(userId: number, query: AppointmentQueryDto) {
    const doctorId =
      await this.appointmentRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ bác sĩ',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [result, stats] = await Promise.all([
      this.appointmentRepository.findAll({
        search: query.search?.trim(),
        specialtyId: query.specialtyId,
        doctorId,
        date: query.date ? this.toDate(query.date) : undefined,
        status: query.status,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.appointmentRepository.getTodayStats(this.today(), doctorId),
    ]);

    return {
      message: 'Lấy lịch khám của bác sĩ thành công',
      data: {
        items: result.items.map((item) => this.toResponse(item)),
        stats,
      },
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: lịch hẹn
  async findOne(id: number) {
    const appointment = await this.getExisting(id);
    return {
      message: 'Lấy chi tiết lịch hẹn thành công',
      data: this.toResponse(appointment),
    };
  }

  createGuest(dto: CreateGuestAppointmentDto) {
    return this.create(dto, NguonDatLich.KHACH_VANG_LAI);
  }

  createByChat(dto: CreateGuestAppointmentDto) {
    return this.create({ ...dto, doctorId: undefined }, NguonDatLich.AI_HO_TRO);
  }

  // Bệnh nhân đã đăng nhập phải dùng đúng hồ sơ từ JWT, không cập nhật theo SĐT trong Chatbox.
  createByChatForPatient(patientId: number, dto: CreateGuestAppointmentDto) {
    return this.create(
      { ...dto, doctorId: undefined },
      NguonDatLich.AI_HO_TRO,
      patientId,
    );
  }

  async createByPatient(userId: number, dto: any) {
    let patient = await this.appointmentRepository.findPatientByUserId(userId);
    if (!patient) {
      patient =
        await this.appointmentRepository.findPatientForAppointment(userId);
    }
    if (!patient) {
      throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');
    }

    return this.create(
      { ...dto, fullName: '', phoneNumber: '', dateOfBirth: '', gender: 'NAM' },
      NguonDatLich.BENH_NHAN,
      patient.id,
    );
  }

  // Tạo mới dữ liệu cho chức năng: lịch hẹn
  async createByStaff(dto: CreateGuestAppointmentDto, currentUserId: number) {
    const result = await this.create(dto, NguonDatLich.NHAN_VIEN);
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.LICH_HEN,
      'Thêm lịch hẹn',
      `Tạo lịch hẹn ${result.data.code} cho ${result.data.patient.fullName}`,
    );
    return { ...result, message: 'Thêm lịch hẹn thành công' };
  }

  // Cập nhật dữ liệu cho chức năng: lịch hẹn
  async update(id: number, dto: UpdateAppointmentDto, currentUserId: number) {
    const current = await this.getExisting(id);
    const specialtyId = dto.specialtyId ?? current.chuyenKhoaId;
    const doctorId =
      dto.doctorId !== undefined ? dto.doctorId : current.bacSiId;
    await this.ensureAssignment(specialtyId, doctorId);

    if (
      (dto.status === TrangThaiLichHen.DA_TU_CHOI ||
        dto.status === TrangThaiLichHen.DA_HUY) &&
      !dto.rejectionOrCancellationReason?.trim()
    ) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối hoặc hủy');
    }

    const startTime = dto.appointmentTime
      ? this.toTime(dto.appointmentTime)
      : undefined;
    const appointment = await this.appointmentRepository.update(id, {
      ...(dto.specialtyId !== undefined ? { specialtyId } : {}),
      ...(dto.doctorId !== undefined ? { doctorId } : {}),
      ...(dto.appointmentDate
        ? { date: this.toDate(dto.appointmentDate) }
        : {}),
      ...(startTime
        ? { startTime, endTime: this.addMinutes(startTime, 30) }
        : {}),
      ...(dto.reason !== undefined ? { reason: dto.reason.trim() } : {}),
      ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      ...(dto.status !== undefined
        ? {
            status: dto.status,
            confirmerId:
              dto.status === TrangThaiLichHen.DA_XAC_NHAN
                ? currentUserId
                : current.nguoiXacNhanId,
            confirmedAt:
              dto.status === TrangThaiLichHen.DA_XAC_NHAN
                ? new Date()
                : current.thoiGianXacNhan,
          }
        : {}),
      ...(dto.rejectionOrCancellationReason !== undefined
        ? {
            rejectionOrCancellationReason:
              dto.rejectionOrCancellationReason.trim() || null,
          }
        : {}),
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.LICH_HEN,
      'Cập nhật lịch hẹn',
      `Cập nhật lịch hẹn ${appointment.maLichHen} - ${appointment.trangThai}`,
    );
    const response = this.toResponse(appointment);
    this.emitAppointmentToStaff(REALTIME_EVENTS.APPOINTMENT_UPDATED, response);
    if (appointment.bacSiId) {
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.doctor(appointment.bacSiId),
        REALTIME_EVENTS.APPOINTMENT_UPDATED,
        response,
      );
    }
    return { message: 'Cập nhật lịch hẹn thành công', data: response };
  }

  // Xóa dữ liệu cho chức năng: lịch hẹn
  async remove(id: number, currentUserId: number) {
    const appointment = await this.getExisting(id);
    if (!REMOVABLE_STATUSES.has(appointment.trangThai)) {
      throw new BadRequestException(
        'Chỉ có thể xóa lịch chờ xác nhận, đã từ chối hoặc đã hủy',
      );
    }
    try {
      await this.appointmentRepository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Không thể xóa lịch hẹn đã có dữ liệu khám liên quan',
        );
      }
      throw error;
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.LICH_HEN,
      'Xóa lịch hẹn',
      `Xóa lịch hẹn ${appointment.maLichHen}`,
    );
    return { message: 'Xóa lịch hẹn thành công', data: { id } };
  }

  // Xử lý logic nghiệp vụ cho chức năng: lịch hẹn
  async checkIn(id: number, currentUserId: number) {
    const current = await this.getExisting(id);
    if (current.trangThai === TrangThaiLichHen.DA_CHECK_IN) {
      return {
        message: 'Lịch hẹn đã được cấp phiếu trước đó',
        data: this.toResponse(current),
      };
    }
    if (current.trangThai !== TrangThaiLichHen.DA_XAC_NHAN) {
      throw new BadRequestException(
        'Chỉ có thể cấp phiếu cho lịch hẹn đã xác nhận',
      );
    }
    if (!current.bacSiId) {
      throw new BadRequestException(
        'Vui lòng phân công bác sĩ trước khi cấp phiếu tiếp đón',
      );
    }

    const appointmentAt = new Date(
      `${current.ngayHen.toISOString().slice(0, 10)}T${current.gioBatDau.toISOString().slice(11, 19)}`,
    );
    const appointment = await this.appointmentRepository.checkIn({
      appointmentId: current.id,
      patientId: current.benhNhanId,
      specialtyId: current.chuyenKhoaId,
      doctorId: current.bacSiId,
      visitCode: this.createCode(),
      queueCodePrefix: current.chuyenKhoa.maChuyenKhoa
        .split('_')
        .map((part) => part[0])
        .join('')
        .slice(0, 5),
      queueDate: this.today(),
      appointmentAt,
      reason: current.lyDoKham ?? 'Khám theo lịch hẹn',
      initialSymptoms: current.trieuChungBanDau,
      currentUserId,
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.LICH_HEN,
      'Cấp phiếu tiếp đón',
      `Cấp phiếu cho lịch hẹn ${appointment.maLichHen}`,
    );
    const response = this.toResponse(appointment);
    this.emitAppointmentToStaff(REALTIME_EVENTS.APPOINTMENT_UPDATED, response);
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.doctor(current.bacSiId),
      REALTIME_EVENTS.QUEUE_TICKET_CREATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.doctor(current.bacSiId),
      REALTIME_EVENTS.QUEUE_UPDATED,
      response,
    );
    if (appointment.bacSi) {
      await this.thongBaoService.notifyUsers([appointment.bacSi.nguoiDungId], {
        title: 'Bệnh nhân đã vào hàng đợi',
        content: `${response.patient.fullName} đã được cấp phiếu khám, số thứ tự ${response.ticket?.queueNumber ?? ''}.`,
        type: 'HANG_DOI',
        link: '/bac-si/hang-doi',
      });
    }
    return { message: 'Cấp phiếu tiếp đón thành công', data: response };
  }

  // Tạo mới dữ liệu cho chức năng: lịch hẹn
  private async create(
    dto: CreateGuestAppointmentDto,
    source: NguonDatLich,
    existingPatientId?: number,
  ) {
    const specialtyId = dto.specialtyId;
    const doctorId = dto.doctorId ?? null;
    await this.ensureAssignment(specialtyId, doctorId);
    const date = this.toDate(dto.appointmentDate);
    const startTime = this.toTime(dto.appointmentTime);
    this.ensureFuture(date, startTime);
    const existingPatient = existingPatientId
      ? await this.appointmentRepository.findPatientForAppointment(
          existingPatientId,
        )
      : null;
    if (existingPatientId && !existingPatient) {
      throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');
    }

    const phoneNumber = existingPatient
      ? existingPatient.phoneNumber
      : dto.phoneNumber.replace(/[\s.-]/g, '');
    if (
      await this.appointmentRepository.findDuplicate(
        phoneNumber,
        date,
        startTime,
      )
    ) {
      throw new ConflictException(
        'Số điện thoại này đã có lịch đang chờ hoặc đã xác nhận cùng thời gian',
      );
    }
    const appointmentData = {
      code: this.createCode(),
      specialtyId,
      doctorId,
      date,
      startTime,
      endTime: this.addMinutes(startTime, 30),
      source,
      reason: dto.reason.trim(),
      note: dto.note?.trim() || null,
    };
    const appointment = existingPatient
      ? await this.appointmentRepository.createForExistingPatient({
          patientId: existingPatient.id,
          appointment: appointmentData,
        })
      : await this.appointmentRepository.createGuest({
          patient: {
            code: this.createCode(),
            fullName: dto.fullName.trim(),
            phoneNumber,
            dateOfBirth: this.toDate(dto.dateOfBirth),
            gender: dto.gender,
            email: dto.email?.trim().toLowerCase() || null,
          },
          appointment: appointmentData,
        });
    const response = this.toResponse(appointment);
    this.emitAppointmentToStaff(REALTIME_EVENTS.APPOINTMENT_CREATED, response);
    await this.thongBaoService.notifyRoles(['RECEPTIONIST'], {
      title: 'Có lịch hẹn mới',
      content: `${response.patient.fullName} vừa gửi yêu cầu đặt lịch ${response.specialty.name}.`,
      type: 'LICH_HEN',
      link: '/thu-ngan/lich-hen',
    });
    return {
      message:
        'Gửi yêu cầu đặt lịch thành công. Phòng khám sẽ liên hệ xác nhận.',
      data: response,
    };
  }

  private emitAppointmentToStaff(event: string, payload: unknown) {
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('ADMIN'),
      event,
      payload,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('RECEPTIONIST'),
      event,
      payload,
    );
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: lịch hẹn
  private async ensureAssignment(specialtyId: number, doctorId: number | null) {
    if (!(await this.appointmentRepository.specialtyExists(specialtyId))) {
      throw new BadRequestException('Chuyên khoa không tồn tại hoặc đã ngừng');
    }
    if (
      doctorId &&
      !(await this.appointmentRepository.doctorMatchesSpecialty(
        doctorId,
        specialtyId,
      ))
    ) {
      throw new BadRequestException(
        'Bác sĩ không thuộc chuyên khoa đã chọn hoặc đã ngừng hoạt động',
      );
    }
  }

  // Lấy danh sách dữ liệu cho chức năng: lịch hẹn
  private async getExisting(id: number) {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');
    return appointment;
  }

  private ensureFuture(date: Date, time: Date) {
    const value = new Date(
      `${date.toISOString().slice(0, 10)}T${time.toISOString().slice(11, 19)}`,
    );
    if (value.getTime() <= Date.now()) {
      throw new BadRequestException('Thời gian hẹn phải ở tương lai');
    }
  }

  private toDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toTime(value: string) {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  private addMinutes(value: Date, minutes: number) {
    const result = new Date(value.getTime() + minutes * 60_000);
    const max = new Date('1970-01-01T23:59:59.000Z');
    return result > max ? max : result;
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  private createCode() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
  }

  private toResponse(appointment: AppointmentWithRelations) {
    return {
      id: appointment.id,
      code: appointment.maLichHen,
      patient: {
        id: appointment.benhNhan.id,
        code: appointment.benhNhan.maBenhNhan,
        fullName: appointment.benhNhan.hoTen,
        phoneNumber: appointment.benhNhan.soDienThoai,
        email: appointment.benhNhan.email,
        dateOfBirth: appointment.benhNhan.ngaySinh?.toISOString().slice(0, 10),
        gender: appointment.benhNhan.gioiTinh,
      },
      specialty: {
        id: appointment.chuyenKhoa.id,
        code: appointment.chuyenKhoa.maChuyenKhoa,
        name: appointment.chuyenKhoa.tenChuyenKhoa,
      },
      doctor: appointment.bacSi
        ? {
            id: appointment.bacSi.id,
            fullName: appointment.bacSi.hoTen,
            avatarUrl: appointment.bacSi.nguoiDung.anhDaiDienUrl,
          }
        : null,
      appointmentDate: appointment.ngayHen.toISOString().slice(0, 10),
      startTime: appointment.gioBatDau.toISOString().slice(11, 16),
      endTime: appointment.gioKetThuc.toISOString().slice(11, 16),
      source: appointment.nguonDatLich,
      reason: appointment.lyDoKham,
      note: appointment.ghiChu,
      status: appointment.trangThai,
      rejectionOrCancellationReason: appointment.lyDoTuChoiHoacHuy,
      ticket: appointment.luotKham?.phieuHangCho
        ? {
            queueNumber: appointment.luotKham.phieuHangCho.maSoThuTu,
            issuedAt: appointment.luotKham.phieuHangCho.createdAt,
          }
        : null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
