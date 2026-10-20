import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class AdminReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAppointments(from: Date, toExclusive: Date) {
    return this.prisma.lichHen.findMany({
      where: { ngayHen: { gte: from, lt: toExclusive } },
      select: {
        id: true,
        benhNhanId: true,
        ngayHen: true,
        trangThai: true,
        chuyenKhoa: { select: { tenChuyenKhoa: true } },
      },
    });
  }

  findVisits(from: Date, toExclusive: Date) {
    return this.prisma.luotKham.findMany({
      where: { thoiGianDangKy: { gte: from, lt: toExclusive } },
      select: {
        id: true,
        trangThai: true,
        chuyenKhoa: { select: { tenChuyenKhoa: true } },
      },
    });
  }

  findSuccessfulPayments(from: Date, toExclusive: Date) {
    return this.prisma.thanhToan.findMany({
      where: {
        trangThai: 'THANH_CONG',
        thoiGianThanhToan: { gte: from, lt: toExclusive },
      },
      select: { soTien: true, phuongThuc: true, thoiGianThanhToan: true },
    });
  }

  findReviews(from: Date, toExclusive: Date) {
    return this.prisma.danhGiaBacSi.findMany({
      where: { createdAt: { gte: from, lt: toExclusive } },
      select: { soSao: true, trangThai: true },
    });
  }
}
