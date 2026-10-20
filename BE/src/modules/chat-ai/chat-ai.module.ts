import { Module } from '@nestjs/common';

import { GeminiModule } from '../../integrations/gemini/gemini.module';
import { DoctorsModule } from '../bac-si/doctors.module';
import { WorkSchedulesModule } from '../ca-lam-viec/work-schedules.module';
import { SpecialtiesModule } from '../chuyen-khoa/specialties.module';
import { ServicesModule } from '../dich-vu/services.module';
import { AppointmentsModule } from '../lich-hen/appointments.module';
import { ChatAIController } from './chat-ai.controller';
import { ChatAIService } from './chat-ai.service';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { PrismaChatRepository } from './repositories/prisma-chat.repository';
import { CHAT_REPOSITORY } from './repositories/chat.repository.interface';
import { ChatToolService } from './tools/chat-tool.service';

@Module({
  // GeminiModule chi dong vai tro integration; nghiep vu chat nam o ChatAIService.
  imports: [
    GeminiModule,
    SpecialtiesModule,
    DoctorsModule,
    ServicesModule,
    WorkSchedulesModule,
    AppointmentsModule,
  ],
  controllers: [ChatAIController],
  providers: [
    ChatAIService,
    OptionalJwtAuthGuard,
    ChatToolService,
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
  ],
})
export class ChatAIModule {}
