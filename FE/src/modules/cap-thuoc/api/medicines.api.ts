import { axiosClient } from '@/services/axios-client';

export interface MedicineOption { id: number; name: string; unit: string; }
export interface MedicineBatchRow {
  id: number; batchCode: string; medicineId: number; medicine: string; unit: string;
  stock: number; expiryDate: string; supplier: string; status: string;
}

export const medicinesApi = {
  list(params?: { search?: string; limit?: number }) {
    return axiosClient.get<{ data: Array<{ id: number; tenThuoc: string; donViTinh: string }> }>('/medicines', { params });
  },
  batches(params?: { search?: string }) {
    return axiosClient.get<{ data: MedicineBatchRow[] }>('/medicines/batches', { params });
  },
  stockIn(id: number, data: { batchCode: string; quantity: number; purchasePrice: number; manufactureDate?: string; expiryDate: string; supplier: string; notes?: string }) {
    return axiosClient.post(`/medicines/${id}/stock-in`, data);
  },
};
