import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type { PatientAdministrativeInfo } from '../types/patient-administration.types';

export const patientAdministrationApi = {
  async findOne(id: number) {
    const response = await axiosClient.get<ApiResponse<PatientAdministrativeInfo>>(
      `/receptions/patients/${id}/administrative`,
    );
    return response.data;
  },
};
