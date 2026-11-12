import { useCallback, useRef, useState } from 'react';

import {
  type ReceptionistDepartmentSchedule,
  type ReceptionistDutyPayload,
  receptionistSchedulesApi,
} from '../api/receptionist-schedules.api';

export function useReceptionistSchedules() {
  const [departmentSchedule, setDepartmentSchedule] =
    useState<ReceptionistDepartmentSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const fetchDepartmentSchedule = useCallback(async (weekStart: string) => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await receptionistSchedulesApi.getDepartmentSchedule(
        weekStart,
      );
      if (requestId === latestRequest.current) {
        setDepartmentSchedule(response.data);
      }
      return response.data;
    } catch (requestError) {
      if (requestId === latestRequest.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải lịch trực.',
        );
      }
      throw requestError;
    } finally {
      if (requestId === latestRequest.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const createAutoSchedule = useCallback(async (
    weekStart: string,
    lyDoThayDoi?: string,
  ) => {
    const response = await receptionistSchedulesApi.createAutoSchedule(
      weekStart,
      lyDoThayDoi,
    );
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
    error,
    fetchDepartmentSchedule,
    createAutoSchedule,
    saveAndPublish,
  };
}
