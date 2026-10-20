import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrangThaiDanhGia } from '@prisma/client';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UpdateDoctorReviewStatusDto } from './dto/update-doctor-review-status.dto';
import { DoctorReviewsService } from './doctor-reviews.service';

@ApiTags('Doctor reviews')
@Controller('doctor-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DoctorReviewsController {
  constructor(private readonly doctorReviews: DoctorReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Quản trị viên xem danh sách đánh giá bác sĩ' })
  @ApiOkResponse()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: TrangThaiDanhGia,
  ) {
    return this.doctorReviews.findAll(search, status);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Quản trị viên duyệt, hiển thị lại hoặc ẩn đánh giá bác sĩ',
  })
  @ApiOkResponse()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorReviewStatusDto,
  ) {
    return this.doctorReviews.updateStatus(id, dto.status);
  }
}
