import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

export interface Notification {
  id: number;
  nguoiDungId: number;
  tieuDe: string;
  noiDung: string;
  loaiThongBao: string;
  duongDan: string | null;
  daDoc: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export const notificationsApi = {
  getMyNotifications(page = 1, limit = 10) {
    return axiosClient
      .get<ApiResponse<NotificationsResponse>>('/notifications', { params: { page, limit } })
      .then((res) => res.data.data);
  },

  markAsRead(id: number) {
    return axiosClient
      .put<ApiResponse<void>>(`/notifications/${id}/read`)
      .then((res) => res.data);
  },

  markAllAsRead() {
    return axiosClient
      .put<ApiResponse<void>>('/notifications/read-all')
      .then((res) => res.data);
  },
};
