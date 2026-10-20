import type {
  BacSi,
  CaLamViec,
  DonViLamViec,
  PhanCongCa,
  QuanLyDonVi,
  VaiTro,
} from '@prisma/client';

export interface DepartmentManagerAccess extends QuanLyDonVi {
  donViLamViec: DonViLamViec;
}

export interface DoctorScheduleIdentity extends BacSi {
  nguoiDung: { id: number; hoTen: string };
  chuyenKhoa: { id: number; tenChuyenKhoa: string };
}

export interface ReceptionistScheduleIdentity {
  id: number;
  maNhanVien: string;
  hoTen: string;
  nguoiDungId: number;
}

export interface ScheduleAssignment extends PhanCongCa {
  caLamViec: CaLamViec;
}

export interface WorkScheduleRepository {
  findDoctorByUserId(userId: number): Promise<DoctorScheduleIdentity | null>;
  findDoctorById(doctorId: number): Promise<DoctorScheduleIdentity | null>;
  findManagerAccess(
    userId: number,
    date: Date,
  ): Promise<DepartmentManagerAccess | null>;
  findDepartmentDoctors(specialtyId: number): Promise<DoctorScheduleIdentity[]>;
  findReceptionists(): Promise<ReceptionistScheduleIdentity[]>;
  findReceptionistDepartment(): Promise<{
    id: number;
    maDonVi: string;
    tenDonVi: string;
  } | null>;
  findDoctorRole(): Promise<VaiTro | null>;
  findReceptionistRole(): Promise<VaiTro | null>;
  findPharmacists(): Promise<ReceptionistScheduleIdentity[]>;
  findPharmacistByUserId(
    userId: number,
  ): Promise<ReceptionistScheduleIdentity | null>;
  findPharmacistDepartment(): Promise<{
    id: number;
    maDonVi: string;
    tenDonVi: string;
  } | null>;
  findPharmacistRole(): Promise<VaiTro | null>;
  findOrCreateNightShift(): Promise<CaLamViec>;
  findOrCreateMorningShift(): Promise<CaLamViec>;
  findOrCreateEveningShift(): Promise<CaLamViec>;
  findAssignments(
    userIds: number[],
    from: Date,
    to: Date,
  ): Promise<ScheduleAssignment[]>;
  hasPublishedAssignments(
    unitId: number,
    from: Date,
    to: Date,
  ): Promise<boolean>;
  saveDraft(input: {
    unitId: number;
    roleId: number;
    shiftId: number;
    managerId: number;
    from: Date;
    to: Date;
    assignments: Array<{ userId: number; date: Date }>;
    ghiChu?: string;
  }): Promise<void>;
  saveReceptionistDraft(input: {
    unitId: number;
    roleId: number;
    managerId: number;
    from: Date;
    to: Date;
    assignments: Array<{ userId: number; date: Date; shiftId: number }>;
    ghiChu?: string;
  }): Promise<void>;
  publish(
    unitId: number,
    from: Date,
    to: Date,
    managerId: number,
    onlyNightDuties?: boolean,
  ): Promise<number>;
  findNextShiftStaff(
    unitId: number,
    date: Date,
    shiftCode: string,
  ): Promise<
    Array<{
      nguoiDungId: number;
      nguoiDung: { id: number; hoTen: string };
      caLamViec: { maCa: string; tenCa: string };
    }>
  >;
}

export const WORK_SCHEDULE_REPOSITORY = Symbol('WORK_SCHEDULE_REPOSITORY');
