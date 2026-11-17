import { WaitingVisitsService } from './waiting-visits.service';
import {
  WaitingVisitsRepository,
  type WaitingVisit,
  type WaitingVisitTransaction,
} from './repositories/waiting-visits.repository';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { PrismaService } from '../../database/prisma/prisma.service';

function setup() {
  const visit = {
    id: 41,
    bacSiId: 2,
    bacSi: { nguoiDungId: 7 },
    trangThai: 'DA_VAO_PHONG',
    hoSoKham: { trangThai: 'BAN_NHAP' },
    hoaDon: null,
    _count: { chiDinhDichVu: 1 },
  } as WaitingVisit;
  const setStatus = jest
    .fn()
    .mockImplementation((status: WaitingVisit['trangThai']) => {
      visit.trangThai = status;
      return Promise.resolve(visit);
    });
  const repository = {
    withVisit: jest.fn(
      (_id: number, fn: (tx: WaitingVisitTransaction) => unknown) =>
        fn({ visit, setStatus }),
    ),
  };
  const realtime = { emitToRoom: jest.fn() };
  const service = new WaitingVisitsService(
    repository as unknown as WaitingVisitsRepository,
    realtime as unknown as RealtimeService,
  );
  return { visit, setStatus, repository, realtime, service };
}

describe('Bước 5 — chuyển trạng thái chờ (mock)', () => {
  it('chờ rồi tiếp tục đúng ID, không hoàn tất hoặc phát đơn thuốc', async () => {
    const { service, repository, setStatus, visit, realtime } = setup();
    expect((await service.transition(7, 41, 'CHO_KET_QUA')).data).toEqual({
      id: 41,
      status: 'CHO_KET_QUA',
    });
    await service.transition(7, 41, 'CHO_KET_QUA');
    expect(setStatus).toHaveBeenCalledTimes(1);
    visit._count.chiDinhDichVu = 0;
    expect((await service.transition(7, 41, 'DA_VAO_PHONG')).data.status).toBe(
      'DA_VAO_PHONG',
    );
    expect(repository.withVisit.mock.calls.every(([id]) => id === 41)).toBe(
      true,
    );
    expect(
      realtime.emitToRoom.mock.calls.every(
        ([, event]) => event === 'queue.updated',
      ),
    ).toBe(true);
  });
  it('lượt chờ vẫn tiếp tục được khi còn chỉ định; hoàn tất có guard riêng', async () => {
    const { service, visit } = setup();
    visit.trangThai = 'CHO_KET_QUA';
    await expect(
      service.transition(7, 41, 'DA_VAO_PHONG'),
    ).resolves.toHaveProperty('data.status', 'DA_VAO_PHONG');
  });
  it('bác sĩ khác bị từ chối trước khi ghi', async () => {
    const { service, setStatus } = setup();
    await expect(service.transition(8, 41, 'CHO_KET_QUA')).rejects.toThrow(
      'không được phân',
    );
    expect(setStatus).not.toHaveBeenCalled();
  });
  it.each(['DA_HUY', 'DA_HOAN_TAT', 'DANG_CHO', 'DA_DANG_KY'] as const)(
    'không chuyển từ %s',
    async (status) => {
      const { service, visit, setStatus } = setup();
      visit.trangThai = status;
      await expect(service.transition(7, 41, 'CHO_KET_QUA')).rejects.toThrow(
        'Trạng thái',
      );
      expect(setStatus).not.toHaveBeenCalled();
    },
  );
  it.each(['DA_THANH_TOAN', 'DA_HUY'] as const)(
    'không đổi lượt có hóa đơn %s',
    async (status) => {
      const { service, visit, setStatus } = setup();
      visit.hoaDon = { trangThai: status };
      await expect(service.transition(7, 41, 'CHO_KET_QUA')).rejects.toThrow(
        'đã đóng',
      );
      expect(setStatus).not.toHaveBeenCalled();
    },
  );
  it('không chờ khi chưa lưu hồ sơ', async () => {
    const { service, visit } = setup();
    visit.hoSoKham = null;
    await expect(service.transition(7, 41, 'CHO_KET_QUA')).rejects.toThrow(
      'Cần lưu nháp',
    );
  });
  it('không chờ nếu không còn chỉ định chưa xử lý', async () => {
    const { service, visit } = setup();
    visit._count.chiDinhDichVu = 0;
    await expect(service.transition(7, 41, 'CHO_KET_QUA')).rejects.toThrow(
      'Cần lưu nháp',
    );
  });
  it('socket lỗi sau commit không báo ghi thất bại', async () => {
    const { service, realtime } = setup();
    realtime.emitToRoom.mockImplementation(() => {
      throw new Error('mock');
    });
    await expect(
      service.transition(7, 41, 'CHO_KET_QUA'),
    ).resolves.toHaveProperty('data.status', 'CHO_KET_QUA');
  });
  it('repository khóa lượt trước đọc và chỉ cập nhật trạng thái đúng ID', async () => {
    const calls: string[] = [];
    const tx = {
      $queryRaw: jest.fn().mockImplementation(() => {
        calls.push('lock');
      }),
      luotKham: {
        findUnique: jest.fn().mockImplementation(() => {
          calls.push('read');
          return null;
        }),
        update: jest.fn(),
      },
    };
    const repository = new WaitingVisitsRepository({
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaService);
    await repository.withVisit(41, (context) =>
      context.setStatus('CHO_KET_QUA'),
    );
    expect(calls).toEqual(['lock', 'read']);
    expect(tx.luotKham.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { trangThai: 'CHO_KET_QUA' },
    });
  });
  it('list lọc theo bác sĩ đăng nhập, chờ kết quả, không giới hạn ngày hôm nay', async () => {
    const prisma = {
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
      luotKham: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    await new WaitingVisitsRepository(prisma as unknown as PrismaService).list(
      7,
      2,
      10,
    );
    expect(prisma.luotKham.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bacSi: { nguoiDungId: 7 }, trangThai: 'CHO_KET_QUA' },
        skip: 10,
        take: 10,
      }),
    );
  });
});
