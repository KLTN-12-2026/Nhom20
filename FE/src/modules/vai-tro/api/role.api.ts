import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  ManagedRole,
  RoleConfiguration,
  RolePayload,
} from '../types/role.types';

export const roleApi = {
  async getConfiguration() {
    const response =
      await axiosClient.get<ApiResponse<RoleConfiguration>>('/roles');
    return response.data;
  },

  async create(payload: RolePayload) {
    const response = await axiosClient.post<ApiResponse<ManagedRole>>(
      '/roles',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: RolePayload) {
    const response = await axiosClient.patch<ApiResponse<ManagedRole>>(
      `/roles/${id}`,
      payload,
    );
    return response.data;
  },

  async savePermissions(id: number, permissionIds: number[]) {
    const response = await axiosClient.put<ApiResponse<ManagedRole>>(
      `/roles/${id}/permissions`,
      { permissionIds },
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/roles/${id}`,
    );
    return response.data;
  },
};
