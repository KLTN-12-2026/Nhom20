import { INestApplication, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request from 'supertest';
import type { Server } from 'node:http';

import { AdminReportsController } from '../../modules/bao-cao-thong-ke/admin-reports.controller';
import { UsersController } from '../../modules/nguoi-dung/users.controller';
import { AppointmentsController } from '../../modules/lich-hen/appointments.controller';
import { RolesController } from '../../modules/vai-tro/roles.controller';
import { AuditLogsController } from '../../modules/nhat-ky-he-thong/audit-logs.controller';
import { ChatAIController } from '../../modules/chat-ai/chat-ai.controller';
import { DoctorReviewsController } from '../../modules/danh-gia-bac-si/doctor-reviews.controller';
import { AuthenticatedUser } from './authenticated-user.type';

// Kiểm tra HTTP qua controller và JWT thật; thay service bằng dữ liệu thử để
// không đọc/ghi Neon hay gọi Gemini khi kiểm tra lỗi thứ tự guard.
const testSecret = 'local-admin-access-regression-test';
const jwt = new JwtService({ secret: testSecret });

@Injectable()
class TestJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: testSecret,
    });
  }

  validate(payload: { sub: number; roles: string[]; permissions?: string[] }) {
    return {
      id: payload.sub,
      fullName: 'Test account',
      email: null,
      phoneNumber: null,
      avatarUrl: null,
      roles: payload.roles,
      permissions: payload.permissions ?? [],
    } satisfies AuthenticatedUser;
  }
}

const fixtures = [
  { controller: AdminReportsController, methods: ['getOverview'] },
  {
    controller: UsersController,
    methods: ['findAll', 'getRoleOptions', 'remove'],
  },
  { controller: AppointmentsController, methods: ['findAll'] },
  { controller: RolesController, methods: ['findAll'] },
  { controller: AuditLogsController, methods: ['findAll'] },
  {
    controller: ChatAIController,
    methods: ['getAdminOverview', 'getAdminSessions', 'getAdminSessionDetail'],
  },
  { controller: DoctorReviewsController, methods: ['findAll', 'findPublic'] },
];

const adminEndpoints = [
  '/admin-reports/overview',
  '/users',
  '/users/role-options',
  '/appointments',
  '/roles',
  '/audit-logs',
  '/chat-ai/admin/overview',
  '/chat-ai/admin/sessions',
  '/chat-ai/admin/sessions/1',
  '/doctor-reviews',
];

describe('Admin HTTP access after JWT authentication', () => {
  let app: INestApplication;
  let httpServer: Server;
  const adminToken = jwt.sign({
    sub: 1,
    roles: ['ADMIN'],
    permissions: [
      'BAO_CAO.VIEW',
      'NGUOI_DUNG.VIEW',
      'LICH_HEN.VIEW',
      'NHAT_KY_HE_THONG.VIEW',
      'CHATBOX_AI.VIEW',
      'DANH_GIA_BAC_SI.VIEW',
    ],
  });
  const doctorToken = jwt.sign({
    sub: 2,
    roles: ['DOCTOR'],
    permissions: ['BAO_CAO.VIEW', 'NGUOI_DUNG.VIEW', 'VAI_TRO.VIEW'],
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: fixtures.map((fixture) => fixture.controller),
      providers: [
        TestJwtStrategy,
        ...fixtures.map(({ controller, methods }) => {
          const dependencies = Reflect.getMetadata(
            'design:paramtypes',
            controller,
          ) as unknown[];
          return {
            provide: dependencies[0] as new (...args: never[]) => unknown,
            useValue: Object.fromEntries(
              methods.map((method) => [
                method,
                jest.fn().mockResolvedValue({ data: { reachedService: true } }),
              ]),
            ),
          };
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(adminEndpoints)(
    'allows ADMIN with the required permission: %s',
    async (path) => {
      const response = await request(httpServer)
        .get(`/api/v1${path}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(response.body).toEqual({ data: { reachedService: true } });
    },
  );

  it.each(adminEndpoints)('requires authentication: %s', async (path) => {
    await request(httpServer).get(`/api/v1${path}`).expect(401);
  });

  it.each(adminEndpoints)(
    'rejects a role outside the allowed roles: %s',
    async (path) => {
      await request(httpServer)
        .get(`/api/v1${path}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    },
  );

  it('keeps permission checks for RECEPTIONIST after JWT has populated the user', async () => {
    const deniedToken = jwt.sign({
      sub: 3,
      roles: ['RECEPTIONIST'],
      permissions: [],
    });
    const allowedToken = jwt.sign({
      sub: 3,
      roles: ['RECEPTIONIST'],
      permissions: ['LICH_HEN.VIEW'],
    });
    await request(httpServer)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${deniedToken}`)
      .expect(403);
    await request(httpServer)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${allowedToken}`)
      .expect(200);
  });

  it('enforces ADMIN permissions while preserving access to role configuration', async () => {
    const restrictedAdmin = jwt.sign({
      sub: 1,
      roles: ['ADMIN'],
      permissions: [],
    });
    await request(httpServer)
      .get('/api/v1/admin-reports/overview')
      .set('Authorization', `Bearer ${restrictedAdmin}`)
      .expect(403);
    await request(httpServer)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${restrictedAdmin}`)
      .expect(200);
  });

  it('allows deleting users only when ADMIN has the delete permission', async () => {
    const withoutDelete = jwt.sign({
      sub: 1,
      roles: ['ADMIN'],
      permissions: [],
    });
    const withDelete = jwt.sign({
      sub: 1,
      roles: ['ADMIN'],
      permissions: ['NGUOI_DUNG.DELETE'],
    });
    await request(httpServer)
      .delete('/api/v1/users/9')
      .set('Authorization', `Bearer ${withoutDelete}`)
      .expect(403);
    await request(httpServer)
      .delete('/api/v1/users/9')
      .set('Authorization', `Bearer ${withDelete}`)
      .expect(200);
  });

  it('rejects an invalid JWT', async () => {
    await request(httpServer)
      .get('/api/v1/admin-reports/overview')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('keeps approved public reviews accessible without a JWT', async () => {
    await request(httpServer).get('/api/v1/doctor-reviews/public').expect(200);
  });
});
