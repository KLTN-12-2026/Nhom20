import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Amoxicillin 500mg' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Kháng sinh' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  group?: string;

  @ApiProperty({ example: 'Viên' })
  @IsString()
  @MaxLength(50)
  unit: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ example: 2450 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 'Dược Hậu Giang' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;

  @ApiPropertyOptional({
    example: 'Thuốc kháng sinh điều trị nhiễm khuẩn.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1618392348/sample.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'demo/sample' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagePublicId?: string;

  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;
}
