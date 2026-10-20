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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) { }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ' })
  @ApiOkResponse()
  findAll(@Query() query: DoctorQueryDto) {
    return this.doctorsService.findAll(query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ đi làm theo ngày' })
  @ApiOkResponse()
  findAvailable(
    @Query('date') date: string,
    @Query('specialtyId') specialtyId?: string,
  ) {
    const parsedSpecialtyId = specialtyId ? parseInt(specialtyId, 10) : undefined;
    return this.doctorsService.findAvailable(date, parsedSpecialtyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bác sĩ' })
  @ApiOkResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo bác sĩ kèm tài khoản DOCTOR' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateDoctorDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.doctorsService.create(dto, currentUser.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật bác sĩ và tài khoản liên kết' })
  @ApiOkResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.doctorsService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa bác sĩ và tài khoản liên kết' })
  @ApiOkResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.doctorsService.remove(id, currentUser.id);
  }
}
