import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  // Gioi han noi dung de tranh gui prompt qua dai sang Gemini.
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
