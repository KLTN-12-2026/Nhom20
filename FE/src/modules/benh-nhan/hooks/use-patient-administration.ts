import { useState } from 'react';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';

import { patientAdministrationApi } from '../api/patient-administration.api';
import type { PatientAdministrativeInfo } from '../types/patient-administration.types';

export function usePatientAdministration() {
  const { showToast } = useAppToast();
  const [record, setRecord] = useState<PatientAdministrativeInfo | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const openRecord = async (id: number) => {
    setLoadingId(id);
    try {
      const response = await patientAdministrationApi.findOne(id);
      setRecord(response.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải thông tin bệnh nhân'), 'danger');
    } finally {
      setLoadingId(null);
    }
  };

  return { record, loadingId, openRecord, closeRecord: () => setRecord(null) };
}
