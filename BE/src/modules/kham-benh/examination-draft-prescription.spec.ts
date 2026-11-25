import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { SaveExaminationDto } from './dto/save-examination.dto';
import { ExaminationsService } from './examinations.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrismaExaminationRepository } from './repositories/prisma-examination.repository';

// Chạy service và repository thật với transaction giả lập; không kết nối database.
function setup() {
  const patient = { id: 3, maBenhNhan: 'TEST', hoTen: 'Test', soDienThoai: '' };
  const record = {
    id: 7,
    updatedAt: new Date('2026-11-17T00:00:00Z'),
    luotKham: {
      benhNhan: patient,
      bacSi: { id: 2, hoTen: 'Test', chuyenKhoa: { tenChuyenKhoa: 'Test' } },
    },
    donThuoc: {
      id: 8,
      maDonThuoc: 'DT-TEST',
      trangThai: 'CHO_CAP_THUOC',
      chiTiet: [
        {
          id: 9,
          thuoc: { id: 10, maThuoc: 'T', tenThuoc: 'Test', donViTinh: 'Viên' },
          soLuong: 2,
          lieuDung: '1 viên',
          tanSuat: '1 lần/ngày',
          soNgaySuDung: 2,
          huongDanSuDung: 'Sau ăn',
          donGia: new Prisma.Decimal(100),
          thanhTien: new Prisma.Decimal(200),
        },
      ],
    } as {
      id: number;
      maDonThuoc: string;
      trangThai: string;
      chiTiet: object[];
    } | null,
  };
  const visit = {
    id: 4,
    bacSiId: 2,
    chuyenKhoaId: 1,
    trangThai: 'DA_VAO_PHONG',
    chuyenKhoa: { maChuyenKhoa: '101' },
    hoSoKham: { trangThai: 'BAN_NHAP' },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 4 }]),
    luotKham: { findUniqueOrThrow: jest.fn().mockResolvedValue(visit) },
    hoSoKham: {
      upsert: jest.fn().mockResolvedValue(record),
      findUniqueOrThrow: jest
        .fn()
        .mockImplementation(() => Promise.resolve(record)),
    },
    donThuoc: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(record.donThuoc)),
      delete: jest.fn().mockImplementation(() => {
        record.donThuoc = null;
      }),
      upsert: jest.fn().mockResolvedValue({ id: 8 }),
    },
    chiTietDonThuoc: {
      deleteMany: jest.fn().mockImplementation(() => {
        if (record.donThuoc) record.donThuoc.chiTiet = [];
      }),
      createMany: jest.fn(),
    },
  };
  const prisma = {
    bacSi: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
    luotKham: { findUnique: jest.fn().mockResolvedValue(visit) },
    thuoc: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 10,
          tenThuoc: 'Test',
          giaBan: new Prisma.Decimal(100),
          trangThai: 'DANG_HOAT_DONG',
        },
      ]),
    },
    $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
  };
  const repository = new PrismaExaminationRepository(
    prisma as unknown as PrismaService,
  );
  const service = new ExaminationsService(
    repository,
    {} as RealtimeService,
    {} as ThongBaoService,
    {
      refreshWarnings: jest.fn().mockResolvedValue([]),
      ensureNoPendingCriticalWarning: jest.fn().mockResolvedValue(undefined),
    } as unknown as PrescriptionSafetyService,
  );
  return { tx, record, visit, service, repository };
}

describe.each(['visit', 'appointment'] as const)('Lưu nháp qua %s', (route) => {
  function run(service: ExaminationsService, dto: SaveExaminationDto) {
    return route === 'visit'
      ? service.saveDraftByVisit(1, 4, dto)
      : service.saveDraft(1, 5, dto);
  }

  it.each([{}, { prescription: undefined }, { prescription: null }])(
    'không xóa thuốc khi không cung cấp mảng thuốc: %j',
    async (input) => {
      const { service, tx, record } = setup();
      const previous = JSON.stringify(record.donThuoc);
      const result = await run(service, {
        ...input,
        diagnosis: 'Mới',
        icd10Code: 'R51',
      } as SaveExaminationDto);
      expect(tx.chiTietDonThuoc.deleteMany).not.toHaveBeenCalled();
      expect(tx.donThuoc.delete).not.toHaveBeenCalled();
      expect(JSON.stringify(record.donThuoc)).toEqual(previous);
      expect(result.data.prescription?.items).toHaveLength(1);
      expect(tx.hoSoKham.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ chanDoan: 'Mới', maIcd10: 'R51' }),
        }),
      );
    },
  );

  it('chỉ xóa thuốc khi gửi mảng rỗng tường minh', async () => {
    const { service, tx } = setup();
    const result = await run(service, { prescription: [] });
    expect(tx.chiTietDonThuoc.deleteMany).toHaveBeenCalledWith({
      where: { donThuocId: 8 },
    });
    expect(tx.donThuoc.delete).toHaveBeenCalledWith({ where: { id: 8 } });
    expect(result.data.prescription).toBeNull();
  });

  it('vẫn thay các dòng khi gửi mảng có thuốc, dùng giá từ repository', async () => {
    const { service, tx } = setup();
    await run(service, {
      prescription: [
        {
          medicineId: 10,
          quantity: 3,
          dosage: '1 viên',
          frequency: '1 lần/ngày',
          days: 3,
        },
      ],
    });
    expect(tx.chiTietDonThuoc.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          thuocId: 10,
          soLuong: 3,
          donGia: new Prisma.Decimal(100),
          thanhTien: new Prisma.Decimal(300),
        }),
      ],
    });
    expect(tx.donThuoc.delete).not.toHaveBeenCalled();
  });

  it('không cho bác sĩ khác lưu nháp', async () => {
    const { service, tx, visit } = setup();
    visit.bacSiId = 99;
    await expect(run(service, {})).rejects.toThrow(
      'Lượt khám không được phân cho bác sĩ hiện tại',
    );
    expect(tx.hoSoKham.upsert).not.toHaveBeenCalled();
  });
  it('autosave trễ không ghi lại hồ sơ đã hoàn tất sau khi lấy khóa', async () => {
    const { service, tx } = setup();
    tx.luotKham.findUniqueOrThrow.mockResolvedValue({
      trangThai: 'DA_HOAN_TAT',
      hoSoKham: { trangThai: 'DA_HOAN_TAT' },
    });
    await expect(run(service, { prescription: [] })).rejects.toThrow(
      'Lượt khám đã đóng',
    );
    expect(tx.hoSoKham.upsert).not.toHaveBeenCalled();
    expect(tx.donThuoc.delete).not.toHaveBeenCalled();
  });

  it.each(['lieuDung', 'huongDanSuDung'])(
    'hoàn tất thiếu prescription vẫn kiểm tra %s của đơn đang giữ',
    async (field) => {
      const { service, record, repository } = setup();
      Object.assign(record.donThuoc!.chiTiet[0], { [field]: '' });
      const complete = jest
        .spyOn(repository, 'markComplete')
        .mockRejectedValue(new Error('Đã gọi hoàn tất dù đơn thiếu thông tin'));
      const dto = {
        symptoms: 'Đau',
        diagnosis: 'Test',
        conclusion: 'Theo dõi',
      };
      await expect(
        route === 'visit'
          ? service.completeByVisit(1, 4, dto)
          : service.complete(1, 5, dto),
      ).rejects.toThrow(
        field === 'lieuDung'
          ? 'Vui lòng nhập liều dùng'
          : 'Vui lòng nhập cách dùng',
      );
      expect(complete).not.toHaveBeenCalled();
    },
  );
});
