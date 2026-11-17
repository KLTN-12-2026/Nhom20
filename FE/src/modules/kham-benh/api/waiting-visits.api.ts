import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';
export interface WaitingVisitItem { id: number; code: string; patientName: string; patientCode: string; pendingOrders: number }
export const waitingVisitsApi = {
  async list(page: number, signal: AbortSignal) {
    return (await axiosClient.get<ApiResponse<WaitingVisitItem[]>>('/examinations/waiting/me', { params: { page, limit: 10 }, signal })).data;
  },
  async transition(id: number, action: 'wait' | 'resume') {
    return (await axiosClient.post<ApiResponse<{ id: number; status: string }>>(`/examinations/waiting/${id}/${action}`)).data;
  },
};
