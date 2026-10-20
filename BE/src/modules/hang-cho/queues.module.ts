import { Module } from '@nestjs/common';

import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { PrismaQueueRepository } from './repositories/prisma-queue.repository';
import { QUEUE_REPOSITORY } from './repositories/queue.repository.interface';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [RealtimeModule],
  controllers: [QueuesController],
  providers: [
    QueuesService,
    { provide: QUEUE_REPOSITORY, useClass: PrismaQueueRepository },
  ],
})
export class QueuesModule {}
