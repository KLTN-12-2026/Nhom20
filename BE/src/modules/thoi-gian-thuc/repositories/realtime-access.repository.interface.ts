export interface DoctorRealtimeAccess {
  doctorId: number;
  specialtyId: number;
}

export interface RealtimeAccessRepository {
  findDoctorAccess(userId: number): Promise<DoctorRealtimeAccess | null>;
}

export const REALTIME_ACCESS_REPOSITORY = Symbol('REALTIME_ACCESS_REPOSITORY');
