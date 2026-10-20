import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateDoctorReviewDto } from './dto/create-doctor-review.dto';
import { PatientPortalService } from './patient-portal.service';

@ApiTags('Patient portal')
@Controller('patient-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('me/visits')
  @ApiOperation({
    summary: 'Bệnh nhân xem lịch sử khám, đơn thuốc và hóa đơn của mình',
  })
  @ApiOkResponse()
  getMyVisits(@CurrentUser() user: AuthenticatedUser) {
    return this.patientPortalService.getMyVisits(user.id);
  }

  @Post('me/visits/:visitId/review')
  @ApiOperation({
    summary: 'Bệnh nhân đánh giá bác sĩ theo lượt khám đã thanh toán',
  })
  @ApiOkResponse()
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
    @Body() dto: CreateDoctorReviewDto,
  ) {
    return this.patientPortalService.createReview(user.id, visitId, dto);
  }
}
