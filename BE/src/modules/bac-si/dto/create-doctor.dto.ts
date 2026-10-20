import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiChung } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 'BS-001' })
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Mã bác sĩ chỉ gồm chữ in hoa, số, gạch ngang và gạch dưới',
  })
  code: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  specialtyId: number;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+][0-9\s.-]{7,19}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phoneNumber?: string;

  @ApiProperty({ example: 'bacsi@smartclinic.vn' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  initialPassword: string;

  @ApiPropertyOptional({ example: 'Thạc sĩ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  academicDegree?: string;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TrangThaiChung })
  @IsOptional()
  @IsEnum(TrangThaiChung)
  status?: TrangThaiChung;
}
