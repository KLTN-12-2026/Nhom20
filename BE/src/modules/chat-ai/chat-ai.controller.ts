import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ChatAIService } from './chat-ai.service';
import { ChatAdminQueryDto } from './dto/chat-admin-query.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConfirmChatBookingDto } from './dto/confirm-chat-booking.dto';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@ApiTags('Chat AI')
@ApiBearerAuth()
@Controller('chat-ai')
@UseGuards(OptionalJwtAuthGuard)
export class ChatAIController {
  constructor(private readonly chatAIService: ChatAIService) {}

  // Khu vuc quan tri chi doc de theo doi Chatbox va phat hien loi van hanh.
  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tong quan van hanh Chatbox AI cho quan tri vien' })
  getAdminOverview() {
    return this.chatAIService.getAdminOverview();
  }

  @Get('admin/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Danh sach phien Chatbox AI cho quan tri vien' })
  getAdminSessions(@Query() query: ChatAdminQueryDto) {
    return this.chatAIService.getAdminSessions(query);
  }

  @Get('admin/sessions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Chi tiet mot phien Chatbox AI cho quan tri vien' })
  getAdminSessionDetail(@Param('id', ParseIntPipe) id: number) {
    return this.chatAIService.getAdminSessionDetail(id);
  }

  // API tạo phiên Chatbox mới hoặc lấy lại phiên đang hoạt động theo yêu cầu giao diện.
  @Post('sessions')
  @ApiOperation({ summary: 'Tạo phiên chat mới hoặc lấy lại phiên đang hoạt động' })
  createSession(
    @CurrentUser() user: AuthenticatedUser | null,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chatAIService.createSession(user?.id, dto.title, dto.fresh);
  }

  // Đọc lịch sử sau khi kiểm tra JWT hoặc token khách vãng lai.
  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của phiên chat' })
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-token') guestToken?: string,
  ) {
    return this.chatAIService.getMessages(id, user?.id, guestToken);
  }

  // Gui mot tin nhan qua Service, khong goi Gemini truc tiep o Controller.
  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn và nhận phản hồi Gemini' })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-token') guestToken: string | undefined,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatAIService.sendMessage(
      id,
      dto.content,
      user?.id,
      guestToken,
    );
  }

  // Xác nhận bản nháp để tạo lịch thật theo đúng nghiệp vụ lịch hẹn hiện có.
  @Post('sessions/:id/confirm-booking')
  @ApiOperation({ summary: 'Xác nhận bản nháp đặt lịch từ Chatbox' })
  confirmBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-token') guestToken: string | undefined,
    @Body() dto: ConfirmChatBookingDto,
  ) {
    return this.chatAIService.confirmBooking(
      id,
      dto.draftId,
      user?.id,
      guestToken,
    );
  }

  // Ket thuc phien de khong nhan them tin nhan moi.
  @Patch('sessions/:id/end')
  @ApiOperation({ summary: 'Kết thúc phiên chat hiện tại' })
  endSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-session-token') guestToken?: string,
  ) {
    return this.chatAIService.endSession(id, user?.id, guestToken);
  }
}
