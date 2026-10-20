import { Transform, Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ChatAdminQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value ?? '').trim())
  search?: string;

  @IsOptional()
  @IsIn(['GUEST', 'PATIENT'])
  visitorType?: 'GUEST' | 'PATIENT';

  @IsOptional()
  @IsIn(['DANG_HOAT_DONG', 'DA_KET_THUC'])
  status?: 'DANG_HOAT_DONG' | 'DA_KET_THUC';

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 12;
}
