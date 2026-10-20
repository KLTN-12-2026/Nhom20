import { Injectable } from '@nestjs/common';
import { TrangThaiNguoiDung } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  type CreateManagedUserData,
  managedUserInclude,
  type ManagedUser,
  type UpdatePersonalProfileData,
  type UpdateManagedUserData,
  type UserRepository,
} from './user.repository.interface';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, roleCode?: string, status?: TrangThaiNguoiDung) {
    return this.prisma.nguoiDung.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(roleCode
          ? {
              nguoiDungVaiTro: {
                some: { vaiTro: { maVaiTro: roleCode } },
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { hoTen: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { soDienThoai: { contains: search } },
              ],
            }
          : {}),
      },
      include: managedUserInclude,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ManagedUser[]>;
  }

  findById(id: number) {
    return this.prisma.nguoiDung.findUnique({
      where: { id },
      include: managedUserInclude,
    }) as Promise<ManagedUser | null>;
  }

  findConflict(email: string, phoneNumber?: string | null, excludeId?: number) {
    return this.prisma.nguoiDung.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          ...(phoneNumber ? [{ soDienThoai: phoneNumber }] : []),
        ],
      },
      select: { id: true },
    });
  }

  findRolesByCodes(codes: string[]) {
    return this.prisma.vaiTro.findMany({
      where: { maVaiTro: { in: codes } },
    });
  }

  findRoleOptions() {
    return this.prisma.vaiTro.findMany({
      orderBy: { tenVaiTro: 'asc' },
    });
  }

  create(data: CreateManagedUserData) {
    return this.prisma.nguoiDung.create({
      data: {
        hoTen: data.fullName,
        email: data.email,
        soDienThoai: data.phoneNumber,
        matKhau: data.passwordHash,
        trangThai: data.status,
        nguoiDungVaiTro: {
          create: data.roleIds.map((vaiTroId) => ({ vaiTroId })),
        },
      },
      include: managedUserInclude,
    }) as Promise<ManagedUser>;
  }

  update(id: number, data: UpdateManagedUserData) {
    return this.prisma.$transaction(async (transaction) => {
      if (data.roleIds) {
        await transaction.nguoiDungVaiTro.deleteMany({
          where: { nguoiDungId: id },
        });
        await transaction.nguoiDungVaiTro.createMany({
          data: data.roleIds.map((vaiTroId) => ({
            nguoiDungId: id,
            vaiTroId,
          })),
        });
      }
      if (data.fullName !== undefined || data.phoneNumber !== undefined) {
        const sharedProfileData = {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
        };
        await transaction.bacSi.updateMany({
          where: { nguoiDungId: id },
          data: sharedProfileData,
        });
        await transaction.nhanVien.updateMany({
          where: { nguoiDungId: id },
          data: sharedProfileData,
        });
        await transaction.benhNhan.updateMany({
          where: { nguoiDungId: id },
          data: {
            ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
            ...(data.phoneNumber ? { soDienThoai: data.phoneNumber } : {}),
          },
        });
      }
      return transaction.nguoiDung.update({
        where: { id },
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
        include: managedUserInclude,
      });
    }) as Promise<ManagedUser>;
  }

  updateAvatar(
    id: number,
    avatarUrl: string | null,
    avatarPublicId: string | null,
  ) {
    return this.prisma.nguoiDung.update({
      where: { id },
      data: {
        anhDaiDienUrl: avatarUrl,
        anhDaiDienPublicId: avatarPublicId,
      },
      include: managedUserInclude,
    }) as Promise<ManagedUser>;
  }

  updatePersonalProfile(id: number, data: UpdatePersonalProfileData) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.bacSi.updateMany({
        where: { nguoiDungId: id },
        data: {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
        },
      });
      await transaction.nhanVien.updateMany({
        where: { nguoiDungId: id },
        data: {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
        },
      });
      await transaction.benhNhan.updateMany({
        where: { nguoiDungId: id },
        data: {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
          ...(data.gender !== undefined ? { gioiTinh: data.gender } : {}),
          ...(data.dateOfBirth !== undefined
            ? { ngaySinh: data.dateOfBirth }
            : {}),
          ...(data.identityNumber !== undefined
            ? { soCanCuoc: data.identityNumber }
            : {}),
          ...(data.address !== undefined ? { diaChi: data.address } : {}),
          ...(data.healthInsuranceNumber !== undefined
            ? { maTheBaoHiemYTe: data.healthInsuranceNumber }
            : {}),
          ...(data.emergencyContactName !== undefined
            ? { nguoiLienHeKhanCap: data.emergencyContactName }
            : {}),
          ...(data.emergencyContactPhone !== undefined
            ? { soDienThoaiKhanCap: data.emergencyContactPhone }
            : {}),
        },
      });
      return transaction.nguoiDung.update({
        where: { id },
        data: {
          ...(data.fullName !== undefined ? { hoTen: data.fullName } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.phoneNumber !== undefined
            ? { soDienThoai: data.phoneNumber }
            : {}),
          ...(data.gender !== undefined ? { gioiTinh: data.gender } : {}),
          ...(data.dateOfBirth !== undefined
            ? { ngaySinh: data.dateOfBirth }
            : {}),
          ...(data.identityNumber !== undefined
            ? { soCanCuoc: data.identityNumber }
            : {}),
          ...(data.address !== undefined ? { diaChi: data.address } : {}),
        },
        include: managedUserInclude,
      });
    }) as Promise<ManagedUser>;
  }

  async delete(id: number) {
    await this.prisma.nguoiDung.delete({ where: { id } });
  }
}
