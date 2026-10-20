import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  AuditLogFilters,
  AuditLogRepository,
} from './audit-log.repository.interface';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: AuditLogFilters) {
    const where: Prisma.NhatKyHeThongWhereInput = {
      ...(filters.module ? { phanHe: filters.module } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                hoTen: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                hanhDong: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                chiTiet: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.nhatKyHeThong.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: filters.skip,
        take: filters.take,
        include: {
          nguoiDung: {
            select: { anhDaiDienUrl: true },
          },
        },
      }),
      this.prisma.nhatKyHeThong.count({ where }),
    ]);

    return { items: items as any, total };
  }

  findActor(userId: number) {
    return this.prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hoTen: true,
        email: true,
        nguoiDungVaiTro: {
          select: {
            vaiTro: {
              select: { tenVaiTro: true },
            },
          },
        },
      },
    });
  }

  create(data: Prisma.NhatKyHeThongUncheckedCreateInput) {
    return this.prisma.nhatKyHeThong.create({ data });
  }
}
