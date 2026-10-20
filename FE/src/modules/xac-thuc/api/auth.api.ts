import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  AuthenticatedUser,
  LoginPayload,
  LoginResult,
} from '../types/auth.types';

export const authApi = {
  async login(payload: LoginPayload) {
    const response = await axiosClient.post<ApiResponse<LoginResult>>(
      '/auth/login',
      payload,
    );
    return response.data;
  },

  async getMe() {
    const response =
      await axiosClient.get<ApiResponse<AuthenticatedUser>>('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await axiosClient.post<ApiResponse<{ message: string }>>('/auth/password/forgot', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await axiosClient.post<ApiResponse<{ message: string }>>('/auth/password/reset', { token, password });
    return response.data;
  },

  async confirmEmail(token: string) {
    const response = await axiosClient.get<ApiResponse<{ message: string }>>('/auth/verify-email/confirm', { params: { token } });
    return response.data;
  },
};
