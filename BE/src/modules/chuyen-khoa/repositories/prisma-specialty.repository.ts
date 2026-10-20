import { Injectable } from '@nestjs/common';
import { Prisma, TrangThaiChung } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  SpecialtyRepository,
  SpecialtyWithDoctorCount,
} from './specialty.repository.interface';

const specialtyInclude = {
  _count: { select: { bacSi: true } },
} satisfies Prisma.ChuyenKhoaInclude;

@Injectable()
export class PrismaSpecialtyRepository implements SpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, status?: TrangThaiChung) {
    return this.prisma.chuyenKhoa.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(search
          ? {
              OR: [
                { maChuyenKhoa: { contains: search, mode: 'insensitive' } },
                { tenChuyenKhoa: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: specialtyInclude,
      orderBy: { createdAt: 'desc' },
    }) as Promise<SpecialtyWithDoctorCount[]>;
  }

  findById(id: number) {
    return this.prisma.chuyenKhoa.findUnique({
      where: { id },
      include: specialtyInclude,
    }) as Promise<SpecialtyWithDoctorCount | null>;
  }

  findConflict(code: string, name: string, excludeId?: number) {
    return this.prisma.chuyenKhoa.findFirst({
      where: {
        OR: [{ maChuyenKhoa: code }, { tenChuyenKhoa: name }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  create(data: Prisma.ChuyenKhoaCreateInput) {
    return this.prisma.chuyenKhoa.create({
      data,
      include: specialtyInclude,
    }) as Promise<SpecialtyWithDoctorCount>;
  }

  async update(
    id: number,
    data: Prisma.ChuyenKhoaUpdateInput,
    currentName?: string,
    synchronizeExaminationService = false,
  ) {
    // Đồng bộ dịch vụ khám chuẩn khi quản trị viên thay đổi phí khám của chuyên khoa.
    return this.prisma.$transaction(async (transaction) => {
      const specialty = await transaction.chuyenKhoa.update({
        where: { id },
        data,
        include: specialtyInclude,
      });

      if (synchronizeExaminationService && currentName) {
        await transaction.dichVu.updateMany({
          where: {
            chuyenKhoaId: id,
            tenDichVu: `Khám ${currentName}`,
          },
          data: {
            tenDichVu: `Khám ${specialty.tenChuyenKhoa}`,
            donGia: specialty.phiKham,
          },
        });
      }

      return specialty as SpecialtyWithDoctorCount;
    });
  }

  delete(id: number) {
    return this.prisma.chuyenKhoa.delete({ where: { id } });
  }
}
