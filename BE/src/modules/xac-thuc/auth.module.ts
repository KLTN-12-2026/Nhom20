import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PasswordService } from '../../common/security/password.service';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaUserAuthRepository } from './repositories/prisma-user-auth.repository';
import { USER_AUTH_REPOSITORY } from './repositories/user-auth.repository.interface';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    AuditLogsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordService,
    {
      provide: USER_AUTH_REPOSITORY,
      useClass: PrismaUserAuthRepository,
    },
  ],
  exports: [AuthService, PasswordService, JwtModule],
})
export class AuthModule {}
