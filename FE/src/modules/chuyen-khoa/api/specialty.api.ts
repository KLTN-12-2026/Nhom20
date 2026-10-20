import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  Specialty,
  SpecialtyPayload,
} from '../types/specialty.types';

export const specialtyApi = {
  async getAll() {
    const response =
      await axiosClient.get<ApiResponse<Specialty[]>>('/specialties');
    return response.data;
  },

  async create(payload: SpecialtyPayload) {
    const response = await axiosClient.post<ApiResponse<Specialty>>(
      '/specialties',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: SpecialtyPayload) {
    const response = await axiosClient.patch<ApiResponse<Specialty>>(
      `/specialties/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/specialties/${id}`,
    );
    return response.data;
  },
};
