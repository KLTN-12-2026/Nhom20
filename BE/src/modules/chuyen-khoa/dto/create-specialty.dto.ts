import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSpecialtyDto {
  @ApiProperty({ example: 'TIM_MACH' })
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã chuyên khoa chỉ gồm chữ in hoa, số và dấu gạch dưới',
  })
  code: string;

  @ApiProperty({ example: 'Tim mạch' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 300000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  examinationFee: number;

  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;
}
