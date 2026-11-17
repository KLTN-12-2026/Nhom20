import { Prisma, TrangThaiHoaDon } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PrismaExaminationRepository } from './repositories/prisma-examination.repository';

function setup(
  hasPrescription = false,
  status: TrangThaiHoaDon = TrangThaiHoaDon.CHUA_THANH_TOAN,
) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 4 }]),
    chiDinhDichVu: { count: jest.fn().mockResolvedValue(0) },
    hoSoKham: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        luotKhamId: 4,
        donThuoc: hasPrescription ? { id: 2 } : null,
      }),
      update: jest.fn(),
    },
    luotKham: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        benhNhanId: 5,
        chuyenKhoa: {
          maChuyenKhoa: 'CK',
          tenChuyenKhoa: 'Test',
          phiKham: new Prisma.Decimal(100),
        },
      }),
      update: jest.fn(),
    },
    phieuHangCho: { updateMany: jest.fn() },
    hoaDon: {
      upsert: jest
        .fn()
        .mockResolvedValue({ id: 9, maHoaDon: 'HD-test', trangThai: status }),
    },
  };
  const repository = new PrismaExaminationRepository({
    $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService);
  return { tx, run: () => repository.markComplete(1, 4, 7) };
}

describe('Bước 2 — hoàn tất khám không thuốc (mock)', () => {
  it('Bước 5: chặn hoàn tất nếu trạng thái vừa chuyển chờ sau khi service đọc', async () => {
    const { tx, run } = setup();
    tx.luotKham.findUniqueOrThrow.mockResolvedValueOnce({ trangThai: 'CHO_KET_QUA' });
    await expect(run()).rejects.toThrow('Hãy tiếp tục lượt khám');
    expect(tx.hoaDon.upsert).not.toHaveBeenCalled();
    expect(tx.hoSoKham.update).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'chặn hoàn tất khi còn chỉ định chờ (có thuốc=%s)',
    async (hasPrescription) => {
      const { tx, run } = setup(hasPrescription);
      tx.chiDinhDichVu.count.mockResolvedValue(1);
      await expect(run()).rejects.toThrow('Còn chỉ định dịch vụ');
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.chiDinhDichVu.count).toHaveBeenCalledWith({
        where: { luotKhamId: 4, trangThai: 'CHO_THUC_HIEN' },
      });
      expect(tx.hoaDon.upsert).not.toHaveBeenCalled();
      expect(tx.hoSoKham.update).not.toHaveBeenCalled();
      expect(tx.luotKham.update).not.toHaveBeenCalled();
    },
  );
  it('tạo hóa đơn phí khám, thuốc 0 và trả thông tin gửi thu ngân', async () => {
    const { tx, run } = setup();
    const result = await run();
    const args = (
      tx.hoaDon.upsert.mock.calls as unknown as Array<[Prisma.HoaDonUpsertArgs]>
    )[0][0];
    expect(args.where).toEqual({ luotKhamId: 4 });
    expect(args.update).toEqual({});
    expect(args.create.tongTien).toEqual(new Prisma.Decimal(100));
    expect(args.create.tienThuoc).toEqual(new Prisma.Decimal(0));
    expect(args.create.chiTiet).toHaveProperty('create.loaiMuc', 'PHI_KHAM');
    expect(result.invoiceForReception).toEqual({ id: 9, code: 'HD-test' });
  });
  it('có thuốc thì chưa tạo hóa đơn tại bước hoàn tất khám', async () => {
    const { tx, run } = setup(true);
    await run();
    expect(tx.hoaDon.upsert).not.toHaveBeenCalled();
  });
  it('không ghi đè hóa đơn đã thanh toán hoặc báo sẵn sàng thu thêm', async () => {
    const { tx, run } = setup(false, TrangThaiHoaDon.DA_THANH_TOAN);
    expect((await run()).invoiceForReception).toBeNull();
    expect(tx.hoaDon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });
  it('hóa đơn hủy thì không chốt hồ sơ', async () => {
    const { tx, run } = setup(false, TrangThaiHoaDon.DA_HUY);
    await expect(run()).rejects.toThrow('Hóa đơn đã bị hủy');
    expect(tx.hoSoKham.update).not.toHaveBeenCalled();
  });
});
