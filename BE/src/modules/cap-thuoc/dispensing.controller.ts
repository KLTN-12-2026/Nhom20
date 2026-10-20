import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { DispensingService } from './dispensing.service';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';
import { RefusePrescriptionDto } from './dto/refuse-prescription.dto';

@ApiTags('Dispensing')
@Controller('dispensing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACIST')
export class DispensingController {
  constructor(private readonly service: DispensingService) {}

  @Get('pending')
  findPending(@Query() query: PrescriptionQueryDto) {
    return this.service.findPending(query);
  }

  @Get('history')
  findHistory(@Query() query: PrescriptionQueryDto) {
    return this.service.findHistory(query);
  }

  @Get('processing')
  findProcessing(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PrescriptionQueryDto,
  ) {
    return this.service.findProcessing(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.accept(id, user.id);
  }

  @Post(':id/refuse')
  refuse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefusePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.refuse(id, dto, user.id);
  }

  @Post(':id/dispense')
  dispense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DispensePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.dispense(id, dto, user.id);
  }
}
