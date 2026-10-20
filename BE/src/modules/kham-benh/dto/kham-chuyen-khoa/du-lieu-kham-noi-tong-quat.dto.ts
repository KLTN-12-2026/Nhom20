import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamNoiTongQuatDto {
  @IsOptional() @IsString() @MaxLength(300) tinhTrangChung?: string;
  @IsOptional() @IsString() @MaxLength(500) trieuChungChinh?: string;
  @IsOptional() @IsString() @MaxLength(500) trieuChungPhu?: string;
  @IsOptional() @IsString() @MaxLength(200) viTriDau?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  mucDoDau?: number;
  @IsOptional() @IsString() @MaxLength(500) tienSuDungThuoc?: string;
  @IsOptional() @IsString() @MaxLength(500) khamBungNguc?: string;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaXetNghiem?: string;
}
