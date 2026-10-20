import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Headers,
  UnauthorizedException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { SePayWebhookDto } from './dto/sepay-webhook.dto';
import { ThanhToanService } from './thanh-toan.service';

@ApiTags('Thanh toan')
@Controller('thanh-toan')
export class ThanhToanController {
  private readonly logger = new Logger(ThanhToanController.name);

  constructor(private readonly thanhToanService: ThanhToanService) {}

  @Post('sepay-webhook')
  async handleWebhook(
    @Body() dto: SePayWebhookDto,
    @Headers('authorization') authHeader: string,
  ) {
    this.logger.log(`[SePay Webhook] Nhận request — authorization: "${authHeader ?? '(trống)'}"`);
    this.logger.log(`[SePay Webhook] Body: ${JSON.stringify(dto)}`);

    const apiToken = process.env.SEPAY_API_TOKEN;
    if (
      apiToken &&
      authHeader !== `Apikey ${apiToken}` &&
      authHeader !== `Bearer ${apiToken}`
    ) {
      this.logger.warn(
        `[SePay Webhook] Từ chối do sai token — Nhận: "${authHeader}" — Kỳ vọng: "Apikey ${apiToken?.slice(0, 8)}..."`
      );
      throw new UnauthorizedException('Invalid SePay API Token');
    }
    return this.thanhToanService.handleSePayWebhook(dto);
  }

  @Get('hoa-don')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST')
  // Chức năng: Thanh toán — xem danh sách hóa đơn
  async getInvoices() {
    return this.thanhToanService.getInvoices();
  }

  @Post('hoa-don/:id/tien-mat')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST')
  // Chức năng: Thanh toán — ghi nhận tiền mặt
  async collectCash(
    @Param('id') id: string,
    @Body('soTien') soTien: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.thanhToanService.collectCash(Number(id), soTien, user.id);
  }

  @Post('hoa-don/:id/chuyen-khoan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RECEPTIONIST')
  // Chức năng: Thanh toán — ghi nhận chuyển khoản thủ công để kiểm thử API
  async collectTransfer(
    @Param('id') id: string,
    @Body('soTien') soTien: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body('maGiaoDich') maGiaoDich?: string,
  ) {
    return this.thanhToanService.collectTransfer(
      Number(id),
      soTien,
      user.id,
      maGiaoDich,
    );
  }
}
