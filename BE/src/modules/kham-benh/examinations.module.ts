import { Module } from '@nestjs/common';

import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';
import { AuditLogsModule } from '../nhat-ky-he-thong/audit-logs.module';
import { GeminiModule } from '../../integrations/gemini/gemini.module';
import { GoiYThuocModule } from '../goi-y-thuoc/goi-y-thuoc.module';
import { ExaminationsController } from './examinations.controller';
import { ExaminationsService } from './examinations.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { GoiYThuocAiService } from './goi-y-thuoc-ai.service';
import { PrismaExaminationRepository } from './repositories/prisma-examination.repository';
import { EXAMINATION_REPOSITORY } from './repositories/examination.repository.interface';
import { PrismaDienGiaiCanhBaoAiRepository } from './repositories/prisma-dien-giai-canh-bao-ai.repository';
import { DIEN_GIAI_CANH_BAO_AI_REPOSITORY } from './repositories/dien-giai-canh-bao-ai.repository.interface';

@Module({
  imports: [
    RealtimeModule,
    ThongBaoModule,
    AuditLogsModule,
    GeminiModule,
    GoiYThuocModule,
  ],
  controllers: [ExaminationsController],
  providers: [
    ExaminationsService,
    PrescriptionSafetyService,
    GoiYThuocAiService,
    { provide: EXAMINATION_REPOSITORY, useClass: PrismaExaminationRepository },
    {
      provide: DIEN_GIAI_CANH_BAO_AI_REPOSITORY,
      useClass: PrismaDienGiaiCanhBaoAiRepository,
    },
  ],
})
export class ExaminationsModule {}
