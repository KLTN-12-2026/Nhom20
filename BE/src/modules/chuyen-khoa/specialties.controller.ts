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
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { SpecialtyQueryDto } from './dto/specialty-query.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { SpecialtiesService } from './specialties.service';

@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chuyên khoa' })
  @ApiOkResponse()
  findAll(@Query() query: SpecialtyQueryDto) {
    return this.specialtiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết chuyên khoa' })
  @ApiOkResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.specialtiesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Thêm chuyên khoa' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateSpecialtyDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.specialtiesService.create(dto, currentUser.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật chuyên khoa' })
  @ApiOkResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.specialtiesService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xóa chuyên khoa' })
  @ApiOkResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.specialtiesService.remove(id, currentUser.id);
  }
}
