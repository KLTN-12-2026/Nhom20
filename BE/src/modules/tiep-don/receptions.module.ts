import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';
import { PrismaReceptionRepository } from './repositories/prisma-reception.repository';
import { RECEPTION_REPOSITORY } from './repositories/reception.repository.interface';
import { ReceptionsController } from './receptions.controller';
import { ReceptionsService } from './receptions.service';

@Module({
  imports: [AuditLogsModule, RealtimeModule, ThongBaoModule],
  controllers: [ReceptionsController],
  providers: [
    ReceptionsService,
    {
      provide: RECEPTION_REPOSITORY,
      useClass: PrismaReceptionRepository,
    },
  ],
})
export class ReceptionsModule {}
