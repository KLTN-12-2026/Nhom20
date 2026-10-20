import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { roleApi } from '../api/role.api';
import type {
  ManagedRole,
  PermissionModule,
  RolePayload,
} from '../types/role.types';

export function useRoles() {
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await roleApi.getConfiguration();
      setRoles(response.data.roles);
      setModules(response.data.modules);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể tải danh sách vai trò và phân quyền',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const createRole = async (payload: RolePayload) => {
    const response = await roleApi.create(payload);
    await loadConfiguration();
    return response;
  };

  const updateRole = async (id: number, payload: RolePayload) => {
    const response = await roleApi.update(id, payload);
    await loadConfiguration();
    return response;
  };

  const savePermissions = async (id: number, permissionIds: number[]) => {
    const response = await roleApi.savePermissions(id, permissionIds);
    await loadConfiguration();
    return response;
  };

  const removeRole = async (id: number) => {
    const response = await roleApi.remove(id);
    await loadConfiguration();
    return response;
  };

  return {
    roles,
    modules,
    isLoading,
    error,
    reload: loadConfiguration,
    createRole,
    updateRole,
    savePermissions,
    removeRole,
  };
}
