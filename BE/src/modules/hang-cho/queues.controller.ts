import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { QueuesService } from './queues.service';

@ApiTags('Queues')
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get('public')
  @ApiOkResponse()
  findPublicQueue() {
    return this.queuesService.findPublicQueue();
  }

  @Get('doctor/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @ApiOkResponse()
  findDoctorQueue(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.queuesService.findDoctorQueue(currentUser.id);
  }

  @Post(':id/call')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  call(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.queuesService.call(id, currentUser.id);
  }

  @Post(':id/skip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  skip(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.queuesService.skip(id, currentUser.id);
  }

  @Post(':id/enter-room')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  enterRoom(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.queuesService.enterRoom(id, currentUser.id);
  }
}
