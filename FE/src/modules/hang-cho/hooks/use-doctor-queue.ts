import { useCallback, useEffect, useState } from 'react';

import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';

import { queueApi } from '../api/queue.api';
import type { QueueTicket } from '../types/queue.types';

export function useDoctorQueue() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const response = await queueApi.getDoctorQueue();
      setTickets(response.data.items);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải hàng đợi của bác sĩ'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeEvent<unknown>('queue.ticket_created', reload);
  useRealtimeEvent<unknown>('queue.updated', reload);
  useRealtimeEvent<unknown>('appointment.updated', reload);
  useRealtimeEvent<unknown>('appointment.created', reload);
  useRealtimeEvent<unknown>('connect', reload);

  return { tickets, isLoading, error, reload };
}
