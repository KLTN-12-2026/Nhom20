export type DoctorStatus = 'DANG_HOAT_DONG' | 'NGUNG_HOAT_DONG';

export interface Doctor {
  id: number;
  userId: number;
  code: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  academicDegree: string | null;
  experienceYears: number;
  description: string | null;
  status: DoctorStatus;
  specialty: {
    id: number;
    code: string;
    name: string;
  };
  examinationCount: number;
  ratingCount: number;
  averageRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDoctorPayload {
  code: string;
  fullName: string;
  specialtyId: number;
  phoneNumber?: string;
  email: string;
  initialPassword: string;
  academicDegree?: string;
  experienceYears: number;
  description?: string;
  status: DoctorStatus;
}

export type UpdateDoctorPayload = Partial<CreateDoctorPayload>;
