import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class StockInDto {
  @ApiProperty({ example: 'LOT-2026-001' })
  @IsString()
  @MaxLength(100)
  batchCode: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiProperty({ example: '2028-01-01' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 'Nhà cung cấp A' })
  @IsString()
  @MaxLength(200)
  supplier: string;

  @ApiPropertyOptional({ example: 'Nhập kho thông thường' })
  @IsOptional()
  @IsString()
  notes?: string;
}
