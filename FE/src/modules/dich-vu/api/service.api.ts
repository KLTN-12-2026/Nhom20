import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';
import type { MedicalService, ServicePayload, ServiceStatus } from '../types/service.types';

export const serviceApi = {
  async getAll(params: { search?: string; specialtyId?: number; status?: ServiceStatus } = {}) { const response = await axiosClient.get<ApiResponse<MedicalService[]>>('/services', { params }); return response.data; },
  async create(payload: ServicePayload) { const response = await axiosClient.post<ApiResponse<MedicalService>>('/services', payload); return response.data; },
  async update(id: number, payload: ServicePayload) { const response = await axiosClient.patch<ApiResponse<MedicalService>>(`/services/${id}`, payload); return response.data; },
  async remove(id: number) { const response = await axiosClient.delete<ApiResponse<{ id: number }>>(`/services/${id}`); return response.data; },
};
