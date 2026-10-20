import {
  Body,
  Controller,
  Get,
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
import { SaveStaffDutyScheduleDto } from './dto/save-staff-duty-schedule.dto';
import { WorkScheduleQueryDto } from './dto/work-schedule-query.dto';
import { WorkSchedulesService } from './work-schedules.service';

@ApiTags('Pharmacist schedules')
@Controller('pharmacist-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACIST')
export class PharmacistSchedulesController {
  constructor(private readonly service: WorkSchedulesService) {}

  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findPharmacistMine(user.id, query.weekStart);
  }

  @Get('department')
  findDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findPharmacistDepartment(user.id, query.weekStart);
  }

  @Put('department/draft')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveStaffDutyScheduleDto,
  ) {
    return this.service.savePharmacistDraft(user.id, dto);
  }

  @Post('department/publish')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.publishPharmacist(user.id, dto.weekStart, dto.lyDoThayDoi);
  }
}
