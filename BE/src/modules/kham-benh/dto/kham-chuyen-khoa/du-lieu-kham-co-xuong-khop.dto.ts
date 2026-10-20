import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DuLieuKhamCoXuongKhopDto {
  @IsOptional() @IsString() @MaxLength(300) viTriDau?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  mucDoDau?: number;
  @IsOptional() @IsString() @MaxLength(500) khaNangVanDong?: string;
  @IsOptional() @IsString() @MaxLength(500) suLienKhop?: string;
  @IsOptional() @IsString() @MaxLength(500) testDacBiet?: string;
  @IsOptional() @IsString() @MaxLength(500) tienSuChanThuong?: string;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaXQuang?: string;
}
