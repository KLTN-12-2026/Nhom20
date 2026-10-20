import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  AuditLogQuery,
  SystemLogItem,
} from '../types/audit-log.types';

export const auditLogApi = {
  async getAll(query: AuditLogQuery) {
    const response = await axiosClient.get<ApiResponse<SystemLogItem[]>>(
      '/audit-logs',
      { params: query },
    );
    return response.data;
  },
};
