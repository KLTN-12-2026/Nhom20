import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  PrescriptionWarning,
  SaveExaminationDto,
  WarningAiSuggestionResult,
} from '../types/examination.types';

export const examinationApi = {
  getVisit(visitId: number) {
    return axiosClient.get<ApiResponse<any>>(`/examinations/visit/${visitId}`);
  },

  saveDraft(visitId: number, dto: SaveExaminationDto) {
    return axiosClient.post<ApiResponse<any>>(`/examinations/visit/${visitId}/draft`, dto);
  },

  complete(visitId: number, dto: SaveExaminationDto) {
    return axiosClient.post<ApiResponse<any>>(`/examinations/visit/${visitId}/complete`, dto);
  },

  getWarnings(visitId: number) {
    return axiosClient.get<ApiResponse<PrescriptionWarning[]>>(
      `/examinations/visit/${visitId}/prescription-warnings`,
    );
  },

  resolveWarning(
    warningId: number,
    payload: { status: 'DA_XAC_NHAN' | 'DA_BO_QUA'; reason?: string },
  ) {
    return axiosClient.patch<ApiResponse<PrescriptionWarning>>(
      `/examinations/prescription-warnings/${warningId}`,
      payload,
    );
  },

  // Lấy 1-3 thuốc Gemini xếp hạng từ danh sách Backend đã kiểm tra an toàn.
  getWarningAiSuggestions(visitId: number, warningId: number) {
    return axiosClient.get<ApiResponse<WarningAiSuggestionResult>>(
      `/examinations/visit/${visitId}/ai-explain`,
      { params: { warningId } },
    );
  },

  getActiveVisit() {
    return axiosClient.get<ApiResponse<any>>('/examinations/doctor/me/active');
  },

  getHistory(params: { page?: number; limit?: number; search?: string; from?: string; to?: string }) {
    return axiosClient.get<ApiResponse<{ items: any[]; total: number }>>(
      '/examinations/history/me',
      { params },
    );
  },
};
