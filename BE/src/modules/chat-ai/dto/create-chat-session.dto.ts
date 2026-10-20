import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatSessionDto {
  // Tieu de tuy chon de phan biet cac phien chat sau nay.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  // Cho phép giao diện bắt đầu phiên mới nhưng vẫn giữ lịch sử cũ để Admin tra cứu.
  @IsOptional()
  @IsBoolean()
  fresh?: boolean;
}
