import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePatientAppointmentDto {
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
