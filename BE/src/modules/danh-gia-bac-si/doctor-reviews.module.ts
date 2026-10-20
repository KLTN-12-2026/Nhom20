import { Module } from '@nestjs/common';

import { DoctorReviewsController } from './doctor-reviews.controller';
import { DoctorReviewsService } from './doctor-reviews.service';

@Module({
  controllers: [DoctorReviewsController],
  providers: [DoctorReviewsService],
})
export class DoctorReviewsModule {}
