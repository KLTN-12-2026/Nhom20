import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ThanhToanController } from './thanh-toan.controller';
import { ThanhToanService } from './thanh-toan.service';

describe('V24.1 — xác thực và validation webhook', () => {
  let app: INestApplication;
  let server: Server;
  const originalToken = process.env.SEPAY_API_TOKEN;
  const fakeToken = 'V24_TEST_ONLY_TOKEN';
  const payload = {
    id: 11,
    gateway: 'TEST',
    transactionDate: '2026-01-01T00:00:00.000Z',
    content: 'HD-100-1',
    transferType: 'in',
    transferAmount: 500000,
    referenceCode: 'TEST-11',
  };
  const service = {
    handleSePayWebhook: jest.fn().mockResolvedValue({ success: true }),
    collectCash: jest.fn().mockResolvedValue({ message: 'OK' }),
  };

  beforeAll(async () => {
    Logger.overrideLogger(false);
    const module = await Test.createTestingModule({
      controllers: [ThanhToanController],
      providers: [{ provide: ThanhToanService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: import('@nestjs/common').ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: { id: number } }>().user = {
            id: 1,
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
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
    process.env.SEPAY_API_TOKEN = fakeToken;
  });

  afterAll(async () => {
    if (originalToken === undefined) delete process.env.SEPAY_API_TOKEN;
    else process.env.SEPAY_API_TOKEN = originalToken;
    await app.close();
  });

  it.each(['missing', 'empty', 'whitespace'])(
    'từ chối token cấu hình %s',
    async (kind) => {
      if (kind === 'missing') delete process.env.SEPAY_API_TOKEN;
      else process.env.SEPAY_API_TOKEN = kind === 'empty' ? '' : '   ';
      const res = await request(server)
        .post('/thanh-toan/sepay-webhook')
        .send(payload);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(service.handleSePayWebhook).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 'Apikey WRONG_TEST_TOKEN'])(
    'từ chối header thiếu hoặc sai',
    async (auth) => {
      const req = request(server).post('/thanh-toan/sepay-webhook');
      if (auth) req.set('Authorization', auth);
      await req.send(payload).expect(401);
      expect(service.handleSePayWebhook).not.toHaveBeenCalled();
    },
  );

  it.each(['Apikey', 'Bearer'])(
    'chấp nhận header %s hợp lệ',
    async (scheme) => {
      await request(server)
        .post('/thanh-toan/sepay-webhook')
        .set('Authorization', `${scheme} ${fakeToken}`)
        .send(payload)
        .expect(201);
      expect(service.handleSePayWebhook).toHaveBeenCalledTimes(1);
    },
  );

  it('từ chối payload không hợp lệ trước service', async () => {
    await request(server)
      .post('/thanh-toan/sepay-webhook')
      .set('Authorization', `Apikey ${fakeToken}`)
      .send({ ...payload, transferAmount: 'not-a-number' })
      .expect(400);
    expect(service.handleSePayWebhook).not.toHaveBeenCalled();
  });

  it('không chặn API thu tiền mặt khi thiếu token webhook', async () => {
    delete process.env.SEPAY_API_TOKEN;
    await request(server)
      .post('/thanh-toan/hoa-don/1/tien-mat')
      .send({ soTien: 50000 })
      .expect(201);
    expect(service.collectCash).toHaveBeenCalledWith(1, 50000, 1);
  });
});
