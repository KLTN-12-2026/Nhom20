import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamSanPhuKhoaDto {
  @IsOptional() @IsString() @MaxLength(20) ngayDauKyKinhCuoi?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) tuanThai?: number;
  @IsOptional() @IsString() @MaxLength(1000) tienSuSanKhoa?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  soLanMangThai?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  soLanSinhCon?: number;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaSieuAm?: string;
  @IsOptional() @IsString() @MaxLength(500) trieuChungSanPhu?: string;
  @IsOptional() @IsString() @MaxLength(1000) ghiChuSanKhoa?: string;
}
