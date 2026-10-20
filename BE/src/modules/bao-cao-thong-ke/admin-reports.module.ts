import { Module } from '@nestjs/common';

import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsRepository } from './admin-reports.repository';
import { AdminReportsService } from './admin-reports.service';

@Module({
  controllers: [AdminReportsController],
  providers: [AdminReportsService, AdminReportsRepository],
})
export class AdminReportsModule {}
