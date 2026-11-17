import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoaiDichVu, TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class ServiceQueryDto {
  @ApiPropertyOptional({ enum: LoaiDichVu })
  @IsOptional()
  @IsEnum(LoaiDichVu)
  type?: LoaiDichVu;

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
