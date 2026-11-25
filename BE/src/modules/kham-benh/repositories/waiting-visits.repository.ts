import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

const waitingInclude = {
  bacSi: { select: { nguoiDungId: true } },
  benhNhan: { select: { hoTen: true, maBenhNhan: true } },
  hoSoKham: { select: { trangThai: true } },
  hoaDon: { select: { trangThai: true } },
  _count: {
    select: { chiDinhDichVu: { where: { trangThai: 'CHO_THUC_HIEN' } } },
  },
} satisfies Prisma.LuotKhamInclude;
export type WaitingVisit = Prisma.LuotKhamGetPayload<{
  include: typeof waitingInclude;
}>;
export interface WaitingVisitTransaction {
  visit: WaitingVisit | null;
  setStatus: (status: 'CHO_KET_QUA' | 'DA_VAO_PHONG') => Promise<unknown>;
}

@Injectable()
export class WaitingVisitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, page: number, limit: number) {
    const where: Prisma.LuotKhamWhereInput = {
      bacSi: { nguoiDungId: userId },
      trangThai: 'CHO_KET_QUA',
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.luotKham.findMany({
        where,
        include: waitingInclude,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.luotKham.count({ where }),
    ]);
    return { items, total };
  }

  withVisit<T>(
    visitId: number,
    work: (tx: WaitingVisitTransaction) => Promise<T>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Cùng khóa với chỉ định/hoàn tất: đọc lại điều kiện sau khi lấy khóa.
      await tx.$queryRaw`SELECT id FROM luot_kham WHERE id = ${visitId} FOR UPDATE`;
      const visit = await tx.luotKham.findUnique({
        where: { id: visitId },
        include: waitingInclude,
      });
      return work({
        visit,
        setStatus: (trangThai) =>
          tx.luotKham.update({ where: { id: visitId }, data: { trangThai } }),
      });
    });
  }
}
