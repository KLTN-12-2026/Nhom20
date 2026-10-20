import { Injectable } from '@nestjs/common';
import { Prisma, TrangThaiChung } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  CreateDoctorData,
  DoctorRepository,
  DoctorWithRelations,
  UpdateDoctorData,
} from './doctor.repository.interface';

const doctorInclude = {
  nguoiDung: {
    select: {
      email: true,
      anhDaiDienUrl: true,
      anhDaiDienPublicId: true,
    },
  },
  chuyenKhoa: {
    select: { id: true, maChuyenKhoa: true, tenChuyenKhoa: true },
  },
  danhGia: {
    where: { trangThai: 'DA_HIEN_THI' as const },
    select: { soSao: true },
  },
  _count: {
    select: {
      luotKham: true,
      lichHen: true,
      danhGia: true,
    },
  },
} satisfies Prisma.BacSiInclude;

@Injectable()
export class PrismaDoctorRepository implements DoctorRepository {
  constructor(private readonly prisma: PrismaService) { }

  findAll(search?: string, status?: TrangThaiChung, specialtyId?: number) {
    return this.prisma.bacSi.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(specialtyId ? { chuyenKhoaId: specialtyId } : {}),
        ...(search
          ? {
            OR: [
              { maBacSi: { contains: search, mode: 'insensitive' } },
              { hoTen: { contains: search, mode: 'insensitive' } },
              {
                nguoiDung: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
              {
                chuyenKhoa: {
                  tenChuyenKhoa: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
          : {}),
      },
      include: doctorInclude,
      orderBy: { createdAt: 'desc' },
    }) as Promise<DoctorWithRelations[]>;
  }

  findAvailable(date: Date, specialtyId?: number) {
    return this.prisma.bacSi.findMany({
      where: {
        trangThai: 'DANG_HOAT_DONG',
        ...(specialtyId ? { chuyenKhoaId: specialtyId } : {}),
        nguoiDung: {
          phanCongCa: {
            some: {
              ngayLamViec: date,
              trangThai: 'DA_DUYET',
            },
          },
        },
      },
      include: doctorInclude,
      orderBy: { hoTen: 'asc' },
    }) as Promise<DoctorWithRelations[]>;
  }

  findById(id: number) {
    return this.prisma.bacSi.findUnique({
      where: { id },
      include: doctorInclude,
    }) as Promise<DoctorWithRelations | null>;
  }

  async findConflict(
    code: string,
    email: string,
    phoneNumber?: string | null,
    excludeDoctorId?: number,
  ) {
    const doctorConflict = await this.prisma.bacSi.findFirst({
      where: {
        ...(excludeDoctorId ? { id: { not: excludeDoctorId } } : {}),
        maBacSi: code,
      },
      select: { id: true, nguoiDungId: true },
    });
    if (doctorConflict) return doctorConflict;

    const currentDoctor = excludeDoctorId
      ? await this.prisma.bacSi.findUnique({
        where: { id: excludeDoctorId },
        select: { nguoiDungId: true },
      })
      : null;
    return this.prisma.nguoiDung.findFirst({
      where: {
        ...(currentDoctor ? { id: { not: currentDoctor.nguoiDungId } } : {}),
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          ...(phoneNumber ? [{ soDienThoai: phoneNumber }] : []),
        ],
      },
      select: { id: true },
    });
  }

  async specialtyExists(id: number) {
    const count = await this.prisma.chuyenKhoa.count({ where: { id } });
    return count > 0;
  }

  create(data: CreateDoctorData) {
    return this.prisma.$transaction(async (transaction) => {
      const role = await transaction.vaiTro.upsert({
        where: { maVaiTro: 'DOCTOR' },
        update: {},
        create: {
          maVaiTro: 'DOCTOR',
          tenVaiTro: 'Bác sĩ',
          moTa: 'Bác sĩ của phòng khám',
        },
      });
      const user = await transaction.nguoiDung.create({
        data: {
          email: data.email,
          soDienThoai: data.phoneNumber,
          matKhau: data.passwordHash,
          hoTen: data.fullName,
          trangThai: data.status,
          nguoiDungVaiTro: { create: { vaiTroId: role.id } },
        },
      });
      return transaction.bacSi.create({
        data: {
          nguoiDungId: user.id,
          maBacSi: data.code,
          chuyenKhoaId: data.specialtyId,
          hoTen: data.fullName,
          soDienThoai: data.phoneNumber,
          hocVi: data.academicDegree,
          soNamKinhNghiem: data.experienceYears,
          moTa: data.description,
          trangThai: data.status,
        },
        include: doctorInclude,
      });
    }) as Promise<DoctorWithRelations>;
  }

  update(id: number, data: UpdateDoctorData) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.bacSi.findUniqueOrThrow({
        where: { id },
        select: { nguoiDungId: true },
      });
      await transaction.nguoiDung.update({
        where: { id: current.nguoiDungId },
        data: {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
          ...(data.passwordHash !== undefined
            ? { matKhau: data.passwordHash }
            : {}),
          ...(data.status !== undefined ? { trangThai: data.status } : {}),
        },
      });
      return transaction.bacSi.update({
        where: { id },
        data: {
          ...(data.code !== undefined ? { maBacSi: data.code } : {}),
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.specialtyId !== undefined
            ? { chuyenKhoaId: data.specialtyId }
            : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
          ...(data.academicDegree !== undefined
            ? { hocVi: data.academicDegree }
            : {}),
          ...(data.experienceYears !== undefined
            ? { soNamKinhNghiem: data.experienceYears }
            : {}),
          ...(data.description !== undefined ? { moTa: data.description } : {}),
          ...(data.status !== undefined ? { trangThai: data.status } : {}),
        },
        include: doctorInclude,
      });
    }) as Promise<DoctorWithRelations>;
  }

  async delete(id: number) {
    await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.bacSi.findUniqueOrThrow({
        where: { id },
        select: { nguoiDungId: true },
      });
      await transaction.bacSi.delete({ where: { id } });
      await transaction.nguoiDung.delete({
        where: { id: current.nguoiDungId },
      });
    });
  }
}
