import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { SaveServiceResultDto } from './dto/save-service-result.dto';
import { CancelServiceOrderDto } from './dto/cancel-service-order.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';
import { ServiceOrdersService } from './service-orders.service';

// Dùng quyền truy cập hồ sơ hiện có; service kiểm tra tiếp bác sĩ sở hữu lượt khám.
@ApiTags('Service orders')
@ApiBearerAuth()
@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
@Permissions('BENH_AN.VIEW')
export class ServiceOrdersController {
  constructor(private readonly service: ServiceOrdersService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Danh mục cận lâm sàng đang hoạt động' })
  catalog(@Query() query: ServiceOrderQueryDto) {
    return this.service.catalog(query);
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'Chỉ định của lượt khám được phân công' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
  ) {
    return this.service.list(user.id, visitId);
  }

  @Post('visit/:visitId')
  @ApiOperation({
    summary: 'Xác nhận chỉ định và chụp đơn giá, chống gửi trùng',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitId', ParseIntPipe) visitId: number,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.service.create(user.id, visitId, dto);
  }

  @Patch(':id/result')
  @ApiOperation({ summary: 'Bác sĩ nhập kết quả mô phỏng' })
  result(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveServiceResultDto,
  ) {
    return this.service.saveResult(user.id, id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Hủy chỉ định chưa thực hiện, lưu lý do và người hủy',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelServiceOrderDto,
  ) {
    return this.service.cancel(user.id, id, dto);
  }
}
