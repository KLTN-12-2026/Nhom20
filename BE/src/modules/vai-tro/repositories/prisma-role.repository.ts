import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  managedRoleInclude,
  type RoleRepository,
} from './role.repository.interface';

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.vaiTro.findMany({
      include: managedRoleInclude,
      orderBy: { id: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.vaiTro.findUnique({
      where: { id },
      include: managedRoleInclude,
    });
  }

  findConflict(code: string, name: string, excludeId?: number) {
    return this.prisma.vaiTro.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          { maVaiTro: code },
          { tenVaiTro: { equals: name, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
  }

  findPermissions() {
    return this.prisma.quyen.findMany({
      orderBy: [{ phanHe: 'asc' }, { id: 'asc' }],
    });
  }

  countPermissions(ids: number[]) {
    return this.prisma.quyen.count({ where: { id: { in: ids } } });
  }

  create(data: { code: string; name: string; description: string | null }) {
    return this.prisma.vaiTro.create({
      data: {
        maVaiTro: data.code,
        tenVaiTro: data.name,
        moTa: data.description,
      },
      include: managedRoleInclude,
    });
  }

  update(id: number, data: { name?: string; description?: string | null }) {
    return this.prisma.vaiTro.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { tenVaiTro: data.name } : {}),
        ...(data.description !== undefined ? { moTa: data.description } : {}),
      },
      include: managedRoleInclude,
    });
  }

  replacePermissions(id: number, permissionIds: number[]) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.vaiTroQuyen.deleteMany({ where: { vaiTroId: id } });
      if (permissionIds.length > 0) {
        await transaction.vaiTroQuyen.createMany({
          data: permissionIds.map((quyenId) => ({
            vaiTroId: id,
            quyenId,
          })),
        });
      }
      return transaction.vaiTro.findUniqueOrThrow({
        where: { id },
        include: managedRoleInclude,
      });
    });
  }

  async delete(id: number) {
    await this.prisma.vaiTro.delete({ where: { id } });
  }
}
