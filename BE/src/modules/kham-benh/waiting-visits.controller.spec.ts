import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { WaitingVisitsController } from './waiting-visits.controller';
import { WaitingVisitsService } from './waiting-visits.service';

describe('B5 HTTP/guard thật, JWT/service mock', () => {
  let app: INestApplication;
  let server: Server;
  let roles: string[];
  let permissions: string[];
  let authenticated: boolean;
  const service = { list: jest.fn(), transition: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WaitingVisitsController],
      providers: [{ provide: WaitingVisitsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          if (!authenticated) throw new UnauthorizedException();
          ctx.switchToHttp().getRequest<{ user: unknown }>().user = {
            id: 7,
            roles,
            permissions,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    roles = ['DOCTOR'];
    permissions = ['BENH_AN.VIEW'];
    authenticated = true;
  });
  afterAll(async () => {
    await app.close();
  });
  it('list dùng actor, nhận phân trang, không nhận doctorId giả', async () => {
    await request(server)
      .get('/examinations/waiting/me?page=2&limit=10')
      .expect(200);
    expect(service.list).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ page: 2, limit: 10 }),
    );
    await request(server)
      .get('/examinations/waiting/me?doctorId=99')
      .expect(400);
    await request(server).get('/examinations/waiting/me?limit=101').expect(400);
  });
  it('wait/resume chuyển đúng ID, không dùng lượt active', async () => {
    await request(server).post('/examinations/waiting/41/wait').expect(201);
    await request(server).post('/examinations/waiting/41/resume').expect(201);
    expect(service.transition).toHaveBeenNthCalledWith(1, 7, 41, 'CHO_KET_QUA');
    expect(service.transition).toHaveBeenNthCalledWith(
      2,
      7,
      41,
      'DA_VAO_PHONG',
    );
    await request(server).post('/examinations/waiting/abc/wait').expect(400);
  });
  it.each(['ADMIN', 'RECEPTIONIST', 'PHARMACIST', 'PATIENT'])(
    '%s không được truy cập',
    async (role) => {
      roles = [role];
      await request(server).get('/examinations/waiting/me').expect(403);
      await request(server).post('/examinations/waiting/41/wait').expect(403);
      await request(server).post('/examinations/waiting/41/resume').expect(403);
      expect(service.transition).not.toHaveBeenCalled();
    },
  );
  it('thiếu quyền trả 403; chưa đăng nhập trả 401', async () => {
    permissions = [];
    await request(server).get('/examinations/waiting/me').expect(403);
    authenticated = false;
    await request(server).get('/examinations/waiting/me').expect(401);
  });
});
