import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

export interface ReceptionistScheduleDay {
  workType: 'HANH_CHINH' | 'NGHI_BU' | 'HANH_CHINH_VA_TRUC_DEM';
}

export interface ReceptionistDepartmentSchedule {
  unit: { id: number; name: string };
  published: boolean;
  receptionists: Array<{
    staff: { id: number; code: string; fullName: string };
    days: ReceptionistScheduleDay[];
  }>;
}

export interface ReceptionistDutyPayload {
  weekStart: string;
  lyDoThayDoi?: string;
  assignments: Array<{ staffId: number; dutyDates: string[] }>;
}

export const receptionistSchedulesApi = {
  getDepartmentSchedule(weekStart: string) {
    return axiosClient
      .get<ApiResponse<ReceptionistDepartmentSchedule>>(
        '/receptionist-schedules/department',
        { params: { weekStart } },
      )
      .then((response) => response.data);
  },

  createAutoSchedule(weekStart: string) {
    return axiosClient
      .post<ApiResponse<ReceptionistDutyPayload>>(
        '/receptionist-schedules/department/auto-schedule',
        { weekStart },
      )
      .then((response) => response.data);
  },

  saveDraft(payload: ReceptionistDutyPayload) {
    return axiosClient
      .put<ApiResponse<{ assignmentCount: number }>>(
        '/receptionist-schedules/department/draft',
        payload,
      )
      .then((response) => response.data);
  },

  publish(weekStart: string, lyDoThayDoi?: string) {
    return axiosClient
      .post<ApiResponse<{ assignmentCount: number }>>(
        '/receptionist-schedules/department/publish',
        { weekStart, lyDoThayDoi },
      )
      .then((response) => response.data);
  },
};
