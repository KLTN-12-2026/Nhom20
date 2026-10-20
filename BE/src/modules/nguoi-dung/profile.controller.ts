import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin cá nhân của người đang đăng nhập' })
  @ApiOkResponse()
  getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.getOwnProfile(currentUser.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiOkResponse()
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateOwnProfile(currentUser.id, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Đổi mật khẩu khi đã đăng nhập' })
  @ApiOkResponse()
  changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changeOwnPassword(currentUser.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Người dùng cập nhật ảnh đại diện của mình' })
  @ApiOkResponse()
  uploadAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(currentUser.id, file, currentUser.id);
  }

  @Delete('avatar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Người dùng xóa ảnh đại diện của mình' })
  @ApiOkResponse()
  removeAvatar(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.removeAvatar(currentUser.id, currentUser.id);
  }
}
