import { Injectable, NotFoundException } from '@nestjs/common';
import { TrangThaiDanhGia } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DoctorReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, status?: TrangThaiDanhGia) {
    const keyword = search?.trim();
    const reviews = await this.prisma.danhGiaBacSi.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(keyword
          ? {
              OR: [
                {
                  benhNhan: {
                    hoTen: { contains: keyword, mode: 'insensitive' },
                  },
                },
                {
                  bacSi: { hoTen: { contains: keyword, mode: 'insensitive' } },
                },
                { noiDung: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        benhNhan: true,
        bacSi: { include: { chuyenKhoa: true } },
        luotKham: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      message: 'Lấy danh sách đánh giá bác sĩ thành công',
      data: reviews.map((review) => this.toResponse(review)),
      meta: { total: reviews.length },
    };
  }

  async updateStatus(id: number, status: 'DA_HIEN_THI' | 'DA_AN') {
    const existing = await this.prisma.danhGiaBacSi.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Không tìm thấy đánh giá bác sĩ');
    const review = await this.prisma.danhGiaBacSi.update({
      where: { id },
      data: { trangThai: status },
      include: {
        benhNhan: true,
        bacSi: { include: { chuyenKhoa: true } },
        luotKham: true,
      },
    });
    return {
      message:
        status === 'DA_AN' ? 'Đã ẩn đánh giá' : 'Đã duyệt và hiển thị đánh giá',
      data: this.toResponse(review),
    };
  }

  private toResponse(review: any) {
    return {
      id: review.id,
      rating: review.soSao,
      comment: review.noiDung,
      status: review.trangThai,
      createdAt: review.createdAt,
      patient: {
        id: review.benhNhan.id,
        name: review.benhNhan.hoTen,
        code: review.benhNhan.maBenhNhan,
      },
      doctor: {
        id: review.bacSi.id,
        name: review.bacSi.hoTen,
        specialty: review.bacSi.chuyenKhoa?.tenChuyenKhoa ?? null,
      },
      visit: { id: review.luotKham.id, code: review.luotKham.maLuotKham },
    };
  }
}
