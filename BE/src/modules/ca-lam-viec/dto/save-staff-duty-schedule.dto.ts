import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StaffDutyAssignmentDto {
  @ApiProperty({ example: 12, description: 'ID hồ sơ nhân viên' })
  @Type(() => Number)
  @IsInt()
  staffId: number;

  @ApiProperty({ type: [String], example: ['2026-08-03', '2026-08-06'] })
  @IsArray()
  @IsDateString({}, { each: true })
  dutyDates: string[];
}

export class SaveStaffDutyScheduleDto {
  @ApiProperty({ example: '2026-08-03', description: 'Ngày thứ Hai đầu tuần' })
  @IsDateString()
  weekStart: string;

  @ApiPropertyOptional({ example: 'Đổi ca đột xuất' })
  @IsOptional()
  @IsString()
  lyDoThayDoi?: string;

  @ApiProperty({ type: [StaffDutyAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StaffDutyAssignmentDto)
  assignments: StaffDutyAssignmentDto[];
}
