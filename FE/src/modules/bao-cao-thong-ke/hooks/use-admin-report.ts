import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { adminReportsApi } from '../api/admin-reports.api';
import type { AdminReportOverview } from '../types/admin-report.types';

export function useAdminReport(from: string, to: string) {
  const [data, setData] = useState<AdminReportOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!from || !to) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminReportsApi.getOverview({ from, to });
      setData(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
