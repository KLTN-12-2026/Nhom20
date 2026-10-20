import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  authUserInclude,
  type AuthUser,
  type UserAuthRepository,
} from './user-auth.repository.interface';

@Injectable()
export class PrismaUserAuthRepository implements UserAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdentifier(identifier: string) {
    const isEmail = identifier.includes('@');

    return this.prisma.nguoiDung.findFirst({
      where: isEmail
        ? { email: { equals: identifier.toLowerCase(), mode: 'insensitive' } }
        : { soDienThoai: identifier },
      include: authUserInclude,
    }) as Promise<AuthUser | null>;
  }

  findById(id: number) {
    return this.prisma.nguoiDung.findUnique({
      where: { id },
      include: authUserInclude,
    }) as Promise<AuthUser | null>;
  }

  async updateLastLogin(id: number) {
    await this.prisma.nguoiDung.update({
      where: { id },
      data: { lanDangNhapCuoi: new Date() },
    });
  }
}
