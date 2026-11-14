import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { SePayWebhookDto } from './dto/sepay-webhook.dto';
import {
  TrangThaiHoaDon,
  PhuongThucThanhToan,
  TrangThaiThanhToan,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ThanhToanService {
  private readonly logger = new Logger(ThanhToanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // Xử lý logic nghiệp vụ cho chức năng: thanh toán
  async handleSePayWebhook(dto: SePayWebhookDto) {
    this.logger.log('Đang xử lý webhook thanh toán');

    // 1. Kiểm tra đây có phải giao dịch tiền vào hay không.
    if (dto.transferType !== 'in') {
      return {
        success: true,
        message: 'Bỏ qua giao dịch không phải là nhận tiền',
      };
    }

    if (!Number.isFinite(dto.transferAmount) || dto.transferAmount <= 0) {
      throw new BadRequestException('Số tiền giao dịch phải lớn hơn 0');
    }
    const receivedAmount = new Prisma.Decimal(String(dto.transferAmount));
    if (receivedAmount.decimalPlaces() > 2) {
      throw new BadRequestException('Số tiền giao dịch không hợp lệ');
    }

    // 2. Trích xuất mã hóa đơn (maHoaDon) từ nội dung giao dịch.
    //    Ngân hàng thường loại bỏ dấu gạch ngang khi chuyển tiền, nên nội dung
    //    webhook có thể là "HD178748002935192" thay vì "HD-1787480023456-190".
    const match = dto.content.match(/HD[-\d]+/i);
    const rawCode = match ? match[0].toUpperCase() : null;

    if (!rawCode) {
      this.logger.warn('Webhook không có mã hóa đơn hợp lệ');
      return {
        success: true,
        message: 'Không tìm thấy mã hóa đơn trong nội dung chuyển khoản',
      };
    }

    // 3. Tìm hóa đơn trong cơ sở dữ liệu.
    //    Thử khớp chính xác trước, nếu không tìm thấy thì so sánh sau khi
    //    loại bỏ dấu gạch ngang ở cả hai phía (ngân hàng thường xóa ký tự đặc biệt).
    const normalize = (code: string) => code.replace(/-/g, '');
    let hoaDon = await this.prisma.hoaDon.findUnique({
      where: { maHoaDon: rawCode },
    });

    if (!hoaDon) {
      const normalizedRaw = normalize(rawCode);
      const candidates = await this.prisma.hoaDon.findMany({
        where: {
          maHoaDon: { startsWith: 'HD' },
          trangThai: { not: TrangThaiHoaDon.DA_THANH_TOAN },
        },
      });
      hoaDon =
        candidates.find((c) => normalize(c.maHoaDon) === normalizedRaw) ?? null;
    }

    if (!hoaDon) {
      this.logger.warn('Webhook không khớp hóa đơn');
      return { success: true, message: 'Không tìm thấy hóa đơn' };
    }

    if (hoaDon.trangThai === TrangThaiHoaDon.DA_THANH_TOAN) {
      return { success: true, message: 'Hóa đơn đã được thanh toán trước đó' };
    }

    const transactionCode = String(dto.id || dto.referenceCode);
    // Đối chiếu các khoản đã thu và ghi khoản mới cùng transaction.
    const result = await this.prisma.$transaction(async (tx) => {
      const currentInvoice = await tx.hoaDon.findUnique({
        where: { id: hoaDon.id },
      });
      if (!currentInvoice)
        throw new BadRequestException('Không tìm thấy hóa đơn');
      if (currentInvoice.trangThai === TrangThaiHoaDon.DA_HUY) {
        throw new ConflictException(
          'Hóa đơn đã hủy, giao dịch cần được đối soát',
        );
      }
      if (currentInvoice.trangThai === TrangThaiHoaDon.DA_THANH_TOAN) {
        throw new ConflictException(
          'Hóa đơn đã thanh toán, giao dịch cần được đối soát',
        );
      }
      // Chặn retry tuần tự; chống trùng đồng thời cần khóa duy nhất ở database.
      const duplicate = await tx.thanhToan.findFirst({
        where: {
          maGiaoDich: transactionCode,
          phuongThuc: PhuongThucThanhToan.CHUYEN_KHOAN,
          trangThai: TrangThaiThanhToan.THANH_CONG,
        },
        select: { hoaDonId: true },
      });
      if (duplicate) {
        if (duplicate.hoaDonId !== currentInvoice.id) {
          throw new ConflictException('Giao dịch đã gắn với hóa đơn khác');
        }
        return { duplicate: true as const };
      }
      const previous = await tx.thanhToan.aggregate({
        where: {
          hoaDonId: currentInvoice.id,
          trangThai: TrangThaiThanhToan.THANH_CONG,
        },
        _sum: { soTien: true },
      });
      const totalPaid = new Prisma.Decimal(previous._sum.soTien ?? 0).add(
        receivedAmount,
      );
      const invoiceTotal = new Prisma.Decimal(currentInvoice.tongTien);
      const fullyPaid = totalPaid.gte(invoiceTotal);
      const excess = Prisma.Decimal.max(totalPaid.sub(invoiceTotal), 0);
      const remaining = Prisma.Decimal.max(invoiceTotal.sub(totalPaid), 0);
      // Tạo bản ghi thanh toán.
      await tx.thanhToan.create({
        data: {
          hoaDonId: hoaDon.id,
          soTien: receivedAmount,
          phuongThuc: PhuongThucThanhToan.CHUYEN_KHOAN,
          maGiaoDich: transactionCode,
          trangThai: TrangThaiThanhToan.THANH_CONG,
          thoiGianThanhToan: new Date(dto.transactionDate),
          ghiChu: dto.content,
        },
      });

      // Cập nhật trạng thái hóa đơn.
      await tx.hoaDon.update({
        where: { id: hoaDon.id },
        data: {
          trangThai: fullyPaid
            ? TrangThaiHoaDon.DA_THANH_TOAN
            : TrangThaiHoaDon.CHUA_THANH_TOAN,
          thoiGianThanhToan: fullyPaid ? new Date(dto.transactionDate) : null,
        },
      });
      return {
        duplicate: false as const,
        fullyPaid,
        excessAmount: excess.toString(),
        remainingAmount: remaining.toString(),
      };
    });

    if (result.duplicate) {
      return { success: true, message: 'Giao dịch đã được ghi nhận' };
    }

    // 5. Gửi thông báo WebSocket đến toàn bộ thu ngân.
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('RECEPTIONIST'),
      result.fullyPaid
        ? REALTIME_EVENTS.PAYMENT_SUCCESS
        : REALTIME_EVENTS.PAYMENT_PARTIAL,
      {
        maHoaDon: hoaDon.maHoaDon,
        soTien: dto.transferAmount,
        maGiaoDich: dto.referenceCode,
        excessAmount: result.excessAmount,
        remainingAmount: result.remainingAmount,
      },
    );

    this.logger.log(
      result.fullyPaid
        ? 'Hóa đơn đã được thanh toán đủ'
        : 'Đã ghi nhận thanh toán một phần',
    );
    return { success: true, ...result };
  }

  // Lấy danh sách dữ liệu cho chức năng: thanh toán
  async getInvoices() {
    // Chức năng: Thanh toán — lấy hóa đơn và lịch sử giao dịch
    const invoices = await this.prisma.hoaDon.findMany({
      include: {
        benhNhan: true,
        thanhToan: true,
        // Chi tiết hóa đơn là snapshot tại thời điểm lập hóa đơn,
        // không đọc lại đơn thuốc vì đơn có thể được chỉnh sửa về sau.
        chiTiet: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            loaiMuc: true,
            tenMuc: true,
            soLuong: true,
            donGia: true,
            thanhTien: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách hóa đơn thành công',
      data: invoices,
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: thanh toán
  async collectCash(id: number, soTien: number, currentUserId: number) {
    // Chức năng: Thanh toán — thu tiền mặt tại quầy
    return this.collectPayment(
      id,
      soTien,
      PhuongThucThanhToan.TIEN_MAT,
      currentUserId,
    );
  }

  async collectTransfer(
    id: number,
    soTien: number,
    currentUserId: number,
    reference?: string,
  ) {
    // Chức năng: Thanh toán — ghi nhận chuyển khoản thủ công
    return this.collectPayment(
      id,
      soTien,
      PhuongThucThanhToan.CHUYEN_KHOAN,
      currentUserId,
      reference,
    );
  }

  private async collectPayment(
    id: number,
    soTien: number,
    method: PhuongThucThanhToan,
    currentUserId: number,
    reference?: string,
  ) {
    // Chức năng nội bộ: cập nhật giao dịch và trạng thái hóa đơn trong một giao dịch CSDL.
    const hoaDon = await this.prisma.hoaDon.findUnique({
      where: { id },
      include: { thanhToan: true },
    });

    if (!hoaDon) throw new Error('Không tìm thấy hóa đơn');

    const paid = hoaDon.thanhToan
      .filter((p) => p.trangThai === TrangThaiThanhToan.THANH_CONG)
      .reduce((acc, curr) => acc + Number(curr.soTien), 0);
    const remaining = Number(hoaDon.tongTien) - paid;

    if (remaining <= 0) throw new Error('Hóa đơn đã được thanh toán đủ');

    const amountToPay = Math.min(soTien, remaining);

    return this.prisma.$transaction(async (tx) => {
      await tx.thanhToan.create({
        data: {
          hoaDonId: id,
          soTien: amountToPay,
          phuongThuc: method,
          trangThai: TrangThaiThanhToan.THANH_CONG,
          nguoiThuTienId: currentUserId,
          thoiGianThanhToan: new Date(),
          ghiChu: reference
            ? `Giao dịch: ${reference}`
            : 'Thu tiền mặt tại quầy',
        },
      });

      const isFullyPaid = paid + amountToPay >= Number(hoaDon.tongTien);

      const updated = await tx.hoaDon.update({
        where: { id },
        data: {
          trangThai: isFullyPaid
            ? TrangThaiHoaDon.DA_THANH_TOAN
            : TrangThaiHoaDon.BAN_NHAP,
          thoiGianThanhToan: isFullyPaid ? new Date() : null,
        },
      });

      return {
        message: 'Thu tiền thành công',
        data: updated,
      };
    });
  }
}
