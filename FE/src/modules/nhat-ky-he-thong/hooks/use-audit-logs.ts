import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { auditLogApi } from '../api/audit-log.api';
import type {
  AuditLogQuery,
  SystemLogItem,
} from '../types/audit-log.types';

interface AuditLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useAuditLogs(query: AuditLogQuery) {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [meta, setMeta] = useState<AuditLogMeta>({
    total: 0,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await auditLogApi.getAll(query);
      setLogs(response.data);
      setMeta({
        total: response.meta?.total ?? response.data.length,
        page: response.meta?.page ?? query.page ?? 1,
        limit: response.meta?.limit ?? query.limit ?? 20,
        totalPages: response.meta?.totalPages ?? 1,
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể tải nhật ký hệ thống',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLogs(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadLogs]);

  return { logs, meta, isLoading, error, reload: loadLogs };
}
