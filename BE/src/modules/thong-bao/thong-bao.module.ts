import { Module } from '@nestjs/common';
import { ThongBaoController } from './thong-bao.controller';
import { ThongBaoService } from './thong-bao.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [ThongBaoController],
  providers: [ThongBaoService],
  exports: [ThongBaoService],
})
export class ThongBaoModule {}
