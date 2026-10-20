import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { userApi } from '../api/user.api';
import type {
  CreateUserPayload,
  ManagedUser,
  RoleOption,
  UpdateUserPayload,
} from '../types/user.types';

export function useUsers(params?: { roleCode?: string; search?: string; status?: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsStr = JSON.stringify(params);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        userApi.getAll(params ? JSON.parse(paramsStr) : undefined),
        userApi.getRoleOptions(),
      ]);
      setUsers(usersResponse.data);
      setRoleOptions(rolesResponse.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải danh sách người dùng'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [paramsStr]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = async (payload: CreateUserPayload) => {
    const response = await userApi.create(payload);
    await loadUsers();
    return response;
  };

  const updateUser = async (id: number, payload: UpdateUserPayload) => {
    const response = await userApi.update(id, payload);
    await loadUsers();
    return response;
  };

  const removeUser = async (id: number) => {
    const response = await userApi.remove(id);
    await loadUsers();
    return response.message;
  };

  const uploadUserAvatar = async (id: number, file: File) => {
    const response = await userApi.uploadAvatar(id, file);
    await loadUsers();
    return response;
  };

  const removeUserAvatar = async (id: number) => {
    const response = await userApi.removeAvatar(id);
    await loadUsers();
    return response;
  };

  return {
    users,
    roleOptions,
    isLoading,
    error,
    reload: loadUsers,
    createUser,
    updateUser,
    removeUser,
    uploadUserAvatar,
    removeUserAvatar,
  };
}
