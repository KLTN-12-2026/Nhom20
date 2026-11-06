import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserLockDto } from './dto/set-user-lock.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('role-options')
  @Permissions('NGUOI_DUNG.VIEW')
  @ApiOperation({ summary: 'Lấy vai trò dùng cho biểu mẫu người dùng' })
  @ApiOkResponse()
  getRoleOptions() {
    return this.usersService.getRoleOptions();
  }

  @Get()
  @Roles('ADMIN', 'TIEP_DON_THU_NGAN', 'QUAN_TRI_VIEN', 'BAC_SI', 'DUOC_SI') // override class roles for this endpoint
  @Permissions('NGUOI_DUNG.VIEW')
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiOkResponse()
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions('NGUOI_DUNG.VIEW')
  @ApiOperation({ summary: 'Lấy chi tiết người dùng' })
  @ApiOkResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('NGUOI_DUNG.CREATE')
  @ApiOperation({ summary: 'Thêm người dùng' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.create(dto, currentUser.id);
  }

  @Post(':id/avatar')
  @Permissions('NGUOI_DUNG.UPDATE')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện người dùng' })
  @ApiOkResponse()
  uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.uploadAvatar(id, file, currentUser.id);
  }

  @Delete(':id/avatar')
  @Permissions('NGUOI_DUNG.UPDATE')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa ảnh đại diện người dùng' })
  @ApiOkResponse()
  removeAvatar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.removeAvatar(id, currentUser.id);
  }

  @Patch(':id/lock')
  @Permissions('NGUOI_DUNG.UPDATE')
  @ApiOperation({ summary: 'Khóa hoặc mở khóa tài khoản' })
  @ApiOkResponse()
  setLock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserLockDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.setLock(id, dto.locked, currentUser.id);
  }

  @Patch(':id')
  @Permissions('NGUOI_DUNG.UPDATE')
  @ApiOperation({ summary: 'Cập nhật người dùng' })
  @ApiOkResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @Permissions('NGUOI_DUNG.DELETE')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiOkResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.remove(id, currentUser.id);
  }
}
