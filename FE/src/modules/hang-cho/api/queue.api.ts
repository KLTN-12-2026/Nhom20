import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type { QueueTicket } from '../types/queue.types';

interface QueueListData {
  items: QueueTicket[];
}

export const queueApi = {
  async getDoctorQueue() {
    const response = await axiosClient.get<ApiResponse<QueueListData>>(
      '/queues/doctor/me',
    );
    return response.data;
  },

  async getPublicQueue() {
    const response = await axiosClient.get<ApiResponse<QueueListData>>(
      '/queues/public',
    );
    return response.data;
  },

  async call(id: number) {
    const response = await axiosClient.post<ApiResponse<QueueTicket>>(
      `/queues/${id}/call`,
    );
    return response.data;
  },

  async skip(id: number) {
    const response = await axiosClient.post<ApiResponse<QueueTicket>>(
      `/queues/${id}/skip`,
    );
    return response.data;
  },

  async enterRoom(id: number) {
    const response = await axiosClient.post<ApiResponse<QueueTicket>>(
      `/queues/${id}/enter-room`,
    );
    return response.data;
  },
};
