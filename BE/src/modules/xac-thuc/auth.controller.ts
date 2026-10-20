import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { LoginDto } from './dto/login.dto';

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
