import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong } from '@prisma/client';

import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import {
  ROLE_REPOSITORY,
  type ManagedRole,
  type RoleRepository,
} from './repositories/role.repository.interface';

const MODULE_METADATA: Record<string, { name: string; icon: string }> = {
  NGUOI_DUNG: { name: 'Quản lý người dùng', icon: 'group' },
  BENH_AN: { name: 'Hồ sơ bệnh án', icon: 'medical_services' },
  LICH_HEN: { name: 'Lịch hẹn', icon: 'event' },
  THUOC: { name: 'Quản lý thuốc', icon: 'medication' },
  HOA_DON: { name: 'Hóa đơn và thanh toán', icon: 'payments' },
  BAC_SI: { name: 'Quản lý bác sĩ', icon: 'stethoscope' },
  BENH_NHAN: { name: 'Quản lý bệnh nhân', icon: 'person' },
  CHUYEN_KHOA: { name: 'Quản lý chuyên khoa', icon: 'category' },
  DICH_VU: { name: 'Quản lý dịch vụ', icon: 'medical_information' },
  TIEP_DON: { name: 'Tiếp đón bệnh nhân', icon: 'person_add' },
  CAP_THUOC: { name: 'Cấp thuốc', icon: 'medication_liquid' },
  LICH_LAM_VIEC: { name: 'Lịch làm việc', icon: 'calendar_month' },
  BAN_GIAO_CA: { name: 'Bàn giao ca', icon: 'assignment_turned_in' },
  BAO_CAO: { name: 'Báo cáo và thống kê', icon: 'analytics' },
  DANH_GIA_BAC_SI: { name: 'Đánh giá bác sĩ', icon: 'star_rate' },
  CHATBOX_AI: { name: 'Quản lý Chatbox AI', icon: 'smart_toy' },
  NHAT_KY_HE_THONG: { name: 'Nhật ký hệ thống', icon: 'history' },
  VAI_TRO: { name: 'Vai trò và phân quyền', icon: 'security' },
  CAI_DAT_HE_THONG: { name: 'Cài đặt hệ thống', icon: 'settings' },
};

@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: vai trò
  async findAll() {
    const [roles, permissions] = await Promise.all([
      this.roleRepository.findAll(),
      this.roleRepository.findPermissions(),
    ]);

    return {
      message: 'Lấy danh sách vai trò và phân quyền thành công',
      data: {
        roles: roles.map((role) => this.toRoleResponse(role)),
        modules: Object.entries(MODULE_METADATA).map(([code, metadata]) => ({
          code,
          ...metadata,
          permissions: permissions
            .filter((permission) => permission.phanHe === code)
            .map((permission) => {
              const action = permission.maQuyen.split('.').at(-1) ?? '';
              return {
                id: permission.id,
                code: permission.maQuyen,
                name: permission.tenQuyen,
                action: action.toLowerCase(),
              };
            }),
        })),
      },
    };
  }

  // Tạo mới dữ liệu cho chức năng: vai trò
  async create(dto: CreateRoleDto, currentUserId: number) {
    const name = dto.name.trim();
    const code = this.createCode(name);
    await this.ensureUnique(code, name);
    const role = await this.roleRepository.create({
      code,
      name,
      description: dto.description?.trim() || null,
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.HE_THONG,
      'Thêm vai trò',
      `Tạo vai trò ${role.maVaiTro} - ${role.tenVaiTro}`,
    );
    return {
      message: 'Thêm vai trò thành công',
      data: this.toRoleResponse(role),
    };
  }

  // Cập nhật dữ liệu cho chức năng: vai trò
  async update(id: number, dto: UpdateRoleDto, currentUserId: number) {
    const current = await this.getExisting(id);
    const name = dto.name?.trim() ?? current.tenVaiTro;
    await this.ensureUnique(current.maVaiTro, name, id);
    const role = await this.roleRepository.update(id, {
      ...(dto.name !== undefined ? { name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() || null }
        : {}),
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.HE_THONG,
      'Cập nhật vai trò',
      `Cập nhật vai trò ${role.maVaiTro} - ${role.tenVaiTro}`,
    );
    return {
      message: 'Cập nhật vai trò thành công',
      data: this.toRoleResponse(role),
    };
  }

  // Cập nhật dữ liệu cho chức năng: vai trò
  async updatePermissions(
    id: number,
    dto: UpdateRolePermissionsDto,
    currentUserId: number,
  ) {
    const current = await this.getExisting(id);
    const permissionCount = await this.roleRepository.countPermissions(
      dto.permissionIds,
    );
    if (permissionCount !== dto.permissionIds.length) {
      throw new BadRequestException('Danh sách quyền có quyền không tồn tại');
    }
    const role = await this.roleRepository.replacePermissions(
      id,
      dto.permissionIds,
    );
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.HE_THONG,
      'Cập nhật phân quyền',
      `Lưu ${dto.permissionIds.length} quyền cho vai trò ${current.tenVaiTro}`,
    );
    return {
      message: 'Lưu cấu hình phân quyền thành công',
      data: this.toRoleResponse(role),
    };
  }

  // Xóa dữ liệu cho chức năng: vai trò
  async remove(id: number, currentUserId: number) {
    const role = await this.getExisting(id);
    if (role._count.nguoiDung > 0) {
      throw new BadRequestException(
        'Không thể xóa vai trò đang được gán cho người dùng',
      );
    }
    await this.roleRepository.delete(id);
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.HE_THONG,
      'Xóa vai trò',
      `Xóa vai trò ${role.maVaiTro} - ${role.tenVaiTro}`,
    );
    return { message: 'Xóa vai trò thành công', data: { id } };
  }

  // Lấy danh sách dữ liệu cho chức năng: vai trò
  private async getExisting(id: number) {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    return role;
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: vai trò
  private async ensureUnique(code: string, name: string, excludeId?: number) {
    const conflict = await this.roleRepository.findConflict(
      code,
      name,
      excludeId,
    );
    if (conflict) {
      throw new ConflictException('Tên hoặc mã vai trò đã tồn tại');
    }
  }

  private createCode(name: string) {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
    return normalized || `ROLE_${Date.now()}`;
  }

  private toRoleResponse(role: ManagedRole) {
    return {
      id: role.id,
      code: role.maVaiTro,
      name: role.tenVaiTro,
      description: role.moTa,
      userCount: role._count.nguoiDung,
      permissionIds: role.quyen.map((item) => item.quyenId),
      enabledPermissionCount: role.quyen.length,
    };
  }
}
