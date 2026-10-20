import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DuLieuKhamTaiMuiHongDto {
  @IsOptional() @IsString() @MaxLength(300) viTriTrieuChung?: string;
  @IsOptional() @IsString() @MaxLength(1000) ketQuaNoiSoi?: string;
  @IsOptional() @IsString() @MaxLength(300) mucDoNghe?: string;
  @IsOptional() @IsString() @MaxLength(500) testThinhLuc?: string;
  @IsOptional() @IsString() @MaxLength(500) tinhTrangAmigdal?: string;
  @IsOptional() @IsString() @MaxLength(500) tinhTrangXoangMui?: string;
  @IsOptional() @IsString() @MaxLength(1000) ghiChuKham?: string;
}
