import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

import type {
  Medicine,
  MedicineQuery,
  CreateMedicineDto,
  UpdateMedicineDto,
  StockInDto,
  MedicineListMeta,
} from '../types/medicine.type';

type MedicineListApiResponse = ApiResponse<Medicine[]> & {
  meta: MedicineListMeta;
};

export const medicineApi = {
  async getAll(params?: MedicineQuery) {
    const response = await axiosClient.get<MedicineListApiResponse>('/medicines', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await axiosClient.get<ApiResponse<Medicine>>(
      `/medicines/${id}`,
    );
    return response.data;
  },

  async create(payload: CreateMedicineDto) {
    const response = await axiosClient.post<ApiResponse<Medicine>>(
      '/medicines',
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: UpdateMedicineDto) {
    const response = await axiosClient.patch<ApiResponse<Medicine>>(
      `/medicines/${id}`,
      payload,
    );
    return response.data;
  },

  async stockIn(id: number, payload: StockInDto) {
    const response = await axiosClient.post<ApiResponse<Medicine>>(
      `/medicines/${id}/stock-in`,
      payload,
    );
    return response.data;
  },

  async uploadImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axiosClient.post<ApiResponse<Medicine>>(
      `/medicines/${id}/image`,
      formData,
      { timeout: 60000 },
    );
    return response.data;
  },

  async removeImage(id: number) {
    const response = await axiosClient.delete<ApiResponse<Medicine>>(
      `/medicines/${id}/image`,
    );
    return response.data;
  },

  async remove(id: number) {
    const response = await axiosClient.delete<ApiResponse<{ id: number }>>(
      `/medicines/${id}`,
    );
    return response.data;
  },
};
