import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

export type DoctorReviewStatus = 'CHO_DUYET' | 'DA_HIEN_THI' | 'DA_AN';

export interface DoctorReview {
  id: number;
  rating: number;
  comment: string | null;
  status: DoctorReviewStatus;
  createdAt: string;
  patient: { id: number; name: string; code: string };
  doctor: { id: number; name: string; specialty: string | null };
  visit: { id: number; code: string };
}

export const doctorReviewsApi = {
  async getAll(params: { search?: string; status?: DoctorReviewStatus | '' }) {
    const response = await axiosClient.get<ApiResponse<DoctorReview[]>>('/doctor-reviews', { params });
    return response.data;
  },
  async updateStatus(id: number, status: Exclude<DoctorReviewStatus, 'CHO_DUYET'>) {
    const response = await axiosClient.patch<ApiResponse<DoctorReview>>(`/doctor-reviews/${id}/status`, { status });
    return response.data;
  },
};
