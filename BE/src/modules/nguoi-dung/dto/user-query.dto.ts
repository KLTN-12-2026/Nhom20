import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiNguoiDung } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UserQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ enum: TrangThaiNguoiDung })
  @IsOptional()
  @IsEnum(TrangThaiNguoiDung)
  status?: TrangThaiNguoiDung;
}
