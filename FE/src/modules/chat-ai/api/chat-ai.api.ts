import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  ChatMessagesResult,
  CreateChatSessionResult,
  SendChatMessageResult,
  ConfirmBookingResult,
} from '../types/chat-ai.types';

function guestHeaders(sessionToken?: string | null) {
  return sessionToken ? { 'X-Session-Token': sessionToken } : undefined;
}

export const chatAiApi = {
  async createSession(fresh = false) {
    const response = await axiosClient.post<ApiResponse<CreateChatSessionResult>>(
      '/chat-ai/sessions',
      { fresh },
    );
    return response.data;
  },

  async getMessages(sessionId: number, sessionToken?: string | null) {
    const response = await axiosClient.get<ApiResponse<ChatMessagesResult>>(
      `/chat-ai/sessions/${sessionId}/messages`,
      { headers: guestHeaders(sessionToken) },
    );
    return response.data;
  },

  async sendMessage(
    sessionId: number,
    content: string,
    sessionToken?: string | null,
  ) {
    const response = await axiosClient.post<ApiResponse<SendChatMessageResult>>(
      `/chat-ai/sessions/${sessionId}/messages`,
      { content },
      {
        headers: guestHeaders(sessionToken),
        // Đảm bảo đủ thời gian cho các luồng gọi tool phức tạp của AI
        timeout: 65_000,
      },
    );
    return response.data;
  },

  async confirmBooking(sessionId: number, draftId: number, sessionToken?: string | null) {
    const response = await axiosClient.post<ApiResponse<ConfirmBookingResult>>(
      `/chat-ai/sessions/${sessionId}/confirm-booking`,
      { draftId },
      { headers: guestHeaders(sessionToken) },
    );
    return response.data;
  },
};
