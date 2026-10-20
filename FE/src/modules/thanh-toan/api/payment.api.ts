import { axiosClient } from '@/services/axios-client';
import type { ApiResponse } from '@/types/api-response.types';

export const paymentApi = {
  async getInvoices() {
    const response = await axiosClient.get<ApiResponse<any>>('/thanh-toan/hoa-don');
    return response.data;
  },

  async collectCash(id: number, amount: number) {
    const response = await axiosClient.post<ApiResponse<any>>(`/thanh-toan/hoa-don/${id}/tien-mat`, { soTien: amount });
    return response.data;
  },
  async collectTransfer(id: number, amount: number, reference?: string) {
    const response = await axiosClient.post<ApiResponse<any>>(`/thanh-toan/hoa-don/${id}/chuyen-khoan`, { soTien: amount, maGiaoDich: reference });
    return response.data;
  },
};
