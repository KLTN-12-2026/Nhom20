import { IsIn } from 'class-validator';

export class UpdateDoctorReviewStatusDto {
  @IsIn(['DA_HIEN_THI', 'DA_AN'])
  status!: 'DA_HIEN_THI' | 'DA_AN';
}
