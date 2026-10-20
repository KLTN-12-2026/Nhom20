import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MedicineQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;

  @ApiPropertyOptional({ example: 'ALL' })
  @IsOptional()
  @IsString()
  tab?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
