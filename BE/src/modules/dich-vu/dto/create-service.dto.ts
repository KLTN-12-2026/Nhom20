import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoaiDichVu, TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  // Dữ liệu cũ chưa phân loại giữ NULL; không tự suy luận theo tên hoặc chuyên khoa.
  @ApiPropertyOptional({ enum: LoaiDichVu, nullable: true })
  @IsOptional()
  @IsEnum(LoaiDichVu)
  type?: LoaiDichVu | null;

  @ApiProperty({ example: '6001' })
  @IsString()
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'Mã dịch vụ chỉ gồm chữ số' })
  code: string;

  @ApiProperty({ example: 'Khám Nội tổng quát' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 200000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  specialtyId?: number;

  @ApiPropertyOptional({ example: 30 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;
}
