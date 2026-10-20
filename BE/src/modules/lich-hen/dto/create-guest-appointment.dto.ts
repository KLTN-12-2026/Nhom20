import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GioiTinh } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGuestAppointmentDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^[0-9+][0-9\s.-]{7,19}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phoneNumber: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: GioiTinh })
  @IsEnum(GioiTinh)
  gender: GioiTinh;

  @ApiPropertyOptional({ example: 'nguyenvanan@gmail.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  specialtyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  doctorId?: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ example: '08:30' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Giờ hẹn phải có định dạng HH:mm',
  })
  appointmentTime: string;

  @ApiProperty({ example: 'Đau đầu kéo dài' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
