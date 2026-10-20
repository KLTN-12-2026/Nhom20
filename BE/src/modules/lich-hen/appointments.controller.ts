import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { CreatePatientAppointmentDto } from './dto/create-patient-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsService } from './appointments.service';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('guest')
  @ApiCreatedResponse()
  createGuest(@Body() dto: CreateGuestAppointmentDto) {
    return this.appointmentsService.createGuest(dto);
  }

  @Post('patient')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT', 'BENH_NHAN')
  @ApiCreatedResponse()
  createPatient(
    @Body() dto: CreatePatientAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.createByPatient(currentUser.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOkResponse()
  findAll(@Query() query: AppointmentQueryDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get('doctor/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @ApiOkResponse()
  findDoctorAppointments(
    @Query() query: AppointmentQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.findDoctorAppointments(
      currentUser.id,
      query,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOkResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiCreatedResponse()
  createByStaff(
    @Body() dto: CreateGuestAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.createByStaff(dto, currentUser.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOkResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.update(id, dto, currentUser.id);
  }

  @Post(':id/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiCreatedResponse()
  checkIn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.checkIn(id, currentUser.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECEPTIONIST')
  @ApiOkResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.appointmentsService.remove(id, currentUser.id);
  }
}
