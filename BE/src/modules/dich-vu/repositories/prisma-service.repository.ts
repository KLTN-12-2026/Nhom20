import { Injectable } from '@nestjs/common';
import { Prisma, TrangThaiChung } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  ServiceRepository,
  ServiceWithSpecialty,
} from './service.repository.interface';

const include = { chuyenKhoa: true } satisfies Prisma.DichVuInclude;

@Injectable()
export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, status?: TrangThaiChung, specialtyId?: number) {
    return this.prisma.dichVu.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(specialtyId ? { chuyenKhoaId: specialtyId } : {}),
        ...(search
          ? {
              OR: [
                { maDichVu: { contains: search, mode: 'insensitive' } },
                { tenDichVu: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include,
      orderBy: { maDichVu: 'asc' },
    }) as Promise<ServiceWithSpecialty[]>;
  }

  findById(id: number) {
    return this.prisma.dichVu.findUnique({
      where: { id },
      include,
    }) as Promise<ServiceWithSpecialty | null>;
  }
  findConflict(code: string, name: string, excludeId?: number) {
    return this.prisma.dichVu.findFirst({
      where: {
        OR: [{ maDichVu: code }, { tenDichVu: name }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
  create(data: Prisma.DichVuCreateInput) {
    return this.prisma.dichVu.create({
      data,
      include,
    }) as Promise<ServiceWithSpecialty>;
  }
  async update(
    id: number,
    data: Prisma.DichVuUpdateInput,
    synchronizeExaminationFee = false,
  ) {
    // Đồng bộ giá dịch vụ khám chuẩn với phí khám để hóa đơn mới không bị lệch giá.
    return this.prisma.$transaction(async (transaction) => {
      const service = await transaction.dichVu.update({
        where: { id },
        data,
        include,
      });

      if (synchronizeExaminationFee && service.chuyenKhoaId) {
        await transaction.chuyenKhoa.update({
          where: { id: service.chuyenKhoaId },
          data: { phiKham: service.donGia },
        });
      }

      return service as ServiceWithSpecialty;
    });
  }
  delete(id: number) {
    return this.prisma.dichVu.delete({ where: { id } });
  }
}
