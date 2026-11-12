import { ApiPropertyOptional } from '@nestjs/swagger';
import { GioiTinh } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[\p{Lu}\p{Lt}][\p{L}]*(?:\s+[\p{Lu}\p{Lt}][\p{L}]*)*$/u, {
    message: 'Họ tên chỉ gồm chữ cái và khoảng trắng, mỗi từ phải viết hoa chữ cái đầu (ví dụ: Nguyễn Văn A)',
  })
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+][0-9\s.-]{7,19}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: GioiTinh })
  @IsOptional()
  @IsEnum(GioiTinh)
  gender?: GioiTinh;

  @ApiPropertyOptional({ example: '1995-08-15' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  identityNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  healthInsuranceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;
}
