import { Injectable, Logger } from '@nestjs/common';
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
    this.logger.log(`Received SePay Webhook: ${JSON.stringify(dto)}`);

    // 1. Kiểm tra đây có phải giao dịch tiền vào hay không.
    if (dto.transferType !== 'in') {
      return {
        success: true,
        message: 'Bỏ qua giao dịch không phải là nhận tiền',
      };
    }

    // 2. Trích xuất mã hóa đơn (maHoaDon) từ nội dung giao dịch.
    //    Ngân hàng thường loại bỏ dấu gạch ngang khi chuyển tiền, nên nội dung
    //    webhook có thể là "HD178748002935192" thay vì "HD-1787480023456-190".
    const match = dto.content.match(/HD[-\d]+/i);
    const rawCode = match ? match[0].toUpperCase() : null;

    if (!rawCode) {
      this.logger.warn(
        `Không tìm thấy mã hóa đơn trong nội dung: ${dto.content}`,
      );
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
        candidates.find((c) => normalize(c.maHoaDon) === normalizedRaw) ??
        null;
    }

    if (!hoaDon) {
      this.logger.warn(`Không tìm thấy hóa đơn với mã: ${rawCode}`);
      return { success: true, message: 'Không tìm thấy hóa đơn' };
    }

    if (hoaDon.trangThai === TrangThaiHoaDon.DA_THANH_TOAN) {
      return { success: true, message: 'Hóa đơn đã được thanh toán trước đó' };
    }

    // 4. Cập nhật cơ sở dữ liệu.
    await this.prisma.$transaction(async (tx) => {
      // Tạo bản ghi thanh toán.
      await tx.thanhToan.create({
        data: {
          hoaDonId: hoaDon.id,
          soTien: dto.transferAmount,
          phuongThuc: PhuongThucThanhToan.CHUYEN_KHOAN,
          maGiaoDich: String(dto.id || dto.referenceCode),
          trangThai: TrangThaiThanhToan.THANH_CONG,
          thoiGianThanhToan: new Date(dto.transactionDate),
          ghiChu: dto.content,
        },
      });

      // Cập nhật trạng thái hóa đơn.
      await tx.hoaDon.update({
        where: { id: hoaDon.id },
        data: {
          trangThai: TrangThaiHoaDon.DA_THANH_TOAN,
          thoiGianThanhToan: new Date(dto.transactionDate),
        },
      });
    });

    // 5. Gửi thông báo WebSocket đến toàn bộ thu ngân.
    this.realtimeService.emitToRoom(
      REALTIME_ROOMS.role('RECEPTIONIST'),
      REALTIME_EVENTS.PAYMENT_SUCCESS,
      {
        maHoaDon: hoaDon.maHoaDon,
        soTien: dto.transferAmount,
        maGiaoDich: dto.referenceCode,
      },
    );

    this.logger.log(`Đã xử lý thanh toán thành công cho hóa đơn: ${hoaDon.maHoaDon}`);
    return { success: true };
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
