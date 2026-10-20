import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type { PatientVisit } from '../types/patient-portal.types';

export const patientPortalApi = {
  async getMyVisits() {
    const response = await axiosClient.get<ApiResponse<PatientVisit[]>>('/patient-portal/me/visits');
    return response.data;
  },
  async createReview(visitId: number, payload: { rating: number; comment?: string }) {
    const response = await axiosClient.post<ApiResponse<unknown>>(`/patient-portal/me/visits/${visitId}/review`, payload);
    return response.data;
  },
};
