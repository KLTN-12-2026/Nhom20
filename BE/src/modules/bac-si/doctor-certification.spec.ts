import 'reflect-metadata';
import { validate } from 'class-validator';
import { TrangThaiChung } from '@prisma/client';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorsService } from './doctors.service';
import { PrismaDoctorRepository } from './repositories/prisma-doctor.repository';

describe('Chứng chỉ chuyên môn bác sĩ', () => {
  const doctor = {
    id: 1,
    nguoiDungId: 2,
    maBacSi: 'BS-001',
    hoTen: 'Nguyễn Văn An',
    soDienThoai: null,
    hocVi: null,
    chungChi: 'Chứng chỉ kiểm thử',
    soNamKinhNghiem: 2,
    moTa: null,
    trangThai: TrangThaiChung.DANG_HOAT_DONG,
    nguoiDung: {
      email: 'doctor@example.test',
      anhDaiDienUrl: null,
      benhNhan: null,
      _count: {},
    },
    chuyenKhoa: { id: 1, maChuyenKhoa: 'CK', tenChuyenKhoa: 'Khoa' },
    danhGia: [],
    _count: { luotKham: 0, lichHen: 0, danhGia: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repo = {
    specialtyExists: jest.fn().mockResolvedValue(true),
    findConflict: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(doctor),
    findAll: jest.fn().mockResolvedValue([doctor]),
    create: jest.fn().mockResolvedValue(doctor),
    update: jest.fn().mockResolvedValue(doctor),
  };
  const service = new DoctorsService(
    repo as never,
    { hash: jest.fn().mockResolvedValue('hash') } as never,
    {} as never,
    { record: jest.fn() } as never,
  );
  const input: CreateDoctorDto = {
    code: 'BS-001',
    fullName: 'Nguyễn Văn An',
    specialtyId: 1,
    email: 'doctor@example.test',
    initialPassword: 'password123',
  };

  beforeEach(() => jest.clearAllMocks());

  it('tạo có chứng chỉ và trả giá trị trong API', async () => {
    const result = await service.create(
      { ...input, certification: ' Chứng chỉ kiểm thử ' },
      1,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ certification: 'Chứng chỉ kiểm thử' }),
    );
    expect(result.data.certification).toBe('Chứng chỉ kiểm thử');
  });

  it('tạo không có chứng chỉ để null', async () => {
    await service.create(input, 1);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ certification: null }),
    );
  });

  it('cập nhật chứng chỉ và cho phép xóa bằng chuỗi rỗng hoặc null', async () => {
    await service.update(1, { certification: ' Mới ' }, 1);
    expect(repo.update).toHaveBeenLastCalledWith(1, { certification: 'Mới' });
    await service.update(1, { certification: '' }, 1);
    expect(repo.update).toHaveBeenLastCalledWith(1, { certification: null });
    await service.update(1, { certification: null }, 1);
    expect(repo.update).toHaveBeenLastCalledWith(1, { certification: null });
  });

  it('sửa trường khác không ghi đè chứng chỉ', async () => {
    await service.update(1, { academicDegree: 'Thạc sĩ' }, 1);
    expect(repo.update).toHaveBeenCalledWith(1, { academicDegree: 'Thạc sĩ' });
  });

  it('danh sách công khai trả chứng chỉ hiện có', async () => {
    const result = await service.findAll({});
    expect(result.data[0].certification).toBe('Chứng chỉ kiểm thử');
  });

  it('kiểm tra độ dài và kiểu chứng chỉ trong DTO', async () => {
    const valid = Object.assign(new CreateDoctorDto(), input, {
      certification: 'A'.repeat(255),
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = Object.assign(new CreateDoctorDto(), input, {
      certification: 'A'.repeat(256),
    });
    expect(
      (await validate(invalid)).some(
        (error) => error.property === 'certification',
      ),
    ).toBe(true);
    const invalidType = Object.assign(new CreateDoctorDto(), input, {
      certification: 42,
    });
    expect(
      (await validate(invalidType)).some(
        (error) => error.property === 'certification',
      ),
    ).toBe(true);
  });
});

describe('Lưu chứng chỉ qua repository', () => {
  const tx = {
    vaiTro: { upsert: jest.fn().mockResolvedValue({ id: 3 }) },
    nguoiDung: {
      create: jest.fn().mockResolvedValue({ id: 2 }),
      update: jest.fn(),
    },
    bacSi: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ nguoiDungId: 2 }),
      update: jest.fn(),
    },
  };
  const repository = new PrismaDoctorRepository({
    $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('tạo lưu đúng cột chứng chỉ', async () => {
    await repository.create({
      code: 'BS-1',
      fullName: 'Nguyễn Văn An',
      specialtyId: 1,
      phoneNumber: null,
      email: 'a@example.test',
      passwordHash: 'hash',
      academicDegree: null,
      certification: 'Chứng chỉ kiểm thử',
      experienceYears: 0,
      description: null,
      status: TrangThaiChung.DANG_HOAT_DONG,
    });
    expect(tx.bacSi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chungChi: 'Chứng chỉ kiểm thử',
        }) as unknown,
      }),
    );
  });

  it('cập nhật null để xóa, còn thiếu trường thì giữ nguyên', async () => {
    await repository.update(1, { certification: null });
    expect(tx.bacSi.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { chungChi: null } }),
    );
    await repository.update(1, { academicDegree: 'Thạc sĩ' });
    expect(tx.bacSi.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { hocVi: 'Thạc sĩ' } }),
    );
  });
});
