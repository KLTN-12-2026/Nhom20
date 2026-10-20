import { useCallback, useEffect, useState } from 'react';

import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';

import { receptionApi } from '../api/reception.api';
import type {
  CreateReceptionPayload,
  ReceptionPatient,
  ReceptionRecord,
} from '../types/reception.types';

export function useReception() {
  const [patients, setPatients] = useState<ReceptionPatient[]>([]);
  const [queue, setQueue] = useState<ReceptionRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const reloadQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const response = await receptionApi.getQueue();
      setQueue(response.data.items);
      setQueueError(null);
    } catch (error) {
      setQueue([]);
      setQueueError(
        getApiErrorMessage(error, 'Không thể tải hàng đợi tiếp đón'),
      );
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    void reloadQueue();
  }, [reloadQueue]);

  useRealtimeEvent<unknown>('appointment.updated', reloadQueue);
  useRealtimeEvent<unknown>('queue.ticket_created', reloadQueue);
  useRealtimeEvent<unknown>('queue.updated', reloadQueue);

  const searchPatients = async (search: string) => {
    setIsSearching(true);
    try {
      const response = await receptionApi.searchPatients(search);
      setPatients(response.data);
      return response;
    } catch (error) {
      setPatients([]);
      throw new Error(
        getApiErrorMessage(error, 'Không thể tìm kiếm bệnh nhân'),
      );
    } finally {
      setIsSearching(false);
    }
  };

  const createReception = async (payload: CreateReceptionPayload) => {
    const response = await receptionApi.create(payload);
    await reloadQueue();
    return response;
  };

  return {
    patients,
    queue,
    isSearching,
    isLoadingQueue,
    queueError,
    searchPatients,
    createReception,
    reloadQueue,
  };
}
