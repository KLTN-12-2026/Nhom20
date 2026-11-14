import { Prisma, TrangThaiHoaDon, TrangThaiThanhToan } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThanhToanService } from './thanh-toan.service';

describe('V24.1 — đối chiếu tiền webhook', () => {
  const dto = {
    id: 111,
    gateway: 'TEST',
    transactionDate: '2026-01-01T00:00:00.000Z',
    content: 'HD-100-1',
    transferType: 'in',
    transferAmount: 50000,
    referenceCode: 'TEST-111',
  };
  let invoice: {
    id: number;
    maHoaDon: string;
    tongTien: Prisma.Decimal;
    trangThai: TrangThaiHoaDon;
  };
  let paid: Prisma.Decimal;
  let created: Array<Record<string, unknown>>;
  let updated: Array<Record<string, unknown>>;
  let emitToRoom: jest.Mock;
  let transaction: jest.Mock;
  let existingTransaction: { hoaDonId: number } | null;
  let service: ThanhToanService;

  beforeEach(() => {
    invoice = {
      id: 1,
      maHoaDon: 'HD-100-1',
      tongTien: new Prisma.Decimal(500000),
      trangThai: TrangThaiHoaDon.CHUA_THANH_TOAN,
    };
    paid = new Prisma.Decimal(0);
    created = [];
    updated = [];
    existingTransaction = null;
    emitToRoom = jest.fn();
    const tx = {
      hoaDon: {
        findUnique: jest.fn(() => Promise.resolve({ ...invoice })),
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          updated.push(data);
          return Promise.resolve({ ...invoice, ...data });
        }),
      },
      thanhToan: {
        findFirst: jest.fn(() => Promise.resolve(existingTransaction)),
        aggregate: jest.fn(() => Promise.resolve({ _sum: { soTien: paid } })),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return Promise.resolve(data);
        }),
      },
    };
    transaction = jest.fn((fn: (value: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    );
    const prisma = {
      hoaDon: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            ...invoice,
            thanhToan: paid.gt(0)
              ? [{ soTien: paid, trangThai: TrangThaiThanhToan.THANH_CONG }]
              : [],
          }),
        ),
        findMany: jest.fn(() => Promise.resolve([])),
      },
      $transaction: transaction,
    };
    service = new ThanhToanService(
      prisma as unknown as PrismaService,
      { emitToRoom } as unknown as RealtimeService,
    );
  });

  it.each([
    [0, 500000, TrangThaiHoaDon.DA_THANH_TOAN],
    [0, 50000, TrangThaiHoaDon.CHUA_THANH_TOAN],
    [200000, 300000, TrangThaiHoaDon.DA_THANH_TOAN],
    [200000, 100000, TrangThaiHoaDon.CHUA_THANH_TOAN],
    [499999.99, 0.01, TrangThaiHoaDon.DA_THANH_TOAN],
  ])(
    'đã thu %i, nhận %i thì trạng thái %s',
    async (previous, amount, status) => {
      paid = new Prisma.Decimal(previous);
      await service.handleSePayWebhook({ ...dto, transferAmount: amount });
      expect(created).toHaveLength(1);
      expect(String(created[0].soTien)).toBe(String(amount));
      expect(created[0].trangThai).toBe(TrangThaiThanhToan.THANH_CONG);
      expect(updated[0].trangThai).toBe(status);
      if (status !== TrangThaiHoaDon.DA_THANH_TOAN) {
        expect(emitToRoom).not.toHaveBeenCalledWith(
          expect.anything(),
          'payment.success',
          expect.anything(),
        );
        expect(emitToRoom).toHaveBeenCalledWith(
          expect.anything(),
          'payment.partial',
          expect.anything(),
        );
      } else {
        expect(emitToRoom).toHaveBeenCalledWith(
          expect.anything(),
          'payment.success',
          expect.anything(),
        );
      }
    },
  );

  it.each([0, -1, 0.001])('không ghi giao dịch số tiền %s', async (amount) => {
    await expect(
      service.handleSePayWebhook({ ...dto, transferAmount: amount }),
    ).rejects.toThrow();
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it('không tự động thanh toán hóa đơn đã hủy', async () => {
    invoice.trangThai = TrangThaiHoaDon.DA_HUY;
    await expect(service.handleSePayWebhook(dto)).rejects.toThrow();
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it('lưu toàn bộ tiền thực nhận và thể hiện phần dư để đối soát', async () => {
    paid = new Prisma.Decimal(200000);
    const result = await service.handleSePayWebhook({
      ...dto,
      transferAmount: 400000,
    });
    expect(String(created[0].soTien)).toBe('400000');
    expect(updated[0].trangThai).toBe(TrangThaiHoaDon.DA_THANH_TOAN);
    expect(result).toEqual(expect.objectContaining({ excessAmount: '100000' }));
  });

  it.each(['cash', 'transfer'])('giữ luồng thu %s một phần', async (method) => {
    paid = new Prisma.Decimal(200000);
    if (method === 'cash') await service.collectCash(1, 100000, 5);
    else await service.collectTransfer(1, 100000, 5, 'MOCK');
    expect(created[0].soTien).toBe(100000);
    expect(updated[0].trangThai).toBe(TrangThaiHoaDon.BAN_NHAP);
  });

  it('bỏ qua giao dịch tiền ra', async () => {
    await service.handleSePayWebhook({ ...dto, transferType: 'out' });
    expect(created).toHaveLength(0);
    expect(emitToRoom).not.toHaveBeenCalled();
  });

  it('không ghi thêm khi hóa đơn đã thanh toán', async () => {
    invoice.trangThai = TrangThaiHoaDon.DA_THANH_TOAN;
    await service.handleSePayWebhook(dto);
    expect(created).toHaveLength(0);
    expect(emitToRoom).not.toHaveBeenCalled();
  });

  it('không cộng hai lần cùng giao dịch sau khi nhận thiếu', async () => {
    paid = new Prisma.Decimal(50000);
    existingTransaction = { hoaDonId: invoice.id };
    const result = await service.handleSePayWebhook(dto);
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(emitToRoom).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('không gắn giao dịch đã ghi cho hóa đơn khác', async () => {
    existingTransaction = { hoaDonId: 999 };
    await expect(service.handleSePayWebhook(dto)).rejects.toThrow();
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it('không phát socket thành công nếu transaction thất bại', async () => {
    transaction.mockRejectedValueOnce(new Error('MOCK_TRANSACTION_FAILURE'));
    await expect(service.handleSePayWebhook(dto)).rejects.toThrow(
      'MOCK_TRANSACTION_FAILURE',
    );
    expect(emitToRoom).not.toHaveBeenCalled();
  });
});
