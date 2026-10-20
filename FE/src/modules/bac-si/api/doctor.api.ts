import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  CreateDoctorPayload,
  Doctor,
  UpdateDoctorPayload,
} from '../types/doctor.types';

export const doctorApi = {
  async getAll() {
    const response = await axiosClient.get<ApiResponse<Doctor[]>>('/doctors');
    return response.data;
  },

  async getAvailable(date: string, specialtyId?: number) {
    const response = await axiosClient.get<ApiResponse<Doctor[]>>(
      '/doctors/available',
      { params: { date, specialtyId } },
    );
    return response.data;
  },

  async create(payload: CreateDoctorPayload) {
    const response = await axiosClient.post<ApiResponse<Doctor>>(
      '/doctors',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: UpdateDoctorPayload) {
    const response = await axiosClient.patch<ApiResponse<Doctor>>(
      `/doctors/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/doctors/${id}`,
    );
    return response.data;
  },
};
