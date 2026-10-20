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
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findReceptionistMine(user.id, query.weekStart);
  }

  @Get('department')
  findDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findReceptionistDepartment(user.id, query.weekStart);
  }

  @Get('next-shift')
  getNextShiftStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getNextShiftStaff(user.id);
  }

  @Get('shift-report')
  getShiftReport(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getShiftReport(user.id);
  }

  @Put('department/draft')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveStaffDutyScheduleDto,
  ) {
    return this.service.saveReceptionistDraft(user.id, dto);
  }

  @Post('department/auto-schedule')
  autoSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.createReceptionistAutoSchedule(user.id, dto.weekStart);
  }

  @Post('department/publish')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.publishReceptionist(user.id, dto.weekStart, dto.lyDoThayDoi);
  }

  @Put('handover/draft')
  saveHandoverDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveHandoverDto,
  ) {
    return this.service.saveHandover(user.id, dto, false);
  }

  @Post('handover/submit')
  submitHandover(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveHandoverDto,
  ) {
    return this.service.saveHandover(user.id, dto, true);
  }

  @Get('handover/pending')
  getMyPendingHandovers(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMyPendingHandovers(user.id);
  }

  @Post('handover/:id/confirm-receipt')
  confirmHandoverReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.confirmHandoverReceipt(user.id, id);
  }

  @Get('handovers')
  @Roles('ADMIN')
  listHandovers() {
    return this.service.listHandovers();
  }
}
