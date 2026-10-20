import { useCallback, useEffect, useState } from 'react';

import { useRealtimeEvent } from '@/hooks/use-realtime-event';

import { receptionApi } from '../api/reception.api';
import type { ReceptionDashboard } from '../types/reception.types';

export function useReceptionDashboard() {
  const [dashboard, setDashboard] = useState<ReceptionDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await receptionApi.getDashboard();
      setDashboard(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải dữ liệu tổng quan.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInBackground = useCallback(async () => {
    try {
      const response = await receptionApi.getDashboard();
      setDashboard(response.data);
    } catch (e) {
      // ignore
    }
  }, []);

  useRealtimeEvent('appointment.created', refreshInBackground);
  useRealtimeEvent('appointment.updated', refreshInBackground);
  useRealtimeEvent('queue.ticket_created', refreshInBackground);
  useRealtimeEvent('queue.updated', refreshInBackground);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { dashboard, isLoading, error, reload };
}
