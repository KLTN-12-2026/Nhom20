import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DichVu, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ServiceOrdersService } from './service-orders.service';
import {
  OrderVisit,
  ServiceOrder,
  ServiceOrderRepository,
  ServiceOrderTransaction,
} from './repositories/service-order.repository.interface';

const price = new Prisma.Decimal('123456.78');
function setup() {
  const records: ServiceOrder[] = [];
  const catalog: DichVu = {
    id: 3,
    maDichVu: 'TEST',
    tenDichVu: 'Dịch vụ test',
    moTa: null,
    donGia: price,
    loaiDichVu: 'CAN_LAM_SANG',
    chuyenKhoaId: null,
    thoiGianDuKienPhut: null,
    trangThai: 'DANG_HOAT_DONG',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx = {
    visit: {
      id: 4,
      bacSiId: 2,
      bacSi: { nguoiDungId: 7 },
      trangThai: 'DA_VAO_PHONG',
      hoaDon: null,
    } as OrderVisit,
    findByKey: jest.fn((key: string) =>
      Promise.resolve(records.find((r) => r.idempotencyKey === key) ?? null),
    ),
    findById: jest.fn((id: number) =>
      Promise.resolve(records.find((r) => r.id === id) ?? null),
    ),
    findService: jest.fn().mockResolvedValue(catalog),
    list: jest.fn(() => Promise.resolve(records)),
    create: jest.fn((data: Prisma.ChiDinhDichVuUncheckedCreateInput) => {
      const item: ServiceOrder = {
        id: records.length + 1,
        luotKhamId: data.luotKhamId,
        dichVuId: data.dichVuId,
        bacSiChiDinhId: data.bacSiChiDinhId,
        lyDoChiDinh: data.lyDoChiDinh,
        ghiChu: data.ghiChu ?? null,
        trangThai: 'CHO_THUC_HIEN',
        donGiaSnapshot: price,
        idempotencyKey: data.idempotencyKey,
        ketQua: null,
        nguoiNhapKetQuaId: null,
        thoiGianCoKetQua: null,
        lyDoHuy: null,
        nguoiHuyId: null,
        thoiGianHuy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        dichVu: {
          id: data.dichVuId,
          maDichVu: 'TEST',
          tenDichVu: 'Dịch vụ test',
        },
      };
      records.push(item);
      return Promise.resolve(item);
    }),
    updatePending: jest.fn(
      (id: number, data: Prisma.ChiDinhDichVuUncheckedUpdateInput) => {
        const item = records.find((r) => r.id === id)!;
        Object.assign(item, data);
        return Promise.resolve(item);
      },
    ),
    audit: jest.fn().mockResolvedValue(undefined),
  } satisfies jest.Mocked<ServiceOrderTransaction>;
  const repo = {
    catalog: jest.fn().mockResolvedValue({ items: [catalog], total: 1 }),
    findById: tx.findById,
    withVisit: jest.fn(
      <T>(_id: number, fn: (ctx: ServiceOrderTransaction) => Promise<T>) =>
        fn(tx),
    ),
  } satisfies ServiceOrderRepository;
  const realtime = { emitToRoom: jest.fn() };
  const service = new ServiceOrdersService(
    repo,
    realtime as unknown as RealtimeService,
  );
  const dto: CreateServiceOrderDto = {
    serviceId: 3,
    reason: '  Lý do test  ',
    note: '  ',
    idempotencyKey: randomUUID(),
  };
  return {
    service,
    repo,
    tx,
    realtime,
    dto,
    records,
    catalog,
    create: () => service.create(7, 4, dto),
  };
}

describe('Bước 3 — chỉ định dịch vụ, service mock (không phải PostgreSQL)', () => {
  it('Bước 5: nhập kết quả được trong lượt chờ, vẫn giữ quyền sở hữu', async () => {
    const { create, service, tx, records } = setup();
    const result = await create();
    tx.visit!.trangThai = 'CHO_KET_QUA';
    await service.saveResult(7, result.data.id, { result: 'Kết quả demo' });
    expect(records[0].trangThai).toBe('DA_HOAN_TAT');
    await expect(service.saveResult(99, result.data.id, { result: 'Không hợp lệ' })).rejects.toThrow(ForbiddenException);
  });
  it('tạo chỉ định với giá DB và bác sĩ sở hữu, không hoàn tất khám/tạo hóa đơn', async () => {
    const { create, tx, realtime } = setup();
    const result = await create();
    expect(tx.create).toHaveBeenCalledWith(
      expect.objectContaining({
        donGiaSnapshot: price,
        bacSiChiDinhId: 2,
        luotKhamId: 4,
        lyDoChiDinh: 'Lý do test',
        ghiChu: null,
      }),
    );
    expect(result.data.status).toBe('CHO_THUC_HIEN');
    expect(result.data.priceSnapshot).toBe('123456.78');
    expect(tx.audit).toHaveBeenCalledTimes(1);
    expect(realtime.emitToRoom).toHaveBeenCalledWith(
      'doctor:2',
      'service-order.updated',
      { id: 1, visitId: 4, status: 'CHO_THUC_HIEN' },
    );
  });
  it('cùng yêu cầu gửi lại trả đúng ID, chỉ một bản ghi/audit/socket', async () => {
    const { create, tx, realtime } = setup();
    expect((await create()).data.id).toBe((await create()).data.id);
    expect(tx.create).toHaveBeenCalledTimes(1);
    expect(tx.audit).toHaveBeenCalledTimes(1);
    expect(realtime.emitToRoom).toHaveBeenCalledTimes(1);
  });
  it.each(['service', 'reason', 'note', 'visit'])(
    'cùng khóa khác %s bị 409',
    async (field) => {
      const { create, service, dto } = setup();
      await create();
      const next = {
        ...dto,
        ...(field === 'service' ? { serviceId: 9 } : {}),
        ...(field === 'reason' ? { reason: 'Khác' } : {}),
        ...(field === 'note' ? { note: 'Khác' } : {}),
      };
      await expect(
        service.create(7, field === 'visit' ? 9 : 4, next),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
  it('cùng dịch vụ với hai khóa hợp lệ tạo hai chỉ định', async () => {
    const { create, dto, service, tx } = setup();
    await create();
    await service.create(7, 4, { ...dto, idempotencyKey: randomUUID() });
    expect(tx.create).toHaveBeenCalledTimes(2);
  });
  it('hai dịch vụ khác nhau có hai chỉ định', async () => {
    const { create, dto, service, tx, catalog } = setup();
    await create();
    tx.findService.mockResolvedValue({ ...catalog, id: 5 });
    const result = await service.create(7, 4, {
      ...dto,
      serviceId: 5,
      idempotencyKey: randomUUID(),
    });
    expect(result.data.service.id).toBe(5);
    expect(tx.create).toHaveBeenCalledTimes(2);
  });
  it('kiểm tra sở hữu trước idempotency, không trả dữ liệu bác sĩ khác', async () => {
    const { create, tx } = setup();
    await create();
    tx.findByKey.mockClear();
    tx.visit.bacSi!.nguoiDungId = 8;
    await expect(create()).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.findByKey).not.toHaveBeenCalled();
  });
  it.each(['DA_HOAN_TAT', 'DA_HUY', 'DANG_CHO'] as const)(
    'không tạo mới ở lượt khám %s',
    async (status) => {
      const { create, tx } = setup();
      tx.visit.trangThai = status;
      await expect(create()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.create).not.toHaveBeenCalled();
    },
  );
  it.each(['DA_THANH_TOAN', 'DA_HUY'] as const)(
    'không tạo mới khi hóa đơn %s',
    async (status) => {
      const { create, tx } = setup();
      tx.visit.hoaDon = { trangThai: status };
      await expect(create()).rejects.toBeInstanceOf(ConflictException);
    },
  );
  it.each(['KHAM', null] as const)(
    'không chỉ định danh mục loại %s',
    async (type) => {
      const { create, catalog } = setup();
      catalog.loaiDichVu = type;
      await expect(create()).rejects.toThrow(
        'Chỉ được chọn dịch vụ cận lâm sàng',
      );
    },
  );
  it('không chỉ định dịch vụ ngừng hoạt động', async () => {
    const { create, catalog } = setup();
    catalog.trangThai = 'NGUNG_HOAT_DONG';
    await expect(create()).rejects.toThrow(
      'Chỉ được chọn dịch vụ cận lâm sàng',
    );
  });
  it('không chỉ định giá âm', async () => {
    const { create, catalog } = setup();
    catalog.donGia = new Prisma.Decimal(-1);
    await expect(create()).rejects.toThrow('Đơn giá dịch vụ không hợp lệ');
  });
  it('nhập kết quả lưu actor/thời điểm, giữ giá, retry không ghi lần hai', async () => {
    const { create, service, tx } = setup();
    await create();
    const result = await service.saveResult(7, 1, {
      result: '  Kết quả test  ',
    });
    expect(result.data).toMatchObject({
      status: 'DA_HOAN_TAT',
      result: 'Kết quả test',
      resultEnteredBy: 7,
      priceSnapshot: '123456.78',
    });
    expect(result.data.resultedAt).toBeInstanceOf(Date);
    await service.saveResult(7, 1, { result: 'Kết quả test' });
    expect(tx.updatePending).toHaveBeenCalledTimes(1);
    await expect(
      service.saveResult(7, 1, { result: 'Khác' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('hủy chỉ định chờ lưu lý do/actor, không nhận kết quả sau hủy', async () => {
    const { create, service } = setup();
    await create();
    const canceled = await service.cancel(7, 1, {
      reason: 'Không cần thực hiện',
    });
    expect(canceled.data).toMatchObject({
      status: 'DA_HUY',
      canceledBy: 7,
      cancellationReason: 'Không cần thực hiện',
      result: null,
    });
    await expect(
      service.saveResult(7, 1, { result: 'Test' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('không hủy dịch vụ đã hoàn tất', async () => {
    const { create, service } = setup();
    await create();
    await service.saveResult(7, 1, { result: 'Test' });
    await expect(
      service.cancel(7, 1, { reason: 'Test' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it.each(['result', 'cancel', 'list'])(
    'bác sĩ khác không được %s',
    async (operation) => {
      const { create, service, tx } = setup();
      await create();
      const action =
        operation === 'result'
          ? service.saveResult(99, 1, { result: 'Test' })
          : operation === 'cancel'
            ? service.cancel(99, 1, { reason: 'Test' })
            : service.list(99, 4);
      await expect(action).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.updatePending).not.toHaveBeenCalled();
    },
  );
  it.each(['result', 'cancel'])(
    'hóa đơn quyết toán chặn %s',
    async (operation) => {
      const { create, service, tx } = setup();
      await create();
      tx.visit.hoaDon = { trangThai: 'DA_THANH_TOAN' };
      await expect(
        operation === 'result'
          ? service.saveResult(7, 1, { result: 'Test' })
          : service.cancel(7, 1, { reason: 'Test' }),
      ).rejects.toThrow('Hóa đơn đã quyết toán');
      expect(tx.updatePending).not.toHaveBeenCalled();
    },
  );
  it('audit lỗi được trả ra, không phát socket thành công (rollback cần PostgreSQL)', async () => {
    const { create, tx, realtime } = setup();
    tx.audit.mockRejectedValue(new Error('Audit test failure'));
    await expect(create()).rejects.toThrow('Audit test failure');
    expect(realtime.emitToRoom).not.toHaveBeenCalled();
  });
  it('xung đột unique ở DB được chuyển thành 409', async () => {
    const { create, tx } = setup();
    tx.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Conflict', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(create()).rejects.toBeInstanceOf(ConflictException);
  });
  it('danh mục rỗng trả mảng rỗng, không tự tạo dữ liệu', async () => {
    const { service, repo } = setup();
    jest.mocked(repo.catalog).mockResolvedValue({ items: [], total: 0 });
    expect((await service.catalog({ page: 1, limit: 20 })).data).toEqual([]);
  });
});
