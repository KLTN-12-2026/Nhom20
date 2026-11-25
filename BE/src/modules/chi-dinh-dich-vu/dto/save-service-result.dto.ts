import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Kết quả văn bản do bác sĩ nhập thủ công để mô phỏng quy trình.
export class SaveServiceResultDto {
  @ApiProperty({ maxLength: 10000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  result: string;
}
