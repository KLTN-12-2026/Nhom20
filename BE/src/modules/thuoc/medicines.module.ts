import { Module } from '@nestjs/common';

import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { MEDICINE_REPOSITORY } from './repositories/medicine.repository.interface';
import { PrismaMedicineRepository } from './repositories/prisma-medicine.repository';

@Module({
  imports: [AuditLogsModule, CloudinaryModule],
  controllers: [MedicinesController],
  providers: [
    MedicinesService,
    {
      provide: MEDICINE_REPOSITORY,
      useClass: PrismaMedicineRepository,
    },
  ],
  exports: [MedicinesService],
})
export class MedicinesModule {}
