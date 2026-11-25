import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Permissions } from '../../common/auth/permissions.decorator';
import { WaitingVisitsService } from './waiting-visits.service';
import { WaitingVisitQueryDto } from './dto/waiting-visit-query.dto';

// API chờ/tiếp tục theo ID lượt khám, không dùng API lượt đang hoạt động.
@ApiTags('Examinations')
@Controller('examinations/waiting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
@Permissions('BENH_AN.VIEW')
export class WaitingVisitsController {
  constructor(private readonly service: WaitingVisitsService) {}
  @Get('me')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WaitingVisitQueryDto,
  ) {
    return this.service.list(user.id, query);
  }
  @Post(':visitId/wait')
  wait(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) id: number,
  ) {
    return this.service.transition(user.id, id, 'CHO_KET_QUA');
  }
  @Post(':visitId/resume')
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) id: number,
  ) {
    return this.service.transition(user.id, id, 'DA_VAO_PHONG');
  }
}
