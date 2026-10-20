import { Module } from '@nestjs/common';

import { PasswordService } from '../../common/security/password.service';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { ProfileController } from './profile.controller';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { USER_REPOSITORY } from './repositories/user.repository.interface';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CloudinaryModule, AuditLogsModule],
  controllers: [UsersController, ProfileController],
  providers: [
    UsersService,
    PasswordService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
