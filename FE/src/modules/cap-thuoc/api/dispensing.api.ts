import { axiosClient } from '@/services/axios-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api-response.types';

import type { DispensePrescriptionDto, DispensingPrescription } from '../types/dispensing.types';

export const dispensingApi = {
  getPending(params?: { search?: string }) {
    return axiosClient.get<PaginatedResponse<DispensingPrescription>>('/dispensing/pending', { params });
  },

  getProcessing(params?: { search?: string; page?: number; limit?: number }) {
    return axiosClient.get<PaginatedResponse<DispensingPrescription>>('/dispensing/processing', { params });
  },

  getHistory(params?: { search?: string; page?: number; limit?: number }) {
    return axiosClient.get<PaginatedResponse<DispensingPrescription>>('/dispensing/history', { params });
  },

  findOne(id: number) {
    return axiosClient.get<ApiResponse<DispensingPrescription>>(`/dispensing/${id}`);
  },

  accept(id: number) {
    return axiosClient.post<ApiResponse<DispensingPrescription>>(`/dispensing/${id}/accept`);
  },

  refuse(id: number, reason: string) {
    return axiosClient.post<ApiResponse<DispensingPrescription>>(`/dispensing/${id}/refuse`, { reason });
  },

  dispense(id: number, dto: DispensePrescriptionDto) {
    return axiosClient.post<ApiResponse<DispensingPrescription>>(`/dispensing/${id}/dispense`, dto);
  },
};
