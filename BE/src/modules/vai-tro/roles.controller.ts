import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles and permissions')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOkResponse()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.create(dto, currentUser.id);
  }

  @Patch(':id')
  @ApiOkResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.update(id, dto, currentUser.id);
  }

  @Put(':id/permissions')
  @ApiOkResponse()
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.updatePermissions(id, dto, currentUser.id);
  }

  @Delete(':id')
  @ApiOkResponse()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.remove(id, currentUser.id);
  }
}
