import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserLockDto {
  @ApiProperty({ description: 'Khóa hoặc mở khóa tài khoản' })
  @IsBoolean()
  locked: boolean;
}
