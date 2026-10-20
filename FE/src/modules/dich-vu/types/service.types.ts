export type ServiceStatus = 'DANG_HOAT_DONG' | 'NGUNG_HOAT_DONG';

export interface MedicalService {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number | null;
  status: ServiceStatus;
  specialty: { id: number; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  specialtyId?: number;
  estimatedMinutes?: number;
  status?: ServiceStatus;
}
