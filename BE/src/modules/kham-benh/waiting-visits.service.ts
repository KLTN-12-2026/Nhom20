import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { WaitingVisitsRepository } from './repositories/waiting-visits.repository';
import { WaitingVisitQueryDto } from './dto/waiting-visit-query.dto';

@Injectable()
export class WaitingVisitsService {
  private readonly logger = new Logger(WaitingVisitsService.name);
  constructor(
    private readonly repository: WaitingVisitsRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async list(userId: number, query: WaitingVisitQueryDto) {
    const { items, total } = await this.repository.list(
      userId,
      query.page,
      query.limit,
    );
    return {
      message: 'Lấy danh sách chờ kết quả thành công',
      data: items.map((v) => ({
        id: v.id,
        code: v.maLuotKham,
        patientName: v.benhNhan.hoTen,
        patientCode: v.benhNhan.maBenhNhan,
        pendingOrders: v._count.chiDinhDichVu,
      })),
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  async transition(
    userId: number,
    visitId: number,
    target: 'CHO_KET_QUA' | 'DA_VAO_PHONG',
  ) {
    const outcome = await this.repository.withVisit(
      visitId,
      async ({ visit, setStatus }) => {
        if (!visit) throw new NotFoundException('Không tìm thấy lượt khám');
        if (visit.bacSi?.nguoiDungId !== userId)
          throw new ForbiddenException(
            'Lượt khám không được phân cho bác sĩ hiện tại',
          );
        if (
          visit.hoSoKham?.trangThai === 'DA_HOAN_TAT' ||
          ['DA_THANH_TOAN', 'DA_HUY'].includes(visit.hoaDon?.trangThai ?? '')
        ) {
          throw new ConflictException(
            'Hồ sơ hoặc hóa đơn đã đóng; không thể chuyển trạng thái',
          );
        }
        // Lặp cùng thao tác không tạo lượt mới, không sửa ICD/thuốc/chỉ định.
        if (visit.trangThai !== target) {
          const expected =
            target === 'CHO_KET_QUA' ? 'DA_VAO_PHONG' : 'CHO_KET_QUA';
          if (visit.trangThai !== expected)
            throw new ConflictException('Trạng thái lượt khám không phù hợp');
          if (
            target === 'CHO_KET_QUA' &&
            (!visit.hoSoKham || visit._count.chiDinhDichVu === 0)
          ) {
            throw new ConflictException(
              'Cần lưu nháp và có chỉ định chưa xử lý trước khi chờ kết quả',
            );
          }
          await setStatus(target);
        }
        return { id: visit.id, status: target, doctorId: visit.bacSiId! };
      },
    );
    try {
      // Chỉ gửi ID/trạng thái tới phòng bác sĩ; không phát thông tin y tế ra bảng công khai.
      this.realtime.emitToRoom(
        REALTIME_ROOMS.doctor(outcome.doctorId),
        REALTIME_EVENTS.QUEUE_UPDATED,
        { visitId, status: target },
      );
    } catch {
      this.logger.warn('Đã lưu trạng thái; không phát được sự kiện hàng đợi');
    }
    return {
      message:
        target === 'CHO_KET_QUA'
          ? 'Đã lưu lượt chờ kết quả'
          : 'Đã tiếp tục lượt khám',
      data: { id: outcome.id, status: target },
    };
  }
}
