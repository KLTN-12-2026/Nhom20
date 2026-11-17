import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';
import type { ClinicalService, CreateServiceOrder, ServiceOrder } from '../types/service-order.types';

export const serviceOrderApi = {
  async catalog(search: string, page: number, signal?: AbortSignal) {
    return (await axiosClient.get<ApiResponse<ClinicalService[]>>('/service-orders/catalog', {
      params: { search: search.trim() || undefined, page, limit: 10 }, signal,
    })).data;
  },
  async list(visitId: number, signal?: AbortSignal) {
    return (await axiosClient.get<ApiResponse<ServiceOrder[]>>(`/service-orders/visit/${visitId}`, { signal })).data;
  },
  async create(visitId: number, payload: CreateServiceOrder) {
    return (await axiosClient.post<ApiResponse<ServiceOrder>>(`/service-orders/visit/${visitId}`, payload)).data;
  },
  async saveResult(id: number, result: string) {
    return (await axiosClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/result`, { result })).data;
  },
  async cancel(id: number, reason: string) {
    return (await axiosClient.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/cancel`, { reason })).data;
  },
};
