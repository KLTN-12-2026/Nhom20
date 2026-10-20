import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ConfirmChatBookingDto {
  // Chỉ xác nhận bản nháp thuộc đúng phiên trò chuyện hiện tại.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  draftId!: number;
}
