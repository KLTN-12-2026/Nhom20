import { RolesService } from './roles.service';
import type { RoleRepository } from './repositories/role.repository.interface';
import type { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';

describe('Danh mục phân quyền', () => {
  it('trả đủ quyền đã lưu và đánh dấu thao tác chưa hỗ trợ', async () => {
    const repository = {
      findAll: jest.fn().mockResolvedValue([]),
      findPermissions: jest.fn().mockResolvedValue([
        { id: 1, phanHe: 'BENH_NHAN', maQuyen: 'BENH_NHAN.VIEW', tenQuyen: 'Xem' },
        { id: 2, phanHe: 'BENH_NHAN', maQuyen: 'BENH_NHAN.UPDATE', tenQuyen: 'Sửa' },
        { id: 3, phanHe: 'BENH_NHAN', maQuyen: 'BENH_NHAN.DELETE', tenQuyen: 'Xóa' },
      ]),
    };
    const service = new RolesService(
      repository as unknown as RoleRepository,
      {} as AuditLogsService,
    );

    const response = await service.findAll();
    const patientModule = response.data.modules.find((module) => module.code === 'BENH_NHAN');

    expect(patientModule?.permissions).toEqual([
      expect.objectContaining({ id: 1, action: 'view', implemented: true }),
      expect.objectContaining({ id: 2, action: 'update', implemented: false }),
      expect.objectContaining({ id: 3, action: 'delete', implemented: false }),
    ]);
  });

  it('lưu chính xác các quyền được chọn và trả lại cấu hình mới', async () => {
    const role = {
      id: 1,
      maVaiTro: 'ADMIN',
      tenVaiTro: 'Quản trị viên',
      moTa: null,
      _count: { nguoiDung: 1 },
      quyen: [{ quyenId: 1 }, { quyenId: 3 }],
    };
    const repository = {
      findById: jest.fn().mockResolvedValue(role),
      countPermissions: jest.fn().mockResolvedValue(2),
      findPermissions: jest.fn().mockResolvedValue([]),
      replacePermissions: jest.fn().mockResolvedValue(role),
    };
    const auditLogs = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new RolesService(
      repository as unknown as RoleRepository,
      auditLogs as unknown as AuditLogsService,
    );

    const result = await service.updatePermissions(1, { permissionIds: [1, 3] }, 10);

    expect(repository.replacePermissions).toHaveBeenCalledWith(1, [1, 3]);
    expect(result.data.permissionIds).toEqual([1, 3]);
    expect(result.message).toBe('Lưu cấu hình phân quyền thành công');
  });

  it('không cho cấp quyền sửa thuốc cho ADMIN qua API', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ maVaiTro: 'ADMIN' }),
      countPermissions: jest.fn().mockResolvedValue(1),
      findPermissions: jest.fn().mockResolvedValue([{ id: 7, maQuyen: 'THUOC.UPDATE' }]),
      replacePermissions: jest.fn(),
    };
    const service = new RolesService(repository as unknown as RoleRepository, {} as AuditLogsService);
    await expect(service.updatePermissions(1, { permissionIds: [7] }, 10)).rejects.toThrow('thuộc thẩm quyền của dược sĩ');
    expect(repository.replacePermissions).not.toHaveBeenCalled();
  });
});
