import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';

import { appointmentApi } from '../api/appointment.api';
import type {
  Appointment,
  AppointmentQuery,
  AppointmentStats,
} from '../types/appointment.types';

export function useDoctorAppointments(query: AppointmentQuery) {
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
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentApi.getDoctorAppointments(query);
      setAppointments(response.data.items);
      setStats(response.data.stats);
      setTotal(response.meta?.total ?? response.data.items.length);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể tải lịch khám của bác sĩ',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useRealtimeEvent<unknown>('appointment.updated', loadAppointments);
  useRealtimeEvent<unknown>('queue.ticket_created', loadAppointments);

  return {
    appointments,
    stats,
    total,
    totalPages,
    isLoading,
    error,
    reload: loadAppointments,
  };
}
