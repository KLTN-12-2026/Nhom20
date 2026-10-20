import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaServiceRepository } from './repositories/prisma-service.repository';
import { SERVICE_REPOSITORY } from './repositories/service.repository.interface';

@Module({
  imports: [AuditLogsModule],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
