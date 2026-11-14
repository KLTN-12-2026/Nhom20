import { Logger } from '@nestjs/common';
import { Prisma, TrangThaiHoaDon } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThanhToanController } from './thanh-toan.controller';
import { ThanhToanService } from './thanh-toan.service';

describe('V24.1 — log webhook không tiết lộ bí mật', () => {
  const token = 'FAKE_SECURITY_TOKEN_123456789';
  const secretAccount = 'FAKE_ACCOUNT_987654';
  const originalToken = process.env.SEPAY_API_TOKEN;
  const payload = {
    id: 123,
    gateway: 'TEST',
    transactionDate: '2026-01-01T00:00:00.000Z',
    content: 'HD-100-1',
    transferType: 'in',
    transferAmount: 500000,
    referenceCode: 'FAKE_REFERENCE',
    accountNumber: secretAccount,
  };
  let logs: jest.SpyInstance;
  let warns: jest.SpyInstance;

  beforeEach(() => {
    process.env.SEPAY_API_TOKEN = token;
    logs = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warns = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    if (originalToken === undefined) delete process.env.SEPAY_API_TOKEN;
    else process.env.SEPAY_API_TOKEN = originalToken;
  });

  const expectSafeLogs = () => {
    const output = JSON.stringify([logs.mock.calls, warns.mock.calls]);
    expect(output).not.toContain(token);
    expect(output).not.toContain(token.slice(0, 8));
    expect(output).not.toContain(secretAccount);
    expect(output).not.toContain(JSON.stringify(payload));
  };

  it('request hợp lệ không log authorization hoặc payload', async () => {
    const service = {
      handleSePayWebhook: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new ThanhToanController(
      service as unknown as ThanhToanService,
    );
    await expect(
      controller.handleWebhook(payload, `Apikey ${token}`),
    ).resolves.toEqual({ success: true });
    expect(service.handleSePayWebhook).toHaveBeenCalledTimes(1);
    expectSafeLogs();
  });

  it('request sai không để lộ token trong log hoặc exception', async () => {
    const service = { handleSePayWebhook: jest.fn() };
    const controller = new ThanhToanController(
      service as unknown as ThanhToanService,
    );
    let message = '';
    try {
      await controller.handleWebhook(payload, `Apikey WRONG_${token}`);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).not.toContain(token);
    expect(service.handleSePayWebhook).not.toHaveBeenCalled();
    expectSafeLogs();
  });

  it('service không log toàn bộ payload thành công hoặc nội dung không khớp', async () => {
    const invoice = {
      id: 1,
      maHoaDon: 'HD-100-1',
      tongTien: new Prisma.Decimal(500000),
      trangThai: TrangThaiHoaDon.CHUA_THANH_TOAN,
    };
    const tx = {
      hoaDon: {
        findUnique: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue(invoice),
      },
      thanhToan: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { soTien: null } }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      hoaDon: { findUnique: jest.fn().mockResolvedValue(invoice) },
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const service = new ThanhToanService(
      prisma as unknown as PrismaService,
      { emitToRoom: jest.fn() } as unknown as RealtimeService,
    );
    await service.handleSePayWebhook(payload);
    await service.handleSePayWebhook({ ...payload, content: secretAccount });
    expectSafeLogs();
  });
});
