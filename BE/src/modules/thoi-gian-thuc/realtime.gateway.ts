import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import type { JwtPayload } from '../../common/auth/authenticated-user.type';
import { AuthService } from '../xac-thuc/auth.service';
import { RealtimeService } from './realtime.service';
import { REALTIME_ROOMS } from './realtime.events';

interface RealtimeSocketData {
  userId?: number;
  roles?: string[];
}

type RealtimeSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  RealtimeSocketData
>;

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async handleConnection(client: RealtimeSocket) {
    try {
      const token = this.readToken(client);
      if (!token) {
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.authService.validateUser(payload.sub);
      client.data.userId = user.id;
      client.data.roles = user.roles;

      void client.join(REALTIME_ROOMS.user(user.id));
      user.roles.forEach((role) => {
        void client.join(REALTIME_ROOMS.role(role));
      });

      const doctorAccess = await this.realtimeService.findDoctorAccess(user.id);
      if (doctorAccess) {
        void client.join(REALTIME_ROOMS.doctor(doctorAccess.doctorId));
        void client.join(REALTIME_ROOMS.specialty(doctorAccess.specialtyId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: RealtimeSocket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('waiting-board.join')
  joinWaitingBoard(@ConnectedSocket() client: RealtimeSocket) {
    return client.join(REALTIME_ROOMS.publicWaitingBoard);
  }

  private readToken(client: RealtimeSocket) {
    const auth = client.handshake.auth as Record<string, unknown>;
    const authToken = auth.token;
    if (typeof authToken === 'string' && authToken) return authToken;
    const authorization = client.handshake.headers.authorization;
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  }
}
