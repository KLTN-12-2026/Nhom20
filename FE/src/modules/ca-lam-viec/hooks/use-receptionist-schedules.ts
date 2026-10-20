import { useCallback, useState } from 'react';

import {
  type ReceptionistDepartmentSchedule,
  type ReceptionistDutyPayload,
  receptionistSchedulesApi,
} from '../api/receptionist-schedules.api';

export function useReceptionistSchedules() {
  const [departmentSchedule, setDepartmentSchedule] =
    useState<ReceptionistDepartmentSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDepartmentSchedule = useCallback(async (weekStart: string) => {
    setIsLoading(true);
    try {
      const response = await receptionistSchedulesApi.getDepartmentSchedule(
        weekStart,
      );
      setDepartmentSchedule(response.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAutoSchedule = useCallback(async (weekStart: string) => {
    const response = await receptionistSchedulesApi.createAutoSchedule(weekStart);
    return response.data;
  }, []);

  const saveAndPublish = useCallback(async (payload: ReceptionistDutyPayload) => {
    // Lưu nháp trước, chỉ công bố sau khi Backend đã kiểm tra đủ người trực.
    await receptionistSchedulesApi.saveDraft(payload);
    return receptionistSchedulesApi.publish(payload.weekStart, payload.lyDoThayDoi);
  }, []);

  return {
    departmentSchedule,
    isLoading,
    fetchDepartmentSchedule,
    createAutoSchedule,
    saveAndPublish,
  };
}
