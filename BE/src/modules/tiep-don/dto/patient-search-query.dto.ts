import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatientSearchQueryDto {
  @IsString()
  @IsOptional()
  @MinLength(0)
  @MaxLength(100)
  search: string;
}
