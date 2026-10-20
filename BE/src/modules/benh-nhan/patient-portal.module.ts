import { Module } from '@nestjs/common';

import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';

@Module({
  controllers: [PatientPortalController],
  providers: [PatientPortalService],
})
export class PatientPortalModule {}
