import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServicesService } from './services.service';
import {
  ServiceRepository,
  ServiceWithSpecialty,
} from './repositories/service.repository.interface';

describe('Bước 3 — phân loại dịch vụ (mock)', () => {
  const item = {
    id: 1,
    maDichVu: '6001',
    tenDichVu: 'Khám Test',
    loaiDichVu: null,
    chuyenKhoaId: 2,
    chuyenKhoa: { id: 2, tenChuyenKhoa: 'Test' },
    donGia: new Prisma.Decimal(100),
  } as ServiceWithSpecialty;
  function setup() {
    const repo = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          item,
          { ...item, id: 2, loaiDichVu: 'CAN_LAM_SANG' },
        ]),
      findById: jest.fn().mockResolvedValue(item),
      findConflict: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(item),
      create: jest.fn().mockResolvedValue(item),
    };
    const service = new ServicesService(
      repo as unknown as ServiceRepository,
      { record: jest.fn() } as unknown as AuditLogsService,
    );
    return { service, repo };
  }
  it('API cũ không filter vẫn trả đủ, filter CLS không coi NULL là CLS', async () => {
    const { service } = setup();
    expect((await service.findAll({})).data).toHaveLength(2);
    expect(
      (await service.findAll({ type: 'CAN_LAM_SANG' })).data.map((r) => r.id),
    ).toEqual([2]);
  });
  it('dịch vụ CLS không đồng bộ nhầm giá vào phí khám dù trùng quy tắc tên cũ', async () => {
    const { service, repo } = setup();
    await service.update(1, { price: 200, type: 'CAN_LAM_SANG' }, 7);
    expect(repo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ loaiDichVu: 'CAN_LAM_SANG', donGia: 200 }),
      false,
    );
  });
  it('bộ lọc public loại CLS, giữ KHAM và NULL; Admin vẫn thấy đủ', async () => {
    const { service, repo } = setup();
    repo.findAll.mockResolvedValue([item, { ...item, id: 2, loaiDichVu: 'CAN_LAM_SANG' }, { ...item, id: 3, loaiDichVu: 'KHAM' }]);
    expect((await service.findAll({ excludeType: 'CAN_LAM_SANG' })).data.map((v) => v.id)).toEqual([1, 3]);
    expect((await service.findAll({})).data).toHaveLength(3);
    expect((await service.findAll({ type: 'CAN_LAM_SANG' })).data.map((v) => v.id)).toEqual([2]);
  });
  it('giữ hành vi đồng bộ dịch vụ khám cũ chưa phân loại', async () => {
    const { service, repo } = setup();
    await service.update(1, { price: 200 }, 7);
    expect(repo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ donGia: 200 }),
      true,
    );
  });
  it('tạo dịch vụ giữ phân loại đã xác nhận', async () => {
    const { service, repo } = setup();
    await service.create(
      { code: '6002', name: 'Test', price: 123, type: 'CAN_LAM_SANG' },
      7,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ loaiDichVu: 'CAN_LAM_SANG' }),
    );
  });
  it.each(['KHAM', 'CAN_LAM_SANG', null, undefined])(
    'DTO chấp nhận loại %s',
    async (type) => {
      const errors = await validate(
        plainToInstance(CreateServiceDto, {
          code: '6002',
          name: 'Test',
          price: 123,
          type,
        }),
      );
      expect(errors).toHaveLength(0);
    },
  );
  it('DTO từ chối phân loại ngoài enum', async () => {
    const errors = await validate(
      plainToInstance(CreateServiceDto, {
        code: '6002',
        name: 'Test',
        price: 123,
        type: 'UNKNOWN',
      }),
    );
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });
});
