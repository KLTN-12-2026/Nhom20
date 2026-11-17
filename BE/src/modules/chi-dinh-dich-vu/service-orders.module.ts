import { Module } from '@nestjs/common';
import { RealtimeModule } from '../thoi-gian-thuc/realtime.module';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { SERVICE_ORDER_REPOSITORY } from './repositories/service-order.repository.interface';
import { PrismaServiceOrderRepository } from './repositories/prisma-service-order.repository';

@Module({
  imports: [RealtimeModule],
  controllers: [ServiceOrdersController],
  providers: [
    ServiceOrdersService,
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: PrismaServiceOrderRepository,
    },
  ],
})
export class ServiceOrdersModule {}
