import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  CreateReceptionPayload,
  FollowUpReminderGroups,
  ReceptionDashboard,
  ReceptionPatient,
  ReceptionRecord,
} from '../types/reception.types';
import type { ReceptionTicketData } from '../types/reception-ticket.types';

export const receptionApi = {
  async searchPatients(search: string) {
    const response = await axiosClient.get<ApiResponse<ReceptionPatient[]>>(
      '/receptions/patients',
      { params: { search } },
    );
    return response.data;
  },

  async getQueue() {
    const response = await axiosClient.get<
      ApiResponse<{ items: ReceptionRecord[] }>
    >('/receptions/queue');
    return response.data;
  },

  async getTicket(queueNumber: string) {
    const response = await axiosClient.get<ApiResponse<ReceptionTicketData>>(
      `/receptions/tickets/${encodeURIComponent(queueNumber)}`,
    );
    return response.data;
  },

  async getFollowUps() {
    const response = await axiosClient.get<ApiResponse<FollowUpReminderGroups>>(
      '/receptions/follow-ups',
    );
    return response.data;
  },

  async getDashboard() {
    const response = await axiosClient.get<ApiResponse<ReceptionDashboard>>(
      '/receptions/dashboard',
    );
    return response.data;
  },

  async create(payload: CreateReceptionPayload) {
    const response = await axiosClient.post<ApiResponse<ReceptionRecord>>(
      '/receptions',
      payload,
    );
    return response.data;
  },
};
