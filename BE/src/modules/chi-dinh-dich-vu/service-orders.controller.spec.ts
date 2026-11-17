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
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

describe('Bước 3 — HTTP/DTO và RolesGuard thật, JWT/service mock', () => {
  let app: INestApplication;
  let server: Server;
  let roles: string[];
  let permissions: string[];
  let authenticated: boolean;
  const service = {
    catalog: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    saveResult: jest.fn(),
    cancel: jest.fn(),
  };
  const payload = {
    serviceId: 3,
    reason: ' Lý do ',
    idempotencyKey: '0a03ad3d-1668-4cc2-a10b-1d099a6e54ac',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ServiceOrdersController],
      providers: [{ provide: ServiceOrdersService, useValue: service }],
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

  it('POST hợp lệ chuyển actor và DTO đã trim tới service', async () => {
    await request(server)
      .post('/service-orders/visit/4')
      .send(payload)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      7,
      4,
      expect.objectContaining({ reason: 'Lý do', serviceId: 3 }),
    );
  });
  it.each(['priceSnapshot', 'doctorId', 'resultEnteredBy', 'status'])(
    'không nhận trường giả mạo %s',
    async (field) => {
      await request(server)
        .post('/service-orders/visit/4')
        .send({ ...payload, [field]: 9 })
        .expect(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    { reason: '   ' },
    { reason: 'x'.repeat(1001) },
    { serviceId: 0 },
    { serviceId: '3' },
    { idempotencyKey: 'invalid' },
  ])('từ chối DTO sai %j', async (change) => {
    await request(server)
      .post('/service-orders/visit/4')
      .send({ ...payload, ...change })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'RECEPTIONIST', 'PHARMACIST', 'PATIENT'])(
    'role %s không được truy cập các API chỉ định',
    async (role) => {
      roles = [role];
      await request(server).get('/service-orders/catalog').expect(403);
      await request(server).get('/service-orders/visit/4').expect(403);
      await request(server)
        .post('/service-orders/visit/4')
        .send(payload)
        .expect(403);
      await request(server)
        .patch('/service-orders/1/result')
        .send({ result: 'Test' })
        .expect(403);
      await request(server)
        .patch('/service-orders/1/cancel')
        .send({ reason: 'Test' })
        .expect(403);
      expect(service.saveResult).not.toHaveBeenCalled();
    },
  );
  it('thiếu quyền BENH_AN.VIEW trả 403', async () => {
    permissions = [];
    await request(server).get('/service-orders/visit/4').expect(403);
  });
  it('chưa đăng nhập trả 401', async () => {
    authenticated = false;
    await request(server).get('/service-orders/visit/4').expect(401);
  });
  it('danh mục phân trang đúng, chặn limit quá lớn', async () => {
    await request(server)
      .get('/service-orders/catalog?page=2&limit=10')
      .expect(200);
    expect(service.catalog).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
    );
    await request(server).get('/service-orders/catalog?limit=101').expect(400);
  });
  it('GET đúng visit ID, không dùng active visit', async () => {
    await request(server).get('/service-orders/visit/42').expect(200);
    expect(service.list).toHaveBeenCalledWith(7, 42);
  });
  it('nhập kết quả hợp lệ, chặn trống và quá dài', async () => {
    await request(server)
      .patch('/service-orders/1/result')
      .send({ result: ' Test ' })
      .expect(200);
    expect(service.saveResult).toHaveBeenCalledWith(
      7,
      1,
      expect.objectContaining({ result: 'Test' }),
    );
    await request(server)
      .patch('/service-orders/1/result')
      .send({ result: '   ' })
      .expect(400);
    await request(server)
      .patch('/service-orders/1/result')
      .send({ result: 'x'.repeat(10001) })
      .expect(400);
  });
  it('hủy phải có lý do', async () => {
    await request(server)
      .patch('/service-orders/1/cancel')
      .send({ reason: ' Không cần ' })
      .expect(200);
    expect(service.cancel).toHaveBeenCalledWith(
      7,
      1,
      expect.objectContaining({ reason: 'Không cần' }),
    );
    await request(server)
      .patch('/service-orders/1/cancel')
      .send({})
      .expect(400);
  });
});
