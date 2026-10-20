import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type { AdminReportOverview } from '../types/admin-report.types';

export const adminReportsApi = {
  async getOverview(params: { from: string; to: string }) {
    const response = await axiosClient.get<ApiResponse<AdminReportOverview>>(
      '/admin-reports/overview',
      { params },
    );
    return response.data;
  },
};
