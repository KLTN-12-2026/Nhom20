import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { PrismaRoleRepository } from './repositories/prisma-role.repository';
import { ROLE_REPOSITORY } from './repositories/role.repository.interface';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    {
      provide: ROLE_REPOSITORY,
      useClass: PrismaRoleRepository,
    },
  ],
})
export class RolesModule {}
