import { Prisma } from '@prisma/client';

export const authUserInclude = {
  nguoiDungVaiTro: {
    include: {
      vaiTro: true,
    },
  },
} satisfies Prisma.NguoiDungInclude;

export type AuthUser = Prisma.NguoiDungGetPayload<{
  include: typeof authUserInclude;
}>;

export interface UserAuthRepository {
  findByIdentifier(identifier: string): Promise<AuthUser | null>;
  findById(id: number): Promise<AuthUser | null>;
  updateLastLogin(id: number): Promise<void>;
}

export const USER_AUTH_REPOSITORY = Symbol('USER_AUTH_REPOSITORY');
