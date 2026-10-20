import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  ChangePasswordPayload,
  ManagedUser,
  UpdateProfilePayload,
} from '../types/user.types';

export const profileApi = {
  async getProfile() {
    const response =
      await axiosClient.get<ApiResponse<ManagedUser>>('/profile');
    return response.data;
  },

  async updateProfile(payload: UpdateProfilePayload) {
    const response = await axiosClient.patch<ApiResponse<ManagedUser>>(
      '/profile',
      payload,
    );
    return response.data;
  },

  async changePassword(payload: ChangePasswordPayload) {
    const response = await axiosClient.patch<ApiResponse<null>>(
      '/profile/password',
      payload,
    );
    return response.data;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axiosClient.post<ApiResponse<ManagedUser>>(
      '/profile/avatar',
      formData,
      { timeout: 60000 },
    );
    return response.data;
  },

  async removeAvatar() {
    const response =
      await axiosClient.delete<ApiResponse<ManagedUser>>('/profile/avatar');
    return response.data;
  },
};
