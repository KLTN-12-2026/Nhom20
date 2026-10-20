import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  LoaiXacThucToken,
  PhanHeNhatKyHeThong,
  TrangThaiNguoiDung,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/auth/authenticated-user.type';
import { PasswordService } from '../../common/security/password.service';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  USER_AUTH_REPOSITORY,
  type AuthUser,
  type UserAuthRepository,
} from './repositories/user-auth.repository.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_AUTH_REPOSITORY)
    private readonly userRepository: UserAuthRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Xử lý logic nghiệp vụ cho chức năng: xác thực
  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const user = await this.userRepository.findByIdentifier(identifier);

    if (
      !user ||
      user.trangThai !== TrangThaiNguoiDung.DANG_HOAT_DONG ||
      !(await this.passwordService.verify(dto.password, user.matKhau))
    ) {
      throw new UnauthorizedException(
        'Email, số điện thoại hoặc mật khẩu không chính xác',
      );
    }

    const authenticatedUser = this.toAuthenticatedUser(user);
    const payload: JwtPayload = {
      sub: user.id,
      roles: authenticatedUser.roles,
    };
    const configuredExpiresIn = this.configService.get<string>(
      'JWT_EXPIRES_SECONDS',
      '28800',
    );
    const expiresIn = Number.parseInt(configuredExpiresIn, 10);
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error('JWT_EXPIRES_SECONDS phải là số giây hợp lệ');
    }
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    await this.userRepository.updateLastLogin(user.id);
    await this.auditLogsService.record(
      user.id,
      PhanHeNhatKyHeThong.XAC_THUC,
      'Đăng nhập vào hệ thống',
      'Tạo phiên đăng nhập mới',
    );

    return {
      message: 'Đăng nhập thành công',
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        user: authenticatedUser,
      },
    };
  }

  private async registerPatient(dto: any) {
    const phone = dto.phoneNumber.replace(/[\s().-]/g, '');
    if (!/^\+?[0-9]{9,15}$/.test(phone))
      throw new BadRequestException('Số điện thoại không hợp lệ');
    const email = dto.email?.trim().toLowerCase() || null;
    const password = await this.passwordService.hash(dto.password);
    const role = await this.prisma.vaiTro.upsert({
      where: { maVaiTro: 'PATIENT' },
      update: {},
      create: {
        maVaiTro: 'PATIENT',
        tenVaiTro: 'Bệnh nhân',
        moTa: 'Tài khoản bệnh nhân',
      },
    });
    const existing = await this.prisma.nguoiDung.findFirst({
      where: { OR: [{ soDienThoai: phone }, ...(email ? [{ email }] : [])] },
      include: { benhNhan: true },
    });
    if (existing)
      throw new BadRequestException('Số điện thoại hoặc email đã được đăng ký');
    const code = `BN-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.nguoiDung.create({
        data: {
          hoTen: dto.fullName.trim(),
          soDienThoai: phone,
          email,
          matKhau: password,
          trangThai: 'DANG_HOAT_DONG',
        },
      });
      await tx.nguoiDungVaiTro.create({
        data: { nguoiDungId: created.id, vaiTroId: role.id },
      });
      await tx.benhNhan.create({
        data: {
          nguoiDungId: created.id,
          maBenhNhan: code,
          hoTen: dto.fullName.trim(),
          soDienThoai: phone,
          email,
        },
      });
      return created;
    });
    if (user.email) {
      const token = await this.createToken(
        user.id,
        user.email,
        LoaiXacThucToken.XAC_MINH_EMAIL,
      );
      await this.emailService.sendVerificationEmail({
        to: user.email,
        fullName: user.hoTen,
        token,
      });
    }
    return {
      message: user.email
        ? 'Đăng ký thành công. Hãy kiểm tra email để xác minh tài khoản.'
        : 'Đăng ký tài khoản bệnh nhân thành công',
      data: { id: user.id, phoneNumber: phone, email: user.email },
    };
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: xác thực
  async validateUser(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.trangThai !== TrangThaiNguoiDung.DANG_HOAT_DONG) {
      throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
    }
    return this.toAuthenticatedUser(user);
  }

  async requestEmailVerification(userId: number) {
    const user = await this.prisma.nguoiDung.findUnique({
      where: { id: userId },
    });
    if (!user?.email)
      throw new BadRequestException('Tài khoản chưa có email để xác minh');
    if (user.emailDaXacMinh) return { message: 'Email đã được xác minh' };

    const token = await this.createToken(
      user.id,
      user.email,
      LoaiXacThucToken.XAC_MINH_EMAIL,
    );
    await this.emailService.sendVerificationEmail({
      to: user.email,
      fullName: user.hoTen,
      token,
    });
    return { message: 'Đã gửi email xác minh' };
  }

  async confirmEmail(token: string) {
    const record = await this.findValidToken(
      token,
      LoaiXacThucToken.XAC_MINH_EMAIL,
    );
    await this.prisma.$transaction([
      this.prisma.nguoiDung.update({
        where: { id: record.nguoiDungId },
        data: { emailDaXacMinh: true },
      }),
      this.prisma.xacThucToken.update({
        where: { id: record.id },
        data: { daSuDungAt: new Date() },
      }),
    ]);
    return { message: 'Xác minh email thành công' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.nguoiDung.findFirst({ where: { email } });
    if (user) {
      const token = await this.createToken(
        user.id,
        email,
        LoaiXacThucToken.DAT_LAI_MAT_KHAU,
      );
      await this.emailService.sendPasswordResetEmail({
        to: email,
        fullName: user.hoTen,
        token,
      });
    }
    return {
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.findValidToken(
      dto.token,
      LoaiXacThucToken.DAT_LAI_MAT_KHAU,
    );
    const password = await this.passwordService.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.nguoiDung.update({
        where: { id: record.nguoiDungId },
        data: { matKhau: password },
      }),
      this.prisma.xacThucToken.update({
        where: { id: record.id },
        data: { daSuDungAt: new Date() },
      }),
    ]);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  private async createToken(
    userId: number,
    target: string,
    type: LoaiXacThucToken,
  ) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.xacThucToken.updateMany({
      where: { nguoiDungId: userId, loai: type, daSuDungAt: null },
      data: { daSuDungAt: new Date() },
    });
    await this.prisma.xacThucToken.create({
      data: {
        nguoiDungId: userId,
        loai: type,
        kenh: 'EMAIL',
        doiTuong: target,
        tokenHash,
        hetHanAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    return rawToken;
  }

  private async findValidToken(rawToken: string, type: LoaiXacThucToken) {
    if (!rawToken) throw new BadRequestException('Token không hợp lệ');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.xacThucToken.findUnique({
      where: { tokenHash },
    });
    if (
      !record ||
      record.loai !== type ||
      record.daSuDungAt ||
      record.hetHanAt <= new Date()
    ) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }
    return record;
  }

  private toAuthenticatedUser(user: AuthUser): AuthenticatedUser {
    return {
      id: user.id,
      fullName: user.hoTen,
      email: user.email,
      phoneNumber: user.soDienThoai,
      avatarUrl: user.anhDaiDienUrl,
      roles: user.nguoiDungVaiTro.map((userRole) => userRole.vaiTro.maVaiTro),
    };
  }
}
