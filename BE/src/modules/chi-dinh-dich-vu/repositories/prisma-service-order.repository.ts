import { Injectable } from '@nestjs/common';
import { PhanHeNhatKyHeThong, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  ServiceOrderRepository,
  ServiceOrderTransaction,
} from './service-order.repository.interface';

const include = {
  dichVu: { select: { id: true, maDichVu: true, tenDichVu: true } },
} satisfies Prisma.ChiDinhDichVuInclude;

@Injectable()
export class PrismaServiceOrderRepository implements ServiceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(search: string | undefined, skip: number, take: number) {
    const where: Prisma.DichVuWhereInput = {
      loaiDichVu: 'CAN_LAM_SANG',
      trangThai: 'DANG_HOAT_DONG',
      ...(search
        ? {
            OR: [
              { maDichVu: { contains: search, mode: 'insensitive' as const } },
              { tenDichVu: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.dichVu.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
      }),
      this.prisma.dichVu.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: number) {
    return this.prisma.chiDinhDichVu.findUnique({ where: { id }, include });
  }

  withVisit<T>(
    visitId: number,
    work: (tx: ServiceOrderTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (db) => {
        // Cùng thứ tự khóa với hoàn tất khám: lượt khám trước, hóa đơn sau.
        // Tạo chỉ định và hoàn tất không thể cùng vượt qua kiểm tra trạng thái cũ.
        await db.$queryRaw`SELECT id FROM luot_kham WHERE id = ${visitId} FOR UPDATE`;
        await db.$queryRaw`SELECT id FROM hoa_don WHERE luot_kham_id = ${visitId} FOR UPDATE`;
        const visit = await db.luotKham.findUnique({
          where: { id: visitId },
          select: {
            id: true,
            bacSiId: true,
            trangThai: true,
            bacSi: { select: { nguoiDungId: true } },
            hoaDon: { select: { trangThai: true } },
          },
        });
        return work({
          visit,
          findByKey: (idempotencyKey) =>
            db.chiDinhDichVu.findUnique({ where: { idempotencyKey }, include }),
          findById: (id) =>
            db.chiDinhDichVu.findUnique({ where: { id }, include }),
          findService: (id) => db.dichVu.findUnique({ where: { id } }),
          list: () =>
            db.chiDinhDichVu.findMany({
              where: { luotKhamId: visitId },
              include,
              orderBy: { id: 'asc' },
            }),
          create: (data) => db.chiDinhDichVu.create({ data, include }),
          updatePending: (id, data) =>
            db.chiDinhDichVu.update({
              where: { id, trangThai: 'CHO_THUC_HIEN', luotKhamId: visitId },
              data,
              include,
            }),
          audit: async (userId, action, order) => {
            const actor = await db.nguoiDung.findUniqueOrThrow({
              where: { id: userId },
              select: { hoTen: true, email: true },
            });
            // Nhật ký nằm trong transaction, thất bại phải rollback; không ghi nội dung kết quả nhạy cảm.
            await db.nhatKyHeThong.create({
              data: {
                nguoiDungId: userId,
                hoTen: actor.hoTen,
                email: actor.email,
                vaiTro: 'Bác sĩ',
                phanHe: PhanHeNhatKyHeThong.DICH_VU,
                hanhDong: action,
                chiTiet: `Chỉ định #${order.id}; lượt khám #${visitId}; trạng thái ${order.trangThai}; kết quả nhập thủ công mô phỏng`,
              },
            });
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
