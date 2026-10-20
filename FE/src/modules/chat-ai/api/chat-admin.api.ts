import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type { ChatAdminFilters, ChatAdminOverview, ChatAdminSession, ChatAdminSessionDetail } from '../types/chat-admin.types';

export async function getChatAdminOverview() {
  const response = await axiosClient.get<ApiResponse<ChatAdminOverview>>('/chat-ai/admin/overview');
  return response.data;
}

export async function getChatAdminSessions(filters: ChatAdminFilters) {
  // Backend chỉ nhận enum khi người dùng thật sự chọn một giá trị cụ thể.
  // Không gửi chuỗi rỗng của lựa chọn "Tất cả" để tránh lỗi DTO validation.
  const params = {
    page: filters.page,
    limit: filters.limit,
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.visitorType ? { visitorType: filters.visitorType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const response = await axiosClient.get<ApiResponse<ChatAdminSession[]>>('/chat-ai/admin/sessions', {
    params,
  });
  return response.data;
}

export async function getChatAdminSessionDetail(id: number) {
  const response = await axiosClient.get<ApiResponse<ChatAdminSessionDetail>>(`/chat-ai/admin/sessions/${id}`);
  return response.data;
}
