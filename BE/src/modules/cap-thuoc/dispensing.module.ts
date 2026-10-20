import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { DispensingController } from './dispensing.controller';
import { DispensingService } from './dispensing.service';
import { PrismaDispensingRepository } from './repositories/prisma-dispensing.repository';
import { DISPENSING_REPOSITORY } from './repositories/dispensing.repository.interface';

import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, RealtimeModule, ThongBaoModule],
  controllers: [DispensingController],
  providers: [
    DispensingService,
    {
      provide: DISPENSING_REPOSITORY,
      useClass: PrismaDispensingRepository,
    },
  ],
  exports: [DispensingService],
})
export class DispensingModule {}
