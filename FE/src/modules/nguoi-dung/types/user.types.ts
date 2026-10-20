export type UserStatus =
  | 'DANG_HOAT_DONG'
  | 'NGUNG_HOAT_DONG'
  | 'BI_KHOA';

export interface UserRole {
  id: number;
  code: string;
  name: string;
}

export interface RoleOption extends UserRole {
  description: string | null;
}

export interface ManagedUser {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  gender: 'NAM' | 'NU' | 'KHAC' | null;
  dateOfBirth: string | null;
  identityNumber: string | null;
  address: string | null;
  healthInsuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: UserStatus;
  roles: UserRole[];
  linkedProfiles: {
    doctor: boolean;
    staff: boolean;
    patient: boolean;
  };
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  roleCodes: string[];
  status: UserStatus;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export interface UpdateProfilePayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  gender?: 'NAM' | 'NU' | 'KHAC';
  dateOfBirth?: string;
  identityNumber?: string;
  address?: string;
  healthInsuranceNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
