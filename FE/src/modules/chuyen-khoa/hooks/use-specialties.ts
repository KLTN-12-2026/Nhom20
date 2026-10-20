import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { specialtyApi } from '../api/specialty.api';
import type {
  Specialty,
  SpecialtyPayload,
} from '../types/specialty.types';

export function useSpecialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await specialtyApi.getAll();
      setSpecialties(response.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải danh sách chuyên khoa'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialties();
  }, [loadSpecialties]);

  const createSpecialty = async (payload: SpecialtyPayload) => {
    const response = await specialtyApi.create(payload);
    await loadSpecialties();
    return response.message;
  };

  const updateSpecialty = async (
    id: number,
    payload: SpecialtyPayload,
  ) => {
    const response = await specialtyApi.update(id, payload);
    await loadSpecialties();
    return response.message;
  };

  const removeSpecialty = async (id: number) => {
    const response = await specialtyApi.remove(id);
    await loadSpecialties();
    return response.message;
  };

  return {
    specialties,
    isLoading,
    error,
    reload: loadSpecialties,
    createSpecialty,
    updateSpecialty,
    removeSpecialty,
  };
}
