import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BatchAllocationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  batchId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class DispenseLineDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  prescriptionItemId: number;

  @ApiProperty({ type: [BatchAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchAllocationDto)
  batches: BatchAllocationDto[];
}

export class DispensePrescriptionDto {
  @ApiProperty({ type: [DispenseLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DispenseLineDto)
  items: DispenseLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
