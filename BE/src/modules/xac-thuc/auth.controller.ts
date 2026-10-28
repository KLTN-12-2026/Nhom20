import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập bằng email hoặc số điện thoại' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // API gửi liên kết đặt lại mật khẩu qua email đã đăng ký của nhân sự.
  @Post('password/forgot')
  @ApiOperation({ summary: 'Gửi liên kết đặt lại mật khẩu qua email' })
  @ApiOkResponse()
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // API xác nhận token email trước khi cho phép thay đổi mật khẩu.
  @Post('password/reset')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token email' })
  @ApiOkResponse()
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // API xác minh quyền sở hữu email từ liên kết đã gửi.
  @Get('verify-email/confirm')
  @ApiOperation({ summary: 'Xác minh email bằng token' })
  @ApiOkResponse()
  confirmEmail(@Query('token') token: string) {
    return this.authService.confirmEmail(token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy tài khoản của phiên đăng nhập hiện tại' })
  @ApiOkResponse()
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy thông tin đăng nhập thành công',
      data: user,
    };
  }
}
