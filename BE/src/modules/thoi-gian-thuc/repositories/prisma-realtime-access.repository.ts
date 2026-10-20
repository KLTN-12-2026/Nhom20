import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  DoctorRealtimeAccess,
  RealtimeAccessRepository,
} from './realtime-access.repository.interface';

@Injectable()
export class PrismaRealtimeAccessRepository implements RealtimeAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctorAccess(userId: number): Promise<DoctorRealtimeAccess | null> {
    return this.prisma.bacSi
      .findUnique({
        where: { nguoiDungId: userId },
        select: { id: true, chuyenKhoaId: true },
      })
      .then((doctor) =>
        doctor
          ? { doctorId: doctor.id, specialtyId: doctor.chuyenKhoaId }
          : null,
      );
  }
}
