import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository';
import { APPOINTMENT_REPOSITORY } from './repositories/appointment.repository.interface';

@Module({
  imports: [AuditLogsModule, RealtimeModule, ThongBaoModule],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: PrismaAppointmentRepository,
    },
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
