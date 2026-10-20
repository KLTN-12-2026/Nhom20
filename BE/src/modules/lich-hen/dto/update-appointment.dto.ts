import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiLichHen } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  specialtyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  doctorId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  appointmentTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ enum: TrangThaiLichHen })
  @IsOptional()
  @IsEnum(TrangThaiLichHen)
  status?: TrangThaiLichHen;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionOrCancellationReason?: string;
}
