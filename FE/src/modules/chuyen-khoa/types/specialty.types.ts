export type SpecialtyStatus = 'DANG_HOAT_DONG' | 'NGUNG_HOAT_DONG';

export interface Specialty {
  id: number;
  code: string;
  name: string;
  description: string | null;
  examinationFee: number;
  status: SpecialtyStatus;
  doctorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialtyPayload {
  code: string;
  name: string;
  description?: string;
  examinationFee: number;
  status: SpecialtyStatus;
}
