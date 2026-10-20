import { Module } from '@nestjs/common';

import { SPECIALTY_REPOSITORY } from './repositories/specialty.repository.interface';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { PrismaSpecialtyRepository } from './repositories/prisma-specialty.repository';
import { SpecialtiesController } from './specialties.controller';
import { SpecialtiesService } from './specialties.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SpecialtiesController],
  providers: [
    SpecialtiesService,
    {
      provide: SPECIALTY_REPOSITORY,
      useClass: PrismaSpecialtyRepository,
    },
  ],
  exports: [SpecialtiesService, SPECIALTY_REPOSITORY],
})
export class SpecialtiesModule {}
