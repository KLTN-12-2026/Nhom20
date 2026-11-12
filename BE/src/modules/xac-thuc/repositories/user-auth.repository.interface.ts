import { Prisma } from '@prisma/client';

export const authUserInclude = () => ({
  donViDangQuanLy: {
    where: {
      chucVu: 'TRUONG_DON_VI',
      trangThai: 'DANG_HOAT_DONG',
      ngayBatDau: { lte: new Date() },
      OR: [{ ngayKetThuc: null }, { ngayKetThuc: { gte: new Date() } }],
      donViLamViec: { maDonVi: 'BO_PHAN_DUOC', trangThai: 'DANG_HOAT_DONG' },
    },
    select: { id: true },
  },
  nguoiDungVaiTro: {
    include: {
      vaiTro: {
        include: {
          quyen: { include: { quyen: true } },
        },
      },
    },
  },
} satisfies Prisma.NguoiDungInclude);

export type AuthUser = Prisma.NguoiDungGetPayload<{
  include: ReturnType<typeof authUserInclude>;
}>;

export interface UserAuthRepository {
  findByIdentifier(identifier: string): Promise<AuthUser | null>;
  findById(id: number): Promise<AuthUser | null>;
  updateLastLogin(id: number): Promise<void>;
}

export const USER_AUTH_REPOSITORY = Symbol('USER_AUTH_REPOSITORY');
