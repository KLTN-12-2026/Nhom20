import { Module } from '@nestjs/common';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './repositories/audit-log.repository.interface';

@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
