import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/services/axios-client';
import { serviceApi } from '../api/service.api';
import type { MedicalService, ServicePayload, ServiceStatus } from '../types/service.types';

export function useServices(status?: ServiceStatus) {
  const [services, setServices] = useState<MedicalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setIsLoading(true); setError(null); try { const response = await serviceApi.getAll({ status }); setServices(response.data); } catch (requestError) { setError(getApiErrorMessage(requestError, 'Không thể tải danh sách dịch vụ')); } finally { setIsLoading(false); } }, [status]);
  useEffect(() => { void reload(); }, [reload]);
  const createService = async (payload: ServicePayload) => { const response = await serviceApi.create(payload); await reload(); return response.message; };
  const updateService = async (id: number, payload: ServicePayload) => { const response = await serviceApi.update(id, payload); await reload(); return response.message; };
  const removeService = async (id: number) => { const response = await serviceApi.remove(id); await reload(); return response.message; };
  return { services, isLoading, error, reload, createService, updateService, removeService };
}
