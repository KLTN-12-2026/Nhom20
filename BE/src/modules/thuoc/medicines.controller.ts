import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { StockInDto } from './dto/stock-in.dto';
import { MedicinesService } from './medicines.service';

@ApiTags('Medicines')
@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @Roles('ADMIN', 'PHARMACIST', 'DOCTOR')
  findAll(@Query() query: MedicineQueryDto) {
    return this.medicinesService.findAll(query);
  }

  @Get('batches')
  @Roles('ADMIN', 'PHARMACIST')
  // Chức năng: Quản lý thuốc — xem tồn kho theo từng lô
  findBatches(@Query('search') search?: string) {
    return this.medicinesService.findBatches(search);
  }

  @Get(':id')
  @Roles('ADMIN', 'PHARMACIST', 'DOCTOR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicinesService.findOne(id);
  }

  @Post()
  @Roles('PHARMACIST')
  create(
    @Body() createMedicineDto: CreateMedicineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.create(createMedicineDto, user.id);
  }

  @Patch(':id')
  @Roles('PHARMACIST')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMedicineDto: UpdateMedicineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.update(id, updateMedicineDto, user.id);
  }

  @Post(':id/stock-in')
  @Roles('PHARMACIST')
  stockIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() stockInDto: StockInDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.stockIn(id, stockInDto, user.id);
  }

  @Post(':id/image')
  @Roles('PHARMACIST')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.uploadImage(id, file, user.id);
  }

  @Delete(':id/image')
  @Roles('PHARMACIST')
  @HttpCode(HttpStatus.OK)
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.removeImage(id, user.id);
  }

  @Delete(':id')
  @Roles('PHARMACIST')
  @HttpCode(HttpStatus.OK) // Xóa thì trả về 200
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicinesService.remove(id, user.id);
  }
}
