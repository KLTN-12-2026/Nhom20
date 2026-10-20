import type {
  GioiTinh,
  Prisma,
  TrangThaiNguoiDung,
  VaiTro,
} from '@prisma/client';

export const managedUserInclude = {
  nguoiDungVaiTro: { include: { vaiTro: true } },
  bacSi: { select: { id: true } },
  nhanVien: { select: { id: true } },
  benhNhan: {
    select: {
      id: true,
      maTheBaoHiemYTe: true,
      nguoiLienHeKhanCap: true,
      soDienThoaiKhanCap: true,
    },
  },
} satisfies Prisma.NguoiDungInclude;

export type ManagedUser = Prisma.NguoiDungGetPayload<{
  include: typeof managedUserInclude;
}>;

export interface CreateManagedUserData {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  passwordHash: string;
  roleIds: number[];
  status: TrangThaiNguoiDung;
}

export interface UpdateManagedUserData {
  fullName?: string;
  email?: string;
  phoneNumber?: string | null;
  passwordHash?: string;
  roleIds?: number[];
  status?: TrangThaiNguoiDung;
}

export interface UpdatePersonalProfileData {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: GioiTinh;
  dateOfBirth?: Date;
  identityNumber?: string | null;
  address?: string | null;
  healthInsuranceNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface UserRepository {
  findAll(
    search?: string,
    roleCode?: string,
    status?: TrangThaiNguoiDung,
  ): Promise<ManagedUser[]>;
  findById(id: number): Promise<ManagedUser | null>;
  findConflict(
    email: string,
    phoneNumber?: string | null,
    excludeId?: number,
  ): Promise<{ id: number } | null>;
  findRolesByCodes(codes: string[]): Promise<VaiTro[]>;
  findRoleOptions(): Promise<VaiTro[]>;
  create(data: CreateManagedUserData): Promise<ManagedUser>;
  update(id: number, data: UpdateManagedUserData): Promise<ManagedUser>;
  updatePersonalProfile(
    id: number,
    data: UpdatePersonalProfileData,
  ): Promise<ManagedUser>;
  updateAvatar(
    id: number,
    avatarUrl: string | null,
    avatarPublicId: string | null,
  ): Promise<ManagedUser>;
  delete(id: number): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
