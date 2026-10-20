import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveHandoverDto {
  @ApiPropertyOptional({ example: 8, description: 'ID người nhận bàn giao' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receiverId?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Tiền mặt kiểm đếm thực tế',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualCash?: number;

  @ApiPropertyOptional({ example: 'Khách thanh toán nhầm mệnh giá.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  differenceReason?: string;

  @ApiPropertyOptional({ type: [String], example: ['DA_KIEM_DEM_TIEN_MAT'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  checklist?: string[];

  @ApiPropertyOptional({ example: 'Bàn giao đủ chứng từ.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
