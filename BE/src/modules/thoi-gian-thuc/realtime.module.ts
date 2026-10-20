import { Module, OnModuleInit } from '@nestjs/common';

import { AuthModule } from '../xac-thuc/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { PrismaRealtimeAccessRepository } from './repositories/prisma-realtime-access.repository';
import { REALTIME_ACCESS_REPOSITORY } from './repositories/realtime-access.repository.interface';

@Module({
  imports: [AuthModule],
  providers: [
    RealtimeGateway,
    RealtimeService,
    {
      provide: REALTIME_ACCESS_REPOSITORY,
      useClass: PrismaRealtimeAccessRepository,
    },
  ],
  exports: [RealtimeService],
})
export class RealtimeModule implements OnModuleInit {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    this.realtimeService.bindGateway(this.gateway);
  }
}
