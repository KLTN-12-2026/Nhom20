import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiNguoiDung } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 'nguoidung@smartclinic.vn' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+][0-9\s.-]{7,19}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phoneNumber?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: ['RECEPTIONIST'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleCodes: string[];

  @ApiPropertyOptional({ enum: TrangThaiNguoiDung })
  @IsOptional()
  @IsEnum(TrangThaiNguoiDung)
  status?: TrangThaiNguoiDung;
}
