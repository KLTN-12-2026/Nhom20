import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email của nhân viên hoặc số điện thoại của bệnh nhân',
    example: 'admin@smartclinic.local',
  })
  @IsString()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
