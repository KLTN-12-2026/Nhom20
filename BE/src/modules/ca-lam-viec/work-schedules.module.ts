import { Module } from '@nestjs/common';

import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';
import { PrismaWorkScheduleRepository } from './repositories/prisma-work-schedule.repository';
import { WORK_SCHEDULE_REPOSITORY } from './repositories/work-schedule.repository.interface';
import { ReceptionistSchedulesController } from './receptionist-schedules.controller';
import { WorkSchedulesController } from './work-schedules.controller';
import { PharmacistSchedulesController } from './pharmacist-schedules.controller';
import { WorkSchedulesService } from './work-schedules.service';

@Module({
  imports: [RealtimeModule, ThongBaoModule],
  controllers: [
    WorkSchedulesController,
    ReceptionistSchedulesController,
    PharmacistSchedulesController,
  ],
  providers: [
    WorkSchedulesService,
    {
      provide: WORK_SCHEDULE_REPOSITORY,
      useClass: PrismaWorkScheduleRepository,
    },
  ],
  exports: [WorkSchedulesService],
})
export class WorkSchedulesModule {}
