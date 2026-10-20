import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class ServiceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  specialtyId?: number;
}
