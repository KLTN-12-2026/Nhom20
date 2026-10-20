import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'nguoidung@example.com' })
  @IsEmail()
  email!: string;
}
