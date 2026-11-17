import { Prisma, TrangThaiHoaDon } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PrismaDispensingRepository } from './repositories/prisma-dispensing.repository';

const money = (value: number) => new Prisma.Decimal(value);

// Kiểm tra hợp đồng cập nhật hóa đơn bằng mock; không ghi database.
function setup(
  status: TrangThaiHoaDon = TrangThaiHoaDon.CHUA_THANH_TOAN,
  exists = true,
) {
  const existing = {
    id: 20,
    trangThai: status,
    tienKham: money(100),
    tienThuoc: money(30),
    phiDichVu: money(70),
    soTienGiam: money(10),
    tongTien: money(190),
  };
  const prescription = {
    id: 1,
    chiTiet: [
      {
        id: 2,
        thuocId: 3,
        soLuong: 2,
        donGia: money(25),
        thanhTien: money(50),
        thuoc: { maThuoc: 'T1', tenThuoc: 'Thuốc test' },
      },
    ],
    hoSoKham: {
      luotKham: {
        id: 4,
        benhNhanId: 5,
        chuyenKhoa: {
          phiKham: money(120),
          maChuyenKhoa: 'CK',
          tenChuyenKhoa: 'Test',
        },
      },
    },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    loThuoc: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 6,
        thuocId: 3,
        soLuongConLai: 20,
        hanDung: new Date('2099-01-01'),
      }),
      update: jest.fn().mockResolvedValue({ soLuongConLai: 18 }),
    },
    thuoc: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 3, soLuongTon: 20 }),
      update: jest.fn().mockResolvedValue({ soLuongTon: 18 }),
    },
    chiTietCapThuoc: { create: jest.fn() },
    giaoDichKho: { create: jest.fn() },
    donThuoc: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(prescription),
      update: jest.fn().mockResolvedValue(prescription),
    },
    hoaDon: {
      findUnique: jest.fn().mockResolvedValue(exists ? existing : null),
      update: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue(existing),
    },
    chiTietHoaDon: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(exists ? { id: 10 } : null),
    },
  };
  const transaction = jest.fn((fn: (db: typeof tx) => unknown) => fn(tx));
  const repository = new PrismaDispensingRepository({
    $transaction: transaction,
  } as unknown as PrismaService);
  const run = () =>
    repository.dispense({
      id: 1,
      pharmacistId: 9,
      allocations: [
        { prescriptionItemId: 2, medicineId: 3, batchId: 6, quantity: 2 },
      ],
    });
  return { tx, transaction, run };
}

describe('Bước 2 — bảo vệ khoản phí khi cấp thuốc (mock)', () => {
  it('chỉ xóa dòng thuốc, không xóa phí dịch vụ/phụ thu', async () => {
    const { tx, run } = setup();
    await run();
    expect(tx.chiTietHoaDon.deleteMany).toHaveBeenCalledWith({
      where: { hoaDonId: 20, loaiMuc: 'TIEN_THUOC' },
    });
  });
  it('giữ phí khám snapshot, dịch vụ, giảm giá; chỉ thay tiền thuốc trong tổng', async () => {
    const { tx, run } = setup();
    await run();
    const calls = tx.hoaDon.update.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const data = calls[0][0].data;
    expect(data).not.toHaveProperty('phiDichVu');
    expect(data).not.toHaveProperty('tienKham');
    expect(data).not.toHaveProperty('soTienGiam');
    expect(String(data.tongTien)).toBe('210');
    expect(String(data.tienThuoc)).toBe('50');
  });
  it('không thêm trùng phí khám đã có', async () => {
    const { tx, run } = setup();
    await run();
    expect(
      (
        tx.chiTietHoaDon.createMany.mock.calls as unknown as Array<
          [{ data: Array<{ loaiMuc: string }> }]
        >
      )[0][0].data.filter(
        (row: { loaiMuc: string }) => row.loaiMuc === 'PHI_KHAM',
      ),
    ).toHaveLength(0);
  });
  it('tạo hóa đơn mới có đúng phí khám và tiền thuốc', async () => {
    const { tx, run } = setup(undefined, false);
    await run();
    const calls = tx.hoaDon.create.mock.calls as unknown as Array<
      [{ data: { tongTien: Prisma.Decimal } }]
    >;
    expect(String(calls[0][0].data.tongTien)).toBe('170');
    expect(
      (
        tx.chiTietHoaDon.createMany.mock.calls as unknown as Array<
          [{ data: Array<{ loaiMuc: string }> }]
        >
      )[0][0].data.filter(
        (row: { loaiMuc: string }) => row.loaiMuc === 'PHI_KHAM',
      ),
    ).toHaveLength(1);
  });
  it.each([TrangThaiHoaDon.DA_THANH_TOAN, TrangThaiHoaDon.DA_HUY])(
    'không sửa hóa đơn %s',
    async (status) => {
      const { tx, run } = setup(status);
      await expect(run()).rejects.toThrow();
      expect(tx.hoaDon.update).not.toHaveBeenCalled();
      expect(tx.chiTietHoaDon.deleteMany).not.toHaveBeenCalled();
      expect(tx.donThuoc.update).not.toHaveBeenCalled();
    },
  );
  it('giữ transaction Serializable và thao tác trừ lô/tồn kho hiện có', async () => {
    const { tx, transaction, run } = setup();
    await run();
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(tx.loThuoc.update).toHaveBeenCalledWith({
      where: { id: 6 },
      data: { soLuongConLai: { decrement: 2 } },
    });
    expect(tx.thuoc.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { soLuongTon: { decrement: 2 } },
    });
  });
});
