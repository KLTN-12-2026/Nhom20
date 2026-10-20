import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';

import { appointmentApi } from '../api/appointment.api';
import type {
  Appointment,
  AppointmentQuery,
  AppointmentStats,
  AppointmentUpdatePayload,
  GuestAppointmentPayload,
} from '../types/appointment.types';

export function useAppointments(query: AppointmentQuery) {
  const latestRequestId = useRef(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    checkedIn: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentApi.getAll(query);
      if (requestId !== latestRequestId.current) return;
      setAppointments(response.data.items);
      setStats(response.data.stats);
      setTotal(response.meta?.total ?? response.data.items.length);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (requestError) {
      if (requestId !== latestRequestId.current) return;
      setError(
        getApiErrorMessage(requestError, 'Không thể tải danh sách lịch hẹn'),
      );
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useRealtimeEvent<unknown>('appointment.created', loadAppointments);
  useRealtimeEvent<unknown>('appointment.updated', loadAppointments);

  const createAppointment = async (payload: GuestAppointmentPayload) => {
    const response = await appointmentApi.create(payload);
    await loadAppointments();
    return response;
  };

  const updateAppointment = async (
    id: number,
    payload: AppointmentUpdatePayload,
  ) => {
    const response = await appointmentApi.update(id, payload);
    await loadAppointments();
    return response;
  };

  const removeAppointment = async (id: number) => {
    const response = await appointmentApi.remove(id);
    await loadAppointments();
    return response;
  };

  const checkInAppointment = async (id: number) => {
    const response = await appointmentApi.checkIn(id);
    await loadAppointments();
    return response;
  };

  return {
    appointments,
    stats,
    total,
    totalPages,
    isLoading,
    error,
    reload: loadAppointments,
    createAppointment,
    updateAppointment,
    removeAppointment,
    checkInAppointment,
  };
}
