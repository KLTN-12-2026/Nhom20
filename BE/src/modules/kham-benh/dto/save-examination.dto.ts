import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrescriptionLineDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  medicineId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: '1 viên/lần' })
  @IsString()
  @MaxLength(255)
  dosage: string;

  @ApiProperty({ example: '2 lần/ngày' })
  @IsString()
  @MaxLength(255)
  frequency: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number;

  @ApiPropertyOptional({ example: 'Uống sau ăn' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class SaveExaminationDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  vitals?: Record<string, string | number | null>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  specialtyContent?: Record<string, string | number | null>;

  // Dữ liệu chuyên khoa mới; Backend đối chiếu khoa từ lượt khám trước khi lưu JSONB.
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  specialtyData?: Record<string, string | number | null>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  icd10Code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conclusion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ type: [PrescriptionLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionLineDto)
  prescription?: PrescriptionLineDto[];
}
