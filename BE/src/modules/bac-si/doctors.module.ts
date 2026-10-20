import { Module } from '@nestjs/common';

import { PasswordService } from '../../common/security/password.service';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DOCTOR_REPOSITORY } from './repositories/doctor.repository.interface';
import { PrismaDoctorRepository } from './repositories/prisma-doctor.repository';

@Module({
  imports: [CloudinaryModule, AuditLogsModule],
  controllers: [DoctorsController],
  providers: [
    DoctorsService,
    PasswordService,
    {
      provide: DOCTOR_REPOSITORY,
      useClass: PrismaDoctorRepository,
    },
  ],
  exports: [DoctorsService, DOCTOR_REPOSITORY],
})
export class DoctorsModule {}
