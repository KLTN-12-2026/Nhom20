export type ServiceOrderStatus = 'CHO_THUC_HIEN' | 'DA_HOAN_TAT' | 'DA_HUY';

export interface ClinicalService {
  id: number;
  code: string;
  name: string;
  price: string;
}

export interface ServiceOrder {
  id: number;
  visitId: number;
  doctorId: number;
  service: Omit<ClinicalService, 'price'>;
  reason: string;
  note: string | null;
  status: ServiceOrderStatus;
  priceSnapshot: string;
  idempotencyKey: string;
  result: string | null;
  resultEnteredBy: number | null;
  resultedAt: string | null;
  cancellationReason: string | null;
  canceledBy: number | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  resultNotice: string;
}

export interface CreateServiceOrder {
  serviceId: number;
  reason: string;
  note?: string;
  idempotencyKey: string;
}
