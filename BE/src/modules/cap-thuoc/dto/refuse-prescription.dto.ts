import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RefusePrescriptionDto {
  @ApiProperty({ example: 'Thuốc kê đơn hiện tạm hết hàng.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
