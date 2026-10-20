import { ApiProperty } from '@nestjs/swagger';
import { TrangThaiXuLyCanhBao } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolvePrescriptionWarningDto {
  @ApiProperty({
    enum: [TrangThaiXuLyCanhBao.DA_XAC_NHAN, TrangThaiXuLyCanhBao.DA_BO_QUA],
  })
  @IsEnum(TrangThaiXuLyCanhBao)
  status: 'DA_XAC_NHAN' | 'DA_BO_QUA';

  @ApiProperty({
    required: false,
    description: 'Bắt buộc khi bỏ qua cảnh báo nghiêm trọng.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
