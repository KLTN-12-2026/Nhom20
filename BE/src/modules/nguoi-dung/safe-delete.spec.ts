import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DoctorsService } from '../bac-si/doctors.service';
import type { UserRepository } from './repositories/user.repository.interface';
import type { DoctorRepository } from '../bac-si/repositories/doctor.repository.interface';
import type { PasswordService } from '../../common/security/password.service';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';

describe('Bảo vệ dữ liệu khi xóa nhân sự', () => {
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogsService;
  const cloud = {} as CloudinaryService;
  const passwords = {} as PasswordService;

  it('cho phép xóa hồ sơ nhân viên mới chưa có dữ liệu nghiệp vụ', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 2, benhNhan: null, bacSi: null, nhanVien: { id: 1 }, _count: { phanCongCa: 0 }, email: 'test@example.com' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(repository as unknown as UserRepository, passwords, cloud, audit);
    await service.remove(2, 1);
    expect(repository.delete).toHaveBeenCalledWith(2);
  });

  it('chặn xóa khi nhân viên có lịch phân ca', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 2, benhNhan: null, bacSi: null, nhanVien: { id: 1 }, _count: { phanCongCa: 1 } }),
      delete: jest.fn(),
    };
    const service = new UsersService(repository as unknown as UserRepository, passwords, cloud, audit);
    await expect(service.remove(2, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it.each([
    [{ luotKham: 0, lichHen: 1, danhGia: 0 }, { phanCongCa: 0 }],
    [{ luotKham: 0, lichHen: 0, danhGia: 0 }, { phanCongCa: 1 }],
  ])('chặn xóa bác sĩ có lịch hẹn hoặc lịch phân ca', async (doctorCounts, userCounts) => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 2, _count: doctorCounts, nguoiDung: { _count: userCounts } }),
      delete: jest.fn(),
    };
    const service = new DoctorsService(repository as unknown as DoctorRepository, passwords, cloud, audit);
    await expect(service.remove(2, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
