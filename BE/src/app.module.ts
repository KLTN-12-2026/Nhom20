import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './database/prisma/prisma.module';
import { DoctorsModule } from './modules/bac-si/doctors.module';
import { SpecialtiesModule } from './modules/chuyen-khoa/specialties.module';
import { UsersModule } from './modules/nguoi-dung/users.module';
import { AuthModule } from './modules/xac-thuc/auth.module';
import { AuditLogsModule } from './modules/nhat-ky-he-thong/audit-logs.module';
import { RolesModule } from './modules/vai-tro/roles.module';
import { AppointmentsModule } from './modules/lich-hen/appointments.module';

import { MedicinesModule } from './modules/thuoc/medicines.module';
import { RealtimeModule } from './modules/thoi-gian-thuc/realtime.module';
import { QueuesModule } from './modules/hang-cho/queues.module';
import { ReceptionsModule } from './modules/tiep-don/receptions.module';
import { ServicesModule } from './modules/dich-vu/services.module';
import { WorkSchedulesModule } from './modules/ca-lam-viec/work-schedules.module';
import { ExaminationsModule } from './modules/kham-benh/examinations.module';
import { DispensingModule } from './modules/cap-thuoc/dispensing.module';
import { ThongBaoModule } from './modules/thong-bao/thong-bao.module';
import { ThanhToanModule } from './modules/thanh-toan/thanh-toan.module';
import { EmailModule } from './modules/email/email.module';
import { PatientPortalModule } from './modules/benh-nhan/patient-portal.module';
import { DoctorReviewsModule } from './modules/danh-gia-bac-si/doctor-reviews.module';
import { ChatAIModule } from './modules/chat-ai/chat-ai.module';
import { AdminReportsModule } from './modules/bao-cao-thong-ke/admin-reports.module';
import { GoiYThuocModule } from './modules/goi-y-thuoc/goi-y-thuoc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    DoctorsModule,
    SpecialtiesModule,
    UsersModule,
    AuditLogsModule,
    RolesModule,
    AppointmentsModule,
    MedicinesModule,
    RealtimeModule,
    QueuesModule,
    ReceptionsModule,
    ServicesModule,
    WorkSchedulesModule,
    ExaminationsModule,
    DispensingModule,
    ThongBaoModule,
    ThanhToanModule,
    EmailModule,
    PatientPortalModule,
    DoctorReviewsModule,
    ChatAIModule,
    AdminReportsModule,
    GoiYThuocModule,
  ],
})
export class AppModule {}
