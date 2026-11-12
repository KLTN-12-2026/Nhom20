import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { SaveHandoverDto } from './dto/save-handover.dto';
import { SaveStaffDutyScheduleDto } from './dto/save-staff-duty-schedule.dto';
import { WorkScheduleQueryDto } from './dto/work-schedule-query.dto';
import { WorkSchedulesService } from './work-schedules.service';

@ApiTags('Receptionist schedules')
@Controller('receptionist-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECEPTIONIST')
export class ReceptionistSchedulesController {
  constructor(private readonly service: WorkSchedulesService) {}

  @Get('me')
  @Permissions('LICH_LAM_VIEC.VIEW')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findReceptionistMine(user.id, query.weekStart);
  }

  @Get('department')
  @Permissions('LICH_LAM_VIEC.VIEW')
  findDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findReceptionistDepartment(user.id, query.weekStart);
  }

  @Get('next-shift')
  @Permissions('BAN_GIAO_CA.VIEW')
  getNextShiftStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getNextShiftStaff(user.id);
  }

  @Get('shift-report')
  @Permissions('BAN_GIAO_CA.VIEW')
  getShiftReport(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getShiftReport(user.id);
  }

  @Put('department/draft')
  @Permissions('LICH_LAM_VIEC.UPDATE')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveStaffDutyScheduleDto,
  ) {
    return this.service.saveReceptionistDraft(user.id, dto);
  }

  @Post('department/auto-schedule')
  @Permissions('LICH_LAM_VIEC.UPDATE')
  autoSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.createReceptionistAutoSchedule(
      user.id,
      dto.weekStart,
      dto.lyDoThayDoi,
    );
  }

  @Post('department/publish')
  @Permissions('LICH_LAM_VIEC.UPDATE')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.publishReceptionist(user.id, dto.weekStart, dto.lyDoThayDoi);
  }

  @Put('handover/draft')
  @Permissions('BAN_GIAO_CA.CREATE')
  saveHandoverDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveHandoverDto,
  ) {
    return this.service.saveHandover(user.id, dto, false);
  }

  @Post('handover/submit')
  @Permissions('BAN_GIAO_CA.CREATE')
  submitHandover(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveHandoverDto,
  ) {
    return this.service.saveHandover(user.id, dto, true);
  }

  @Get('handover/pending')
  @Permissions('BAN_GIAO_CA.VIEW')
  getMyPendingHandovers(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMyPendingHandovers(user.id);
  }

  @Post('handover/:id/confirm-receipt')
  @Permissions('BAN_GIAO_CA.UPDATE')
  confirmHandoverReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.confirmHandoverReceipt(user.id, id);
  }

  @Get('handovers')
  @Roles('ADMIN')
  @Permissions('BAN_GIAO_CA.VIEW')
  listHandovers() {
    return this.service.listHandovers();
  }
}
