import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { patientPortalApi } from '../api/patient-portal.api';
import type { PatientVisit } from '../types/patient-portal.types';

export function usePatientPortal(enabled: boolean) {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true); setError(null);
    try { const response = await patientPortalApi.getMyVisits(); setVisits(response.data); }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Không thể tải lịch sử khám')); }
    finally { setIsLoading(false); }
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { visits, isLoading, error, reload };
}
