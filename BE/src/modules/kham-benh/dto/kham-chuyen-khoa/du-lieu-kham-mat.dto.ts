import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DuLieuKhamMatDto {
  @IsOptional() @IsString() @MaxLength(50) thiLucMatTrai?: string;
  @IsOptional() @IsString() @MaxLength(50) thiLucMatPhai?: string;
  @IsOptional() @IsString() @MaxLength(50) nhanAp?: string;
  @IsOptional() @IsString() @MaxLength(500) khamDayMat?: string;
  @IsOptional() @IsString() @MaxLength(500) khamKhucXa?: string;
  @IsOptional() @IsString() @MaxLength(500) testSacGiac?: string;
  @IsOptional() @IsString() @MaxLength(1000) ghiChuKham?: string;
}
