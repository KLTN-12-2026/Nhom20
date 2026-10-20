import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

export interface DoctorScheduleIdentity {
  id: number;
  code: string;
  fullName: string;
}

export interface DaySchedule {
  date: string;
  workType: 'HANH_CHINH' | 'NGHI_BU' | 'HANH_CHINH_VA_TRUC_DEM';
  administrativeHours: { start: string; end: string } | null;
  nightDutyHours: { start: string; end: string; overnight: boolean } | null;
}

export interface DoctorSchedule {
  doctor: DoctorScheduleIdentity;
  specialty: { id: number; name: string };
  published: boolean;
  dutyCount: number;
  restCount: number;
  // Ngày trong tuần không thể phân trực do ca đêm ở tuần liền kề.
  blockedDutyDays: number[];
  days: DaySchedule[];
}

export interface DepartmentScheduleResponse {
  unit: { id: number; name: string };
  weekStart: string;
  weekEnd: string;
  published: boolean;
  doctors: DoctorSchedule[];
}

export interface SaveDutySchedulePayload {
  weekStart: string; // YYYY-MM-DD
  lyDoThayDoi?: string;
  assignments: Array<{
    doctorId: number;
    dutyDates: string[]; // YYYY-MM-DD
  }>;
}

export const workSchedulesApi = {
  getMySchedule(weekStart: string) {
    return axiosClient
      .get<ApiResponse<DoctorSchedule>>('/work-schedules/me', {
        params: { weekStart },
      })
      .then((res) => res.data);
  },

  getDepartmentSchedule(weekStart: string) {
    return axiosClient
      .get<ApiResponse<DepartmentScheduleResponse>>(
        '/work-schedules/department',
        { params: { weekStart } },
      )
      .then((res) => res.data);
  },

  saveDraft(payload: SaveDutySchedulePayload) {
    return axiosClient
      .put<ApiResponse<{ assignmentCount: number }>>(
        '/work-schedules/department/draft',
        payload,
      )
      .then((res) => res.data);
  },

  publish(weekStart: string, lyDoThayDoi?: string) {
    return axiosClient
      .post<ApiResponse<{ assignmentCount: number }>>(
        '/work-schedules/department/publish',
        { weekStart, lyDoThayDoi },
      )
      .then((res) => res.data);
  },
};
