import {
  DichVu,
  Prisma,
  TrangThaiHoaDon,
  TrangThaiLuotKham,
} from '@prisma/client';

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');
export type ServiceOrder = Prisma.ChiDinhDichVuGetPayload<{
  include: {
    dichVu: { select: { id: true; maDichVu: true; tenDichVu: true } };
  };
}>;
export interface OrderVisit {
  id: number;
  bacSiId: number | null;
  trangThai: TrangThaiLuotKham;
  bacSi: { nguoiDungId: number } | null;
  hoaDon: { trangThai: TrangThaiHoaDon } | null;
}

// Các thao tác này cùng một transaction giữ khóa lượt khám; service quyết định nghiệp vụ.
export interface ServiceOrderTransaction {
  visit: OrderVisit | null;
  findByKey(key: string): Promise<ServiceOrder | null>;
  findById(id: number): Promise<ServiceOrder | null>;
  findService(id: number): Promise<DichVu | null>;
  list(): Promise<ServiceOrder[]>;
  create(data: Prisma.ChiDinhDichVuUncheckedCreateInput): Promise<ServiceOrder>;
  updatePending(
    id: number,
    data: Prisma.ChiDinhDichVuUncheckedUpdateInput,
  ): Promise<ServiceOrder>;
  audit(userId: number, action: string, order: ServiceOrder): Promise<void>;
}

export interface ServiceOrderRepository {
  catalog(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ items: DichVu[]; total: number }>;
  findById(id: number): Promise<ServiceOrder | null>;
  withVisit<T>(
    visitId: number,
    work: (tx: ServiceOrderTransaction) => Promise<T>,
  ): Promise<T>;
}
