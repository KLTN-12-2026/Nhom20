import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamDaLieuDto {
  @IsOptional() @IsString() @MaxLength(300) viTriTonThuong?: string;
  @IsOptional() @IsString() @MaxLength(500) dacDiemTonThuong?: string;
  @IsOptional() @IsString() @MaxLength(100) kichThuoc?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  mucDoNgua?: number;
  @IsOptional() @IsString() @MaxLength(300) thoiGianXuatHien?: string;
  @IsOptional() @IsString() @MaxLength(500) yeuToKhoiPhat?: string;
  @IsOptional() @IsString() @MaxLength(500) tienSuDiUngDa?: string;
}
