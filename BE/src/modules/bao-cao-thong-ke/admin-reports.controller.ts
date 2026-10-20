import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('Admin reports')
@Controller('admin-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Quản trị viên xem báo cáo thống kê theo khoảng ngày',
  })
  @ApiOkResponse()
  getOverview(@Query() query: AdminReportQueryDto) {
    return this.reportsService.getOverview(query);
  }
}
