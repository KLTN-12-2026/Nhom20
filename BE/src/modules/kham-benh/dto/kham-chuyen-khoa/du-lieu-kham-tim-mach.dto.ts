import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamTimMachDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) spO2?: number;
  @IsOptional() @IsString() @MaxLength(500) dacDiemDauNguc?: string;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaDienTim?: string;
  @IsOptional() @IsString() @MaxLength(500) tiengTimBatThuong?: string;
  @IsOptional() @IsString() @MaxLength(300) phuNgoaiVi?: string;
  @IsOptional() @IsString() @MaxLength(500) yeuToNguyCo?: string;
  @IsOptional() @IsString() @MaxLength(500) tienSuTimMach?: string;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaSieuAm?: string;
}
