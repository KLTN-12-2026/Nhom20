export type MedicineStatus = 'DANG_HOAT_DONG' | 'NGUNG_HOAT_DONG';

export interface Medicine {
  id: number;
  maThuoc: string;
  tenThuoc: string;
  hoatChat: string | null;
  donViTinh: string;
  giaNhap: number;
  giaBan: number;
  soLuongTon: number;
  mucTonToiThieu: number;
  hanSuDung: string | null;
  nhaSanXuat?: string | null;
  moTa?: string | null;
  anhThuocUrl?: string | null;
  anhThuocPublicId?: string | null;
  trangThai: MedicineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineQuery {
  page?: number;
  limit?: number;
  search?: string;
  group?: string;
  status?: MedicineStatus;
  tab?: string;
}

export interface MedicineStats {
  total: number;
  lowStock: number;
  inventoryValue: number;
  activeIngredients: number;
  expiringSoon: number;
  expired?: number;
}

export interface MedicineListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: MedicineStats;
  groups: string[];
}

export interface CreateMedicineDto {
  name: string;
  group?: string;
  unit: string;
  salePrice: number;
  stock: number;
  minimumStock?: number;
  manufacturer?: string;
  description?: string;
  expiryDate?: string;
  imageUrl?: string;
  imagePublicId?: string;
  status?: MedicineStatus;
}

export type UpdateMedicineDto = Partial<CreateMedicineDto>;

export interface StockInDto {
  batchCode: string;
  quantity: number;
  purchasePrice: number;
  manufactureDate?: string;
  expiryDate: string;
  supplier: string;
  notes?: string;
}

export interface MedicineListResponse {
  message: string;
  data: Medicine[];
  meta: MedicineListMeta;
}

export interface MedicineResponse {
  message: string;
  data: Medicine;
}
