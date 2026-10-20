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
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { ReceptionsService } from './receptions.service';

@ApiTags('Receptions')
@Controller('receptions')
@UseGuards(JwtAuthGuard, RolesGuard)
// Cho phép mã vai trò Lễ tân/Thu ngân cũ và mới cùng dùng nghiệp vụ tiếp đón.
@Roles('ADMIN', 'RECEPTIONIST', 'TIEP_DON_THU_NGAN')
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  @Get('patients')
  // Chức năng: Quản lý bệnh nhân Thu ngân — tìm theo họ tên/số điện thoại
  @ApiOkResponse()
  searchPatients(@Query('search') search = '') {
    return this.receptionsService.searchPatients(search);
  }

  @Get('admin-patients')
  @Roles('ADMIN', 'DOCTOR')
  searchAllPatients(
    @Query('search') search = '',
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.receptionsService.searchAllPatients(search, currentUser);
  }

  @Get('patients/:id')
  @Roles('ADMIN', 'DOCTOR')
  findPatientRecord(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.receptionsService.findPatientRecord(id, currentUser);
  }

  @Get('queue')
  // Chức năng: Tiếp đón — lấy hàng đợi trong ngày
  @ApiOkResponse()
  findTodayQueue() {
    return this.receptionsService.findTodayQueue();
  }

  @Get('tickets/:queueNumber')
  // Đọc lại phiếu từ CSDL để đường dẫn in vẫn chạy sau khi tải lại trang.
  findTicket(@Param('queueNumber') queueNumber: string) {
    return this.receptionsService.findTicket(queueNumber);
  }

  @Get('follow-ups')
  // Lễ tân theo dõi bệnh nhân có ngày tái khám hôm nay hoặc ngày mai.
  @ApiOkResponse()
  findFollowUps() {
    return this.receptionsService.findFollowUps();
  }

  @Get('dashboard')
  @ApiOkResponse()
  getDashboard() {
    return this.receptionsService.getDashboard();
  }

  @Post()
  // Chức năng: Tiếp đón — tạo hồ sơ và phiếu tiếp đón
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateReceptionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.receptionsService.create(dto, currentUser.id);
  }
}
