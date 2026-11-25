import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrangThaiDonThuoc } from '@prisma/client';
import { DispensingService } from './dispensing.service';
import type { DispenseLineDto } from './dto/dispense-prescription.dto';
import type {
  DispensingPrescription,
  DispensingRepository,
} from './repositories/dispensing.repository.interface';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';

const line = (id: number, quantity = 2): DispenseLineDto => ({
  prescriptionItemId: id,
  batches: [{ batchId: id + 100, quantity }],
});

// Mock kiểm tra service chặn request trước khi ghi kho/hóa đơn; không dùng Neon.
function setup() {
  const current = {
    id: 10,
    maDonThuoc: 'DT-TEST',
    trangThai: TrangThaiDonThuoc.DANG_XU_LY,
    createdAt: new Date('2026-11-17T00:00:00Z'),
    hoSoKham: {
      chanDoan: 'Test',
      luotKham: {
        benhNhan: { id: 1, hoTen: 'Bệnh nhân test', maBenhNhan: 'BN-TEST' },
        bacSi: null,
      },
    },
    chiTiet: [1, 2].map((id) => ({
      id,
      thuocId: id + 10,
      soLuong: 2,
      chiTietCapThuoc: [],
      thuoc: {
        id: id + 10,
        tenThuoc: `Thuốc test ${id}`,
        donViTinh: 'Viên',
        loThuoc: [],
      },
    })),
  } as unknown as DispensingPrescription;
  const repository = {
    findById: jest
      .fn<Promise<DispensingPrescription | null>, [number]>()
      .mockResolvedValue(current),
    dispense: jest
      .fn<
        ReturnType<DispensingRepository['dispense']>,
        Parameters<DispensingRepository['dispense']>
      >()
      .mockResolvedValue({
        ...current,
        trangThai: TrangThaiDonThuoc.DA_CAP_THUOC,
      }),
  };
  const audit = { record: jest.fn() };
  const realtime = { emitToRoom: jest.fn() };
  const notifications = { notifyRoles: jest.fn() };
  const service = new DispensingService(
    repository as unknown as DispensingRepository,
    audit as unknown as AuditLogsService,
    realtime as unknown as RealtimeService,
    notifications as unknown as ThongBaoService,
  );
  const run = (items: DispenseLineDto[]) =>
    service.dispense(10, { items, notes: 'Test' }, 5);
  const expectNoWrites = () => {
    expect(repository.dispense).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(realtime.emitToRoom).not.toHaveBeenCalled();
    expect(notifications.notifyRoles).not.toHaveBeenCalled();
  };
  return {
    current,
    repository,
    service,
    run,
    expectNoWrites,
    realtime,
    audit,
    notifications,
  };
}

describe('Bước 2 — request cấp thuốc đầy đủ, không trùng (mock)', () => {
  it.each([
    ['thiếu một dòng', [line(1)]],
    ['request rỗng', []],
    ['trùng dòng và thiếu dòng khác dù đủ số phần tử', [line(1), line(1)]],
    ['đủ dòng nhưng lặp thêm một dòng', [line(1), line(2), line(1)]],
    ['ID dòng không thuộc đơn', [line(1), line(99)]],
    ['số lượng cấp thiếu', [line(1, 1), line(2)]],
    ['số lượng cấp thừa', [line(1, 3), line(2)]],
  ] as Array<[string, DispenseLineDto[]]>)(
    'từ chối %s trước khi ghi dữ liệu',
    async (_name, items) => {
      const { run, expectNoWrites } = setup();
      await expect(run(items)).rejects.toBeInstanceOf(BadRequestException);
      expectNoWrites();
    },
  );

  it('không cấp đơn không có dòng thuốc', async () => {
    const { current, run, expectNoWrites } = setup();
    current.chiTiet = [];
    await expect(run([])).rejects.toBeInstanceOf(BadRequestException);
    expectNoWrites();
  });

  it('chấp nhận đủ dòng theo thứ tự khác, chia nhiều lô đúng số lượng', async () => {
    const { run, repository, realtime, audit, notifications } = setup();
    const result = await run([
      line(2),
      {
        prescriptionItemId: 1,
        batches: [
          { batchId: 101, quantity: 1 },
          { batchId: 103, quantity: 1 },
        ],
      },
    ]);
    expect(repository.dispense).toHaveBeenCalledTimes(1);
    expect(repository.dispense).toHaveBeenCalledWith({
      id: 10,
      pharmacistId: 5,
      notes: 'Test',
      allocations: [
        { prescriptionItemId: 2, medicineId: 12, batchId: 102, quantity: 2 },
        { prescriptionItemId: 1, medicineId: 11, batchId: 101, quantity: 1 },
        { prescriptionItemId: 1, medicineId: 11, batchId: 103, quantity: 1 },
      ],
    });
    expect(result.data.status).toBe(TrangThaiDonThuoc.DA_CAP_THUOC);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(realtime.emitToRoom).toHaveBeenCalledTimes(1);
    expect(notifications.notifyRoles).toHaveBeenCalledTimes(1);
  });

  it('giữ kiểm tra đơn không tồn tại', async () => {
    const { repository, run, expectNoWrites } = setup();
    repository.findById.mockResolvedValue(null);
    await expect(run([line(1), line(2)])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expectNoWrites();
  });

  it('giữ kiểm tra trạng thái đơn', async () => {
    const { current, run, expectNoWrites } = setup();
    current.trangThai = TrangThaiDonThuoc.DA_CAP_THUOC;
    await expect(run([line(1), line(2)])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expectNoWrites();
  });

  it('repository thất bại thì không phát thành công hay ghi audit thành công', async () => {
    const { repository, run, audit, realtime, notifications } = setup();
    repository.dispense.mockRejectedValue(new Error('BATCH_STOCK_CHANGED'));
    await expect(run([line(1), line(2)])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(audit.record).not.toHaveBeenCalled();
    expect(realtime.emitToRoom).not.toHaveBeenCalled();
    expect(notifications.notifyRoles).not.toHaveBeenCalled();
  });
});
