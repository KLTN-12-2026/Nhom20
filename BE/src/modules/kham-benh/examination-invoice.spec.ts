import { Prisma, TrangThaiHoaDon } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PrismaExaminationRepository } from './repositories/prisma-examination.repository';

function setup(
  hasPrescription = false,
  status: TrangThaiHoaDon = TrangThaiHoaDon.CHUA_THANH_TOAN,
) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 4 }]),
    chiDinhDichVu: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    chiTietHoaDon: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      createMany: jest.fn(),
    },
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
      findUnique: jest
        .fn()
        .mockResolvedValue(
          status === TrangThaiHoaDon.DA_THANH_TOAN ||
            status === TrangThaiHoaDon.DA_HUY
            ? { id: 9, maHoaDon: 'HD-test', trangThai: status }
            : null,
        ),
      upsert: jest
        .fn()
        .mockResolvedValue({ id: 9, maHoaDon: 'HD-test', trangThai: status }),
      update: jest.fn(),
    },
  };
  const repository = new PrismaExaminationRepository({
    $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService);
  return { tx, run: () => repository.markComplete(1, 4, 7) };
}

describe('Bước 2 — hoàn tất khám không thuốc (mock)', () => {
  it.each([false, true])(
    'Bước 6: ghi phí chỉ định hoàn tất với thuốc=%s',
    async (hasPrescription) => {
      const { tx, run } = setup(hasPrescription);
      tx.chiDinhDichVu.findMany.mockResolvedValue([
        {
          id: 12,
          dichVuId: 3,
          donGiaSnapshot: new Prisma.Decimal(70),
          dichVu: { maDichVu: 'XQ', tenDichVu: 'X-quang' },
        },
      ]);
      await run();
      expect(tx.chiTietHoaDon.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              chiDinhDichVuId: 12,
              hoaDonId: 9,
              donGia: new Prisma.Decimal(70),
            }),
          ],
        }),
      );
      expect(tx.hoaDon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phiDichVu: { increment: new Prisma.Decimal(70) },
            tongTien: { increment: new Prisma.Decimal(70) },
          }),
        }),
      );
      expect(tx.chiDinhDichVu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { luotKhamId: 4, trangThai: 'DA_HOAN_TAT' },
        }),
      );
    },
  );
  it('gọi lại với dòng phí đã tồn tại không tạo trùng', async () => {
    const { tx, run } = setup();
    tx.chiDinhDichVu.findMany.mockResolvedValue([
      {
        id: 12,
        dichVuId: 3,
        donGiaSnapshot: new Prisma.Decimal(70),
        dichVu: { maDichVu: 'XQ', tenDichVu: 'X-quang' },
      },
    ]);
    tx.chiTietHoaDon.findMany.mockResolvedValue([
      {
        chiDinhDichVuId: 12,
        hoaDonId: 9,
        dichVuId: 3,
        loaiMuc: 'DICH_VU',
        soLuong: 1,
        donGia: new Prisma.Decimal(70),
        thanhTien: new Prisma.Decimal(70),
      },
    ]);
    await run();
    await run();
    expect(tx.chiTietHoaDon.createMany).not.toHaveBeenCalled();
    expect(tx.hoaDon.update).not.toHaveBeenCalled();
  });
  it('hai lần hoàn tất liên tiếp chỉ ghi một dòng và cộng phí một lần', async () => {
    const { tx, run } = setup();
    const order = {
      id: 12,
      dichVuId: 3,
      donGiaSnapshot: new Prisma.Decimal(70),
      dichVu: { maDichVu: 'XQ', tenDichVu: 'X-quang' },
    };
    tx.chiDinhDichVu.findMany.mockResolvedValue([order]);
    const lines: Array<{
      chiDinhDichVuId: number;
      hoaDonId: number;
      dichVuId: number;
      loaiMuc: string;
      soLuong: number;
      donGia: Prisma.Decimal;
      thanhTien: Prisma.Decimal;
    }> = [];
    tx.chiTietHoaDon.findMany.mockImplementation(async () => lines as never[]);
    tx.chiTietHoaDon.createMany.mockImplementation(
      async (arg: { data: typeof lines }) => {
        lines.push(...arg.data);
      },
    );
    await run();
    await run();
    expect(lines).toHaveLength(1);
    expect(tx.hoaDon.update).toHaveBeenCalledTimes(1);
  });
  it('đã thanh toán nhưng thiếu phí thì báo đối soát, không sửa hóa đơn', async () => {
    const { tx, run } = setup(false, TrangThaiHoaDon.DA_THANH_TOAN);
    tx.chiDinhDichVu.findMany.mockResolvedValue([
      {
        id: 12,
        dichVuId: 3,
        donGiaSnapshot: new Prisma.Decimal(70),
        dichVu: { maDichVu: 'XQ', tenDichVu: 'X-quang' },
      },
    ]);
    await expect(run()).rejects.toThrow('đã thanh toán nhưng thiếu phí');
    expect(tx.chiTietHoaDon.createMany).not.toHaveBeenCalled();
    expect(tx.hoaDon.update).not.toHaveBeenCalled();
    expect(tx.hoSoKham.update).not.toHaveBeenCalled();
  });
  it('có dòng dịch vụ cũ chưa liên kết cùng dịch vụ thì chặn để tránh thu trùng', async () => {
    const { tx, run } = setup();
    tx.chiDinhDichVu.findMany.mockResolvedValue([
      {
        id: 12,
        dichVuId: 3,
        donGiaSnapshot: new Prisma.Decimal(70),
        dichVu: { maDichVu: 'XQ', tenDichVu: 'X-quang' },
      },
    ]);
    tx.chiTietHoaDon.findFirst.mockResolvedValue({ id: 99 });
    await expect(run()).rejects.toThrow('chưa liên kết chỉ định');
    expect(tx.chiTietHoaDon.createMany).not.toHaveBeenCalled();
    expect(tx.hoaDon.update).not.toHaveBeenCalled();
  });
  it('không tự thu phí chỉ định hủy; nếu đã có dòng phí bất thường thì báo đối soát', async () => {
    const { tx, run } = setup();
    tx.chiTietHoaDon.findMany.mockResolvedValue([
      {
        chiDinhDichVuId: 13,
        hoaDonId: 9,
        soLuong: 1,
        donGia: new Prisma.Decimal(70),
        thanhTien: new Prisma.Decimal(70),
      },
    ]);
    await expect(run()).rejects.toThrow('không khớp');
    expect(tx.chiTietHoaDon.createMany).not.toHaveBeenCalled();
    expect(tx.hoaDon.update).not.toHaveBeenCalled();
  });
  it('Bước 5: chặn hoàn tất nếu trạng thái vừa chuyển chờ sau khi service đọc', async () => {
    const { tx, run } = setup();
    tx.luotKham.findUniqueOrThrow.mockResolvedValueOnce({
      trangThai: 'CHO_KET_QUA',
    });
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
  it('có thuốc tạo hóa đơn nháp và chưa báo thu ngân sẵn sàng', async () => {
    const { tx, run } = setup(true);
    const result = await run();
    expect(tx.hoaDon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          trangThai: TrangThaiHoaDon.BAN_NHAP,
        }),
      }),
    );
    expect(result.invoiceForReception).toBeNull();
  });
  it('không ghi đè hóa đơn đã thanh toán hoặc báo sẵn sàng thu thêm', async () => {
    const { tx, run } = setup(false, TrangThaiHoaDon.DA_THANH_TOAN);
    expect((await run()).invoiceForReception).toBeNull();
    expect(tx.hoaDon.upsert).not.toHaveBeenCalled();
  });
  it('hóa đơn hủy thì không chốt hồ sơ', async () => {
    const { tx, run } = setup(false, TrangThaiHoaDon.DA_HUY);
    await expect(run()).rejects.toThrow('Hóa đơn đã bị hủy');
    expect(tx.hoSoKham.update).not.toHaveBeenCalled();
  });
});
