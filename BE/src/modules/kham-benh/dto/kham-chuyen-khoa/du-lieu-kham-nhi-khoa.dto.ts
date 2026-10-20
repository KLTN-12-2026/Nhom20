import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamNhiKhoaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(300)
  canNang?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(250)
  chieuCao?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  chuViVong?: number;
  @IsOptional() @IsString() @MaxLength(300) tinhTrangDinhDuong?: string;
  @IsOptional() @IsString() @MaxLength(500) tiemChung?: string;
  @IsOptional() @IsString() @MaxLength(500) phatTrienVanDong?: string;
  @IsOptional() @IsString() @MaxLength(500) trieuChungTre?: string;
  @IsOptional() @IsString() @MaxLength(200) loaiSua?: string;
}
