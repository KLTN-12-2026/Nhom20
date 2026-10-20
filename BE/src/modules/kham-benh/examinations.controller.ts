import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ExaminationHistoryQueryDto } from './dto/examination-history-query.dto';
import { SaveExaminationDto } from './dto/save-examination.dto';
import { ResolvePrescriptionWarningDto } from './dto/resolve-prescription-warning.dto';
import { ExaminationsService } from './examinations.service';
import { GoiYThuocAiService } from './goi-y-thuoc-ai.service';
import { PrescriptionSafetyService } from './prescription-safety.service';

@ApiTags('Examinations')
@Controller('examinations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
export class ExaminationsController {
  constructor(
    private readonly service: ExaminationsService,
    private readonly prescriptionSafetyService: PrescriptionSafetyService,
    private readonly goiYThuocAiService: GoiYThuocAiService,
  ) {}

  @Get('appointment/:appointmentId')
  findByAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.service.findByAppointment(user.id, appointmentId);
  }

  @Post('appointment/:appointmentId/draft')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: SaveExaminationDto,
  ) {
    return this.service.saveDraft(user.id, appointmentId, dto);
  }

  @Post('appointment/:appointmentId/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: SaveExaminationDto,
  ) {
    return this.service.complete(user.id, appointmentId, dto);
  }

  // --- Endpoint dựa trên lượt khám, hỗ trợ bệnh nhân đến trực tiếp không có lichHenId. ---
  @Get('visit/:visitId')
  findByVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
  ) {
    return this.service.findByVisit(user.id, visitId);
  }

  @Post('visit/:visitId/draft')
  saveDraftByVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
    @Body() dto: SaveExaminationDto,
  ) {
    return this.service.saveDraftByVisit(user.id, visitId, dto);
  }

  @Post('visit/:visitId/complete')
  completeByVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
    @Body() dto: SaveExaminationDto,
  ) {
    return this.service.completeByVisit(user.id, visitId, dto);
  }

  @Get('visit/:visitId/prescription-warnings')
  findWarningsByVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
  ) {
    return this.prescriptionSafetyService.findWarningsForVisit(
      user.id,
      visitId,
    );
  }

  // API xếp hạng thuốc thay thế từ ứng viên đã được Backend kiểm tra an toàn.
  @Get('visit/:visitId/ai-explain')
  suggestAlternativeMedicinesByVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
    @Query('warningId', ParseIntPipe) warningId: number,
  ) {
    return this.goiYThuocAiService.suggest(user.id, visitId, warningId);
  }

  @Patch('prescription-warnings/:warningId')
  resolveWarning(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warningId', ParseIntPipe) warningId: number,
    @Body() dto: ResolvePrescriptionWarningDto,
  ) {
    return this.prescriptionSafetyService.resolveWarning(
      user.id,
      warningId,
      dto,
    );
  }

  @Get('doctor/me/active')
  findActiveVisit(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findActiveVisit(user.id);
  }

  @Get('history/me')
  findHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExaminationHistoryQueryDto,
  ) {
    return this.service.findHistory(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(user.id, id);
  }
}
