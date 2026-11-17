import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';
import { serviceOrderApi } from '../api/service-order.api';
import type { ClinicalService, CreateServiceOrder, ServiceOrder } from '../types/service-order.types';

export function orderError(error: unknown) {
  const message = getApiErrorMessage(error, 'Không thể kết nối dịch vụ chỉ định. Vui lòng thử lại.');
  return Array.isArray(message) ? message.join('. ') : message;
}

export function useClinicalCatalog(search: string, page: number) {
  const [items, setItems] = useState<ClinicalService[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const queryKey = JSON.stringify([search, page, retry]);
  const [settledQuery, setSettledQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // Hủy tìm kiếm cũ để kết quả chậm không ghi đè từ khóa/trang mới.
    const timer = window.setTimeout(() => {
      serviceOrderApi.catalog(search, page, controller.signal).then((response) => {
        if (controller.signal.aborted) return;
        setItems(response.data);
        setTotal(response.meta?.total ?? response.data.length);
      }).catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(orderError(requestError));
      }).finally(() => {
        if (!controller.signal.aborted) { setSettledQuery(queryKey); setLoading(false); }
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, page, retry, queryKey]);
  // Ngay từ render đầu khi đổi trang, không gắn số trang mới lên kết quả cũ.
  return { items, total, loading: loading || settledQuery !== queryKey, error, reload: () => setRetry((value) => value + 1) };
}

export function useServiceOrders(visitId: number) {
  const { showToast } = useAppToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const lock = useRef(false);
  const latest = useRef(0);
  const request = useRef<AbortController | null>(null);
  const createKeys = useRef(new Map<string, string>());

  const reload = useCallback(async () => {
    const version = ++latest.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await serviceOrderApi.list(visitId, controller.signal);
      if (mounted.current && version === latest.current) setOrders(response.data);
    } catch (requestError) {
      if (mounted.current && version === latest.current && !controller.signal.aborted) setError(orderError(requestError));
    } finally {
      if (mounted.current && version === latest.current) setLoading(false);
    }
  }, [visitId]);

  const cancelReads = useCallback(() => {
    ++latest.current;
    request.current?.abort();
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; cancelReads(); };
  }, [reload, cancelReads]);

  useRealtimeEvent<{ visitId: number }>('service-order.updated', useCallback((event) => {
    if (event.visitId === visitId) void reload();
  }, [visitId, reload]));

  // Chỉ đồng bộ danh sách chỉ định, không gọi reload của phiếu khám đang soạn.
  const mutate = async (work: () => Promise<ApiResponse<ServiceOrder>>) => {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    try {
      const response = await work();
      if (!mounted.current) return null;
      ++latest.current;
      request.current?.abort();
      setOrders((current) => [...current.filter((order) => order.id !== response.data.id), response.data].sort((a, b) => a.id - b.id));
      setLoading(false);
      showToast(response.message, 'success');
      void reload();
      return response.data;
    } catch (requestError) {
      if (mounted.current) showToast(orderError(requestError), 'danger');
      return null;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const create = (input: Omit<CreateServiceOrder, 'idempotencyKey'>) => mutate(() => {
    const payload = { ...input, reason: input.reason.trim(), note: input.note?.trim() || undefined };
    const fingerprint = JSON.stringify(payload);
    // Giữ khóa khi timeout/mất phản hồi; thử lại cùng nội dung không tạo thêm bản ghi.
    let key = createKeys.current.get(fingerprint);
    if (!key) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      key = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      createKeys.current.set(fingerprint, key);
    }
    return serviceOrderApi.create(visitId, { ...payload, idempotencyKey: key }).then((response) => {
      createKeys.current.delete(fingerprint);
      return response;
    });
  });

  return { orders, loading, error, busy, reload, create,
    saveResult: (id: number, result: string) => mutate(() => serviceOrderApi.saveResult(id, result.trim())),
    cancel: (id: number, reason: string) => mutate(() => serviceOrderApi.cancel(id, reason.trim())),
  };
}
