import { useCallback, useEffect, useState } from 'react';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { waitingVisitsApi, type WaitingVisitItem } from '../api/waiting-visits.api';

export function useWaitingVisits(enabled: boolean) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [items, setItems] = useState<WaitingVisitItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useRealtimeEvent('queue.updated', reload);
  useRealtimeEvent('service-order.updated', reload);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    waitingVisitsApi.list(page, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setItems(response.data); setTotal(response.meta?.total ?? response.data.length);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(err, 'Không thể tải lượt chờ kết quả'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, page, version]);
  return { items, page, setPage, total, loading, error, reload };
}
