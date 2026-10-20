import { useCallback, useState } from 'react';
import {
  type DepartmentScheduleResponse,
  type DoctorSchedule,
  type SaveDutySchedulePayload,
  workSchedulesApi,
} from '../api/work-schedules.api';

export function useWorkSchedules() {
  const [departmentSchedule, setDepartmentSchedule] = useState<DepartmentScheduleResponse | null>(null);
  const [mySchedule, setMySchedule] = useState<DoctorSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartmentSchedule = useCallback(async (weekStart: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await workSchedulesApi.getDepartmentSchedule(weekStart);
      setDepartmentSchedule(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tải lịch làm việc');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMySchedule = useCallback(async (weekStart: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await workSchedulesApi.getMySchedule(weekStart);
      setMySchedule(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tải lịch làm việc');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAndPublish = useCallback(async (payload: SaveDutySchedulePayload) => {
    // 1. Lưu bản nháp.
    await workSchedulesApi.saveDraft(payload);
    // 2. Công bố.
    return workSchedulesApi.publish(payload.weekStart, payload.lyDoThayDoi);
  }, []);

  return {
    departmentSchedule,
    mySchedule,
    isLoading,
    error,
    fetchDepartmentSchedule,
    fetchMySchedule,
    saveAndPublish,
  };
}
