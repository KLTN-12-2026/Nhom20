import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TrangThaiHangCho } from '@prisma/client';

import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import {
  QUEUE_REPOSITORY,
  type QueueRepository,
  type QueueTicketWithRelations,
} from './repositories/queue.repository.interface';

@Injectable()
export class QueuesService {
  constructor(
    @Inject(QUEUE_REPOSITORY)
    private readonly queueRepository: QueueRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  // Lấy thông tin chi tiết cho chức năng: hàng chờ
  async findDoctorQueue(userId: number) {
    const doctorId = await this.requireDoctorId(userId);
    const items = await this.queueRepository.findDoctorQueue(
      doctorId,
      this.today(),
    );
    return {
      message: 'Lấy hàng đợi của bác sĩ thành công',
      data: { items: items.map((item) => this.toResponse(item)) },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: hàng chờ
  async findPublicQueue() {
    const items = await this.queueRepository.findPublicCalled(this.today());
    return {
      message: 'Lấy bảng gọi số thành công',
      data: { items: items.map((item) => this.toResponse(item)) },
    };
  }

  call(id: number, userId: number) {
    return this.changeStatus(id, userId, TrangThaiHangCho.DANG_GOI);
  }

  skip(id: number, userId: number) {
    return this.changeStatus(id, userId, TrangThaiHangCho.BO_QUA);
  }

  enterRoom(id: number, userId: number) {
    return this.changeStatus(id, userId, TrangThaiHangCho.DA_VAO_PHONG);
  }

  // Xử lý logic nghiệp vụ cho chức năng: hàng chờ
  private async changeStatus(
    id: number,
    userId: number,
    status: TrangThaiHangCho,
  ) {
    const doctorId = await this.requireDoctorId(userId);
    const current = await this.queueRepository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy phiếu hàng đợi');
    if (current.luotKham.bacSiId !== doctorId) {
      throw new BadRequestException(
        'Phiếu này không được phân công cho bác sĩ hiện tại',
      );
    }

    const allowed: Set<TrangThaiHangCho> = new Set(
      status === TrangThaiHangCho.DANG_GOI
        ? [
            TrangThaiHangCho.CHO_GOI,
            TrangThaiHangCho.BO_QUA,
            TrangThaiHangCho.DANG_GOI,
          ]
        : status === TrangThaiHangCho.BO_QUA
          ? [TrangThaiHangCho.CHO_GOI, TrangThaiHangCho.DANG_GOI]
          : [TrangThaiHangCho.DANG_GOI],
    );
    if (!allowed.has(current.trangThai)) {
      throw new BadRequestException(
        'Trạng thái phiếu không phù hợp với thao tác',
      );
    }

    const ticket = await this.queueRepository.updateStatus(id, status, userId);
    const response = this.toResponse(ticket);
    const event =
      status === TrangThaiHangCho.DANG_GOI
        ? REALTIME_EVENTS.QUEUE_PATIENT_CALLED
        : REALTIME_EVENTS.QUEUE_UPDATED;

    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.doctor(doctorId),
      REALTIME_EVENTS.QUEUE_UPDATED,
      response,
    );
    // Cập nhật hàng đợi tại quầy ngay khi bác sĩ gọi hoặc nhận bệnh nhân vào phòng.
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('RECEPTIONIST'),
      REALTIME_EVENTS.QUEUE_UPDATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('ADMIN'),
      REALTIME_EVENTS.QUEUE_UPDATED,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.specialty(ticket.chuyenKhoaId),
      event,
      response,
    );
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.publicWaitingBoard,
      event,
      response,
    );

    return {
      message:
        status === TrangThaiHangCho.DANG_GOI
          ? 'Đã gọi bệnh nhân'
          : status === TrangThaiHangCho.BO_QUA
            ? 'Đã tạm bỏ qua bệnh nhân'
            : 'Đã xác nhận bệnh nhân vào phòng',
      data: response,
    };
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: hàng chờ
  private async requireDoctorId(userId: number) {
    const doctorId = await this.queueRepository.findDoctorIdByUserId(userId);
    if (!doctorId) {
      throw new NotFoundException(
        'Tài khoản chưa được liên kết với hồ sơ bác sĩ',
      );
    }
    return doctorId;
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  private toResponse(ticket: QueueTicketWithRelations) {
    return {
      id: ticket.id,
      queueNumber: ticket.maSoThuTu,
      ordinalNumber: ticket.soThuTu,
      status: ticket.trangThai,
      calledAt: ticket.thoiGianGoi?.toISOString() ?? null,
      patient: {
        id: ticket.luotKham.benhNhan.id,
        code: ticket.luotKham.benhNhan.maBenhNhan,
        fullName: ticket.luotKham.benhNhan.hoTen,
        phoneNumber: ticket.luotKham.benhNhan.soDienThoai,
      },
      doctor: ticket.luotKham.bacSi
        ? {
            id: ticket.luotKham.bacSi.id,
            fullName: ticket.luotKham.bacSi.hoTen,
          }
        : null,
      specialty: {
        id: ticket.chuyenKhoa.id,
        name: ticket.chuyenKhoa.tenChuyenKhoa,
      },
      visit: {
        id: ticket.luotKham.id,
        reason: ticket.luotKham.lyDoKham,
        appointmentId: ticket.luotKham.lichHenId,
      },
    };
  }
}
