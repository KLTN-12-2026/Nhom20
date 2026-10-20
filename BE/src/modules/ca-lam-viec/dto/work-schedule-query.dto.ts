import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class WorkScheduleQueryDto {
  @ApiProperty({ example: '2026-08-03', description: 'Ngày thứ Hai đầu tuần' })
  @IsDateString()
  weekStart: string;

  @ApiPropertyOptional({ example: 'Đổi ca đột xuất' })
  @IsOptional()
  @IsString()
  lyDoThayDoi?: string;
}
