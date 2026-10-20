import { Inject, Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

import type { RealtimeGateway } from './realtime.gateway';
import {
  REALTIME_ACCESS_REPOSITORY,
  type RealtimeAccessRepository,
} from './repositories/realtime-access.repository.interface';

@Injectable()
export class RealtimeService {
  private gateway?: RealtimeGateway;

  constructor(
    @Inject(REALTIME_ACCESS_REPOSITORY)
    private readonly accessRepository: RealtimeAccessRepository,
  ) {}

  bindGateway(gateway: RealtimeGateway) {
    this.gateway = gateway;
  }

  findDoctorAccess(userId: number) {
    return this.accessRepository.findDoctorAccess(userId);
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.getServer()?.to(room).emit(event, payload);
  }

  private getServer(): Server | undefined {
    return this.gateway?.server;
  }
}
