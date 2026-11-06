import { ForbiddenException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import type { MedicineRepository } from './repositories/medicine.repository.interface';
import type { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';

describe('Quyền xóa thuốc theo chức vụ', () => {
  it('từ chối dược sĩ không phải trưởng khoa trước khi xóa thuốc', async () => {
    const repository = { isDepartmentHead: jest.fn().mockResolvedValue(false), delete: jest.fn() };
    const service = new MedicinesService(repository as unknown as MedicineRepository, {} as AuditLogsService, {} as CloudinaryService);
    await expect(service.remove(1, 10)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
