import { Module } from '@nestjs/common';
import { ThanhToanController } from './thanh-toan.controller';
import { ThanhToanService } from './thanh-toan.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [ThanhToanController],
  providers: [ThanhToanService],
})
export class ThanhToanModule {}
