import type { Prisma, Quyen } from '@prisma/client';

export const managedRoleInclude = {
  quyen: {
    include: { quyen: true },
    orderBy: { quyenId: 'asc' },
  },
  _count: { select: { nguoiDung: true } },
} satisfies Prisma.VaiTroInclude;

export type ManagedRole = Prisma.VaiTroGetPayload<{
  include: typeof managedRoleInclude;
}>;

export interface RoleRepository {
  findAll(): Promise<ManagedRole[]>;
  findById(id: number): Promise<ManagedRole | null>;
  findConflict(
    code: string,
    name: string,
    excludeId?: number,
  ): Promise<{ id: number } | null>;
  findPermissions(): Promise<Quyen[]>;
  countPermissions(ids: number[]): Promise<number>;
  create(data: {
    code: string;
    name: string;
    description: string | null;
  }): Promise<ManagedRole>;
  update(
    id: number,
    data: { name?: string; description?: string | null },
  ): Promise<ManagedRole>;
  replacePermissions(id: number, permissionIds: number[]): Promise<ManagedRole>;
  delete(id: number): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
