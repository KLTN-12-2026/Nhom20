import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';
import { SaveServiceResultDto } from './dto/save-service-result.dto';
import { CancelServiceOrderDto } from './dto/cancel-service-order.dto';
import {
  SERVICE_ORDER_REPOSITORY,
  type OrderVisit,
  type ServiceOrder,
  type ServiceOrderRepository,
} from './repositories/service-order.repository.interface';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly repository: ServiceOrderRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async catalog(query: ServiceOrderQueryDto) {
    const { items, total } = await this.repository.catalog(
      query.search?.trim(),
      (query.page - 1) * query.limit,
      query.limit,
    );
    return {
      message: 'Lấy danh mục cận lâm sàng thành công',
      data: items.map((item) => ({
        id: item.id,
        code: item.maDichVu,
        name: item.tenDichVu,
        price: item.donGia.toString(),
      })),
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  async list(userId: number, visitId: number) {
    const items = await this.repository.withVisit(visitId, async (tx) => {
      this.assertOwner(tx.visit, userId);
      return tx.list();
    });
    return {
      message: 'Lấy chỉ định dịch vụ thành công',
      data: items.map((item) => this.toResponse(item)),
    };
  }

  async create(userId: number, visitId: number, dto: CreateServiceOrderDto) {
    const reason = dto.reason.trim();
    const note = dto.note?.trim() || null;
    const key = dto.idempotencyKey.trim().toLowerCase();
    try {
      const outcome = await this.repository.withVisit(visitId, async (tx) => {
        // Luôn kiểm tra bác sĩ được phân công trước khi trả dữ liệu, kể cả request lặp.
        const doctorId = this.assertOwner(tx.visit, userId);
        const existing = await tx.findByKey(key);
        if (existing) {
          if (
            existing.luotKhamId !== visitId ||
            existing.bacSiChiDinhId !== doctorId ||
            existing.dichVuId !== dto.serviceId ||
            existing.lyDoChiDinh !== reason ||
            existing.ghiChu !== note
          ) {
            throw new ConflictException(
              'Khóa yêu cầu đã được dùng cho nội dung khác',
            );
          }
          return { order: existing, changed: false, doctorId };
        }
        this.assertEditable(tx.visit!);
        const service = await tx.findService(dto.serviceId);
        if (
          !service ||
          service.trangThai !== 'DANG_HOAT_DONG' ||
          service.loaiDichVu !== 'CAN_LAM_SANG'
        ) {
          throw new BadRequestException(
            'Chỉ được chọn dịch vụ cận lâm sàng đang hoạt động',
          );
        }
        if (service.donGia.isNegative())
          throw new BadRequestException('Đơn giá dịch vụ không hợp lệ');
        const order = await tx.create({
          luotKhamId: visitId,
          dichVuId: service.id,
          bacSiChiDinhId: doctorId,
          lyDoChiDinh: reason,
          ghiChu: note,
          idempotencyKey: key,
          donGiaSnapshot: service.donGia,
        });
        await tx.audit(userId, 'Tạo chỉ định dịch vụ', order);
        return { order, changed: true, doctorId };
      });
      this.notify(outcome);
      return {
        message: outcome.changed
          ? 'Tạo chỉ định dịch vụ thành công'
          : 'Yêu cầu đã được xử lý trước đó',
        data: this.toResponse(outcome.order),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Khóa yêu cầu đã được dùng cho nội dung khác',
        );
      }
      throw error;
    }
  }

  saveResult(userId: number, id: number, dto: SaveServiceResultDto) {
    return this.transition(userId, id, 'result', dto.result.trim());
  }

  cancel(userId: number, id: number, dto: CancelServiceOrderDto) {
    return this.transition(userId, id, 'cancel', dto.reason.trim());
  }

  private async transition(
    userId: number,
    id: number,
    operation: 'result' | 'cancel',
    text: string,
  ) {
    const initial = await this.repository.findById(id);
    if (!initial) throw new NotFoundException('Không tìm thấy chỉ định');
    const outcome = await this.repository.withVisit(
      initial.luotKhamId,
      async (tx) => {
        const doctorId = this.assertOwner(tx.visit, userId);
        this.assertEditable(tx.visit!);
        const current = await tx.findById(id);
        if (!current || current.luotKhamId !== initial.luotKhamId)
          throw new NotFoundException('Không tìm thấy chỉ định');
        const status = operation === 'result' ? 'DA_HOAN_TAT' : 'DA_HUY';
        if (
          current.trangThai === status &&
          (operation === 'result' ? current.ketQua : current.lyDoHuy) === text
        ) {
          return { order: current, changed: false, doctorId };
        }
        if (current.trangThai !== 'CHO_THUC_HIEN')
          throw new ConflictException(
            'Chỉ được xử lý chỉ định đang chờ thực hiện',
          );
        const order = await tx.updatePending(
          id,
          operation === 'result'
            ? {
                trangThai: status,
                ketQua: text,
                nguoiNhapKetQuaId: userId,
                thoiGianCoKetQua: new Date(),
              }
            : {
                trangThai: status,
                lyDoHuy: text,
                nguoiHuyId: userId,
                thoiGianHuy: new Date(),
              },
        );
        await tx.audit(
          userId,
          operation === 'result'
            ? 'Nhập kết quả dịch vụ mô phỏng'
            : 'Hủy chỉ định dịch vụ',
          order,
        );
        return { order, changed: true, doctorId };
      },
    );
    this.notify(outcome);
    return {
      message:
        operation === 'result'
          ? 'Lưu kết quả mô phỏng thành công'
          : 'Hủy chỉ định thành công',
      data: this.toResponse(outcome.order),
    };
  }

  private assertOwner(visit: OrderVisit | null, userId: number): number {
    if (!visit) throw new NotFoundException('Không tìm thấy lượt khám');
    if (!visit.bacSiId || visit.bacSi?.nguoiDungId !== userId)
      throw new ForbiddenException(
        'Chỉ bác sĩ được phân công lượt khám mới được thực hiện',
      );
    return visit.bacSiId;
  }

  private assertEditable(visit: OrderVisit) {
    if (!['DA_VAO_PHONG', 'CHO_KET_QUA'].includes(visit.trangThai))
      throw new ConflictException(
        'Chỉ được xử lý chỉ định trong lượt đang khám hoặc chờ kết quả',
      );
    if (
      visit.hoaDon &&
      ['DA_THANH_TOAN', 'DA_HUY'].includes(visit.hoaDon.trangThai)
    ) {
      throw new ConflictException(
        'Hóa đơn đã quyết toán hoặc bị hủy; không thể thay đổi chỉ định',
      );
    }
  }

  private notify(outcome: {
    changed: boolean;
    doctorId: number;
    order: ServiceOrder;
  }) {
    if (!outcome.changed) return;
    // Chỉ phát sau commit tới phòng riêng bác sĩ, không gửi kết quả y tế lên bảng công khai.
    try {
      this.realtime.emitToRoom(
        REALTIME_ROOMS.doctor(outcome.doctorId),
        REALTIME_EVENTS.SERVICE_ORDER_UPDATED,
        {
          id: outcome.order.id,
          visitId: outcome.order.luotKhamId,
          status: outcome.order.trangThai,
        },
      );
    } catch {
      // DB đã commit: không báo thao tác thất bại chỉ vì socket tạm lỗi; tải lại sẽ lấy dữ liệu thật.
      this.logger.warn(
        'Không phát được sự kiện cập nhật chỉ định; dữ liệu đã lưu',
      );
    }
  }

  private toResponse(item: ServiceOrder) {
    return {
      id: item.id,
      visitId: item.luotKhamId,
      doctorId: item.bacSiChiDinhId,
      service: {
        id: item.dichVu.id,
        code: item.dichVu.maDichVu,
        name: item.dichVu.tenDichVu,
      },
      reason: item.lyDoChiDinh,
      note: item.ghiChu,
      status: item.trangThai,
      priceSnapshot: item.donGiaSnapshot.toString(),
      idempotencyKey: item.idempotencyKey,
      result: item.ketQua,
      resultEnteredBy: item.nguoiNhapKetQuaId,
      resultedAt: item.thoiGianCoKetQua,
      cancellationReason: item.lyDoHuy,
      canceledBy: item.nguoiHuyId,
      canceledAt: item.thoiGianHuy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      resultNotice:
        'Kết quả nhập thủ công phục vụ mô phỏng quy trình cận lâm sàng. Chưa tích hợp thiết bị chẩn đoán.',
    };
  }
}
