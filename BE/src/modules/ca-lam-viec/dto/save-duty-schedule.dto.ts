import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DoctorDutyAssignmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  doctorId: number;

  @ApiProperty({ type: [String], example: ['2026-08-03', '2026-08-06'] })
  @IsArray()
  @IsDateString({}, { each: true })
  dutyDates: string[];
}

export class SaveDutyScheduleDto {
  @ApiProperty({ example: '2026-08-03' })
  @IsDateString()
  weekStart: string;

  @ApiPropertyOptional({ example: 'Bs A ốm, Bs B đi thay' })
  @IsOptional()
  @IsString()
  lyDoThayDoi?: string;

  @ApiProperty({ type: [DoctorDutyAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorDutyAssignmentDto)
  assignments: DoctorDutyAssignmentDto[];
}
