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
import { Permissions } from '../../common/auth/permissions.decorator';
import { SaveDutyScheduleDto } from './dto/save-duty-schedule.dto';
import { WorkScheduleQueryDto } from './dto/work-schedule-query.dto';
import { WorkSchedulesService } from './work-schedules.service';

@ApiTags('Work schedules')
@Controller('work-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
export class WorkSchedulesController {
  constructor(private readonly service: WorkSchedulesService) {}

  @Get('me')
  @Permissions('LICH_LAM_VIEC.VIEW')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findMine(user.id, query.weekStart);
  }

  @Get('department')
  @Permissions('LICH_LAM_VIEC.VIEW')
  findDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkScheduleQueryDto,
  ) {
    return this.service.findDepartment(user.id, query.weekStart);
  }

  @Put('department/draft')
  @Permissions('LICH_LAM_VIEC.UPDATE')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveDutyScheduleDto,
  ) {
    return this.service.saveDraft(user.id, dto);
  }

  @Post('department/publish')
  @Permissions('LICH_LAM_VIEC.UPDATE')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkScheduleQueryDto,
  ) {
    return this.service.publish(user.id, dto.weekStart, dto.lyDoThayDoi);
  }
}
