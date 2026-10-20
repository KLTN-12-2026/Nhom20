import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  CreateUserPayload,
  ManagedUser,
  RoleOption,
  UpdateUserPayload,
} from '../types/user.types';

export const userApi = {
  async getAll(params?: { roleCode?: string; search?: string; status?: string }) {
    const response = await axiosClient.get<ApiResponse<ManagedUser[]>>('/users', { params });
    return response.data;
  },

  async getRoleOptions() {
    const response =
      await axiosClient.get<ApiResponse<RoleOption[]>>('/users/role-options');
    return response.data;
  },

  async create(payload: CreateUserPayload) {
    const response = await axiosClient.post<ApiResponse<ManagedUser>>(
      '/users',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: UpdateUserPayload) {
    const response = await axiosClient.patch<ApiResponse<ManagedUser>>(
      `/users/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/users/${id}`,
    );
    return response.data;
  },

  async uploadAvatar(id: number, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axiosClient.post<ApiResponse<ManagedUser>>(
      `/users/${id}/avatar`,
      formData,
      { timeout: 60000 },
    );
    return response.data;
  },

  async removeAvatar(id: number) {
    const response = await axiosClient.delete<ApiResponse<ManagedUser>>(
      `/users/${id}/avatar`,
    );
    return response.data;
  },
};
