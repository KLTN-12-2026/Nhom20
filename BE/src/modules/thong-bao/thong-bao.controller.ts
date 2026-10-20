import {
  Controller,
  Get,
  Put,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThongBaoService } from './thong-bao.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class ThongBaoController {
  constructor(private readonly service: ThongBaoService) {}

  @Get()
  async getMyNotifications(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req.user as any).id;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    const result = await this.service.getMyNotifications(userId, p, l);
    return {
      message: 'Lấy thông báo thành công',
      data: result,
    };
  }

  @Put('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req.user as any).id;
    await this.service.markAllAsRead(userId);
    return {
      message: 'Đã đánh dấu tất cả là đã đọc',
    };
  }

  @Put(':id/read')
  async markAsRead(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = (req.user as any).id;
    await this.service.markAsRead(userId, id);
    return {
      message: 'Đã đánh dấu thông báo là đã đọc',
    };
  }
}
