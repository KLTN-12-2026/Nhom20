import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class HuyHoaDonDto {
  @IsString({ message: 'Lý do hủy phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  @MinLength(3, { message: 'Lý do hủy phải có ít nhất 3 ký tự' })
  @MaxLength(500, { message: 'Lý do hủy không được vượt quá 500 ký tự' })
  lyDoHuy: string;
}
