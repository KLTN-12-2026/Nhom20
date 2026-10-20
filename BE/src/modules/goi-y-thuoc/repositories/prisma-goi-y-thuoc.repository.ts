import { Injectable } from '@nestjs/common';
import { Prisma, TrangThaiChung } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  ungVienThuocInclude,
  type GoiYThuocRepository,
} from './goi-y-thuoc.repository.interface';

@Injectable()
export class PrismaGoiYThuocRepository implements GoiYThuocRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Đọc ứng viên thay thế theo thuốc hoặc hoạt chất cần tránh từ dữ liệu hệ thống.
  findAllowedAlternatives(input: {
    medicineId?: number | null;
    ingredientId?: number | null;
    at: Date;
  }) {
    const conditions: Prisma.GoiYThuocThayTheWhereInput[] = [];
    if (input.medicineId) {
      conditions.push({ thuocCanTranhId: input.medicineId });
    }
    if (input.ingredientId) {
      conditions.push({ hoatChatCanTranhId: input.ingredientId });
    }
    if (!conditions.length) return Promise.resolve([]);

    return this.prisma.goiYThuocThayThe.findMany({
      where: {
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
        ngayHieuLuc: { lte: input.at },
        OR: conditions,
      },
      include: ungVienThuocInclude,
      orderBy: [{ ngayHieuLuc: 'desc' }, { id: 'desc' }],
    });
  }
}
