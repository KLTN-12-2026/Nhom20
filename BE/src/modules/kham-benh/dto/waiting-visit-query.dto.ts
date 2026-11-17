import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// Phân trang lượt chờ của chính bác sĩ; không nhận doctorId từ client.
export class WaitingVisitQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 10;
}
