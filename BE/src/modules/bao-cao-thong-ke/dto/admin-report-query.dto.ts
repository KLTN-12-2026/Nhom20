import { IsDateString, IsOptional } from 'class-validator';

export class AdminReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
