import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { doctorApi } from '../api/doctor.api';
import type {
  CreateDoctorPayload,
  Doctor,
  UpdateDoctorPayload,
} from '../types/doctor.types';

export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await doctorApi.getAll();
      setDoctors(response.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải danh sách bác sĩ'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const createDoctor = async (payload: CreateDoctorPayload) => {
    const response = await doctorApi.create(payload);
    await loadDoctors();
    return response;
  };

  const updateDoctor = async (id: number, payload: UpdateDoctorPayload) => {
    const response = await doctorApi.update(id, payload);
    await loadDoctors();
    return response;
  };

  const removeDoctor = async (id: number) => {
    const response = await doctorApi.remove(id);
    await loadDoctors();
    return response.message;
  };

  return {
    doctors,
    isLoading,
    error,
    reload: loadDoctors,
    createDoctor,
    updateDoctor,
    removeDoctor,
  };
}
