import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PrismaServiceOrderRepository } from './repositories/prisma-service-order.repository';
import { ServiceOrder } from './repositories/service-order.repository.interface';

// Chỉ kiểm tra hợp đồng lệnh Prisma/transaction, KHÔNG giả nhận là test khóa/rollback thật.
function setup() {
  const calls: string[] = [];
  const order = { id: 1, trangThai: 'DA_HOAN_TAT' } as ServiceOrder;
  const db = {
    $queryRaw: jest.fn((strings: TemplateStringsArray, id: number) => {
      calls.push(strings.join('?'));
      return Promise.resolve([{ id }]);
    }),
    luotKham: {
      findUnique: jest.fn(() => {
        calls.push('read-visit');
        return Promise.resolve({ id: 4 });
      }),
    },
    chiDinhDichVu: {
      create: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue(order),
    },
    nguoiDung: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ hoTen: 'Test', email: null }),
    },
    nhatKyHeThong: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn(<T>(fn: (tx: typeof db) => Promise<T>) => fn(db)),
  };
  return {
    db,
    prisma,
    calls,
    order,
    repo: new PrismaServiceOrderRepository(prisma as unknown as PrismaService),
  };
}

describe('Bước 3 — repository (mock)', () => {
  it('khóa lượt khám rồi hóa đơn trước đọc trạng thái và chạy callback', async () => {
    const { repo, calls, db, prisma } = setup();
    await repo.withVisit(4, () => {
      calls.push('work');
      return Promise.resolve();
    });
    expect(calls).toEqual([
      'SELECT id FROM luot_kham WHERE id = ? FOR UPDATE',
      'SELECT id FROM hoa_don WHERE luot_kham_id = ? FOR UPDATE',
      'read-visit',
      'work',
    ]);
    expect(db.$queryRaw.mock.calls.map((call) => call[1])).toEqual([4, 4]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  });
  it('update kèm điều kiện trạng thái chờ và đúng lượt khám', async () => {
    const { repo, db } = setup();
    await repo.withVisit(4, (tx) =>
      tx.updatePending(1, { trangThai: 'DA_HOAN_TAT', ketQua: 'Test' }),
    );
    expect(db.chiDinhDichVu.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, trangThai: 'CHO_THUC_HIEN', luotKhamId: 4 },
      }),
    );
  });
  it('audit dùng cùng transaction và không ghi nội dung kết quả', async () => {
    const { repo, db, order } = setup();
    await repo.withVisit(4, (tx) =>
      tx.audit(7, 'Nhập kết quả', { ...order, ketQua: 'SECRET_TEST_RESULT' }),
    );
    const args = db.nhatKyHeThong.create.mock.calls as unknown as Array<
      [Prisma.NhatKyHeThongCreateArgs]
    >;
    expect(args[0][0].data).toMatchObject({
      nguoiDungId: 7,
      phanHe: 'DICH_VU',
      vaiTro: 'Bác sĩ',
    });
    expect(args[0][0].data.chiTiet).not.toContain('SECRET_TEST_RESULT');
  });
  it('không nuốt lỗi audit (rollback thực tế cần PostgreSQL)', async () => {
    const { repo, db, order } = setup();
    db.nhatKyHeThong.create.mockRejectedValue(new Error('Audit failed'));
    await expect(
      repo.withVisit(4, (tx) => tx.audit(7, 'Test', order)),
    ).rejects.toThrow('Audit failed');
  });
  it('catalog chỉ lọc CAN_LAM_SANG hoạt động, có phân trang', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const repo = new PrismaServiceOrderRepository({
      dichVu: { findMany, count },
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
    } as unknown as PrismaService);
    expect(await repo.catalog('test', 20, 10)).toEqual({ items: [], total: 0 });
    const args = (
      findMany.mock.calls as unknown as Array<[Prisma.DichVuFindManyArgs]>
    )[0][0];
    expect(args).toMatchObject({ skip: 20, take: 10 });
    expect(args.where).toMatchObject({
      loaiDichVu: 'CAN_LAM_SANG',
      trangThai: 'DANG_HOAT_DONG',
    });
    expect(count).toHaveBeenCalledWith({
      where: (
        findMany.mock.calls as unknown as Array<[Prisma.DichVuFindManyArgs]>
      )[0][0].where,
    });
  });
});
