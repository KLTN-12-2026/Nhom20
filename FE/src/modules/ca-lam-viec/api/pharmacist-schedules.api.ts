import { axiosClient } from '@/services/axios-client';
export const pharmacistSchedulesApi = {
  getMine: (weekStart: string) => axiosClient.get<any>('/pharmacist-schedules/me', { params: { weekStart } }).then((r) => r.data),
  getDepartment: (weekStart: string) => axiosClient.get<any>('/pharmacist-schedules/department', { params: { weekStart } }).then((r) => r.data),
  saveDraft: (payload: any) => axiosClient.put<any>('/pharmacist-schedules/department/draft', payload).then((r) => r.data),
  publish: (weekStart: string, lyDoThayDoi?: string) => axiosClient.post<any>('/pharmacist-schedules/department/publish', { weekStart, lyDoThayDoi }).then((r) => r.data),
};
