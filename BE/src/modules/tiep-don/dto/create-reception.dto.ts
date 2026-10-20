import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GioiTinh, MucDoDiUng, MucDoUuTienTiepDon } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// DỊ ỨNG BỆNH NHÂN
export class CreatePatientAllergyDto {
  @ApiProperty({ example: 'Amoxicillin' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  agent: string;

  @ApiPropertyOptional({ example: 'Nổi mề đay sau khi dùng' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reaction?: string;

  @ApiPropertyOptional({ enum: MucDoDiUng })
  @IsOptional()
  @IsEnum(MucDoDiUng)
  severity?: MucDoDiUng;
}

export class CreateReceptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  patientId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GioiTinh })
  @IsOptional()
  @IsEnum(GioiTinh)
  gender?: GioiTinh;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  identityNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  healthInsuranceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional({ type: [CreatePatientAllergyDto] })
  @IsOptional()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreatePatientAllergyDto)
  allergies?: CreatePatientAllergyDto[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  specialtyId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  doctorId: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  symptoms?: string;

  @ApiPropertyOptional({ enum: MucDoUuTienTiepDon })
  @IsOptional()
  @IsEnum(MucDoUuTienTiepDon)
  priority?: MucDoUuTienTiepDon;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
