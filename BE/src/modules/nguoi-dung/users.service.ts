import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PhanHeNhatKyHeThong,
  Prisma,
  TrangThaiNguoiDung,
} from '@prisma/client';

import { PasswordService } from '../../common/security/password.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import {
  type ManagedUser,
  USER_REPOSITORY,
  type UserRepository,
} from './repositories/user.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: người dùng
  async findAll(query: UserQueryDto) {
    const users = await this.userRepository.findAll(
      query.search?.trim(),
      query.roleCode?.trim().toUpperCase(),
      query.status,
    );
    return {
      message: 'Lấy danh sách người dùng thành công',
      data: users.map((user) => this.toResponse(user)),
      meta: { total: users.length },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: người dùng
  async findOne(id: number) {
    const user = await this.getExisting(id);
    return {
      message: 'Lấy thông tin người dùng thành công',
      data: this.toResponse(user),
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: người dùng
  async getRoleOptions() {
    const roles = await this.userRepository.findRoleOptions();
    return {
      message: 'Lấy danh sách vai trò thành công',
      data: roles.map((role) => ({
        id: role.id,
        code: role.maVaiTro,
        name: role.tenVaiTro,
        description: role.moTa,
      })),
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: người dùng
  async getOwnProfile(id: number) {
    const user = await this.getExisting(id);
    return {
      message: 'Lấy thông tin cá nhân thành công',
      data: this.toResponse(user),
    };
  }

  // Cập nhật dữ liệu cho chức năng: người dùng
  async updateOwnProfile(id: number, dto: UpdateProfileDto) {
    const current = await this.getExisting(id);
    const email = dto.email?.trim().toLowerCase() ?? current.email ?? '';
    const phoneNumber =
      dto.phoneNumber?.trim() ?? current.soDienThoai ?? undefined;
    const isPatient = Boolean(current.benhNhan);
    if (!email && !isPatient) {
      throw new BadRequestException('Tài khoản nhân viên phải có email');
    }
    await this.ensureUnique(email, phoneNumber, id);
    const user = await this.userRepository.updatePersonalProfile(id, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.email !== undefined ? { email } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.dateOfBirth !== undefined
        ? { dateOfBirth: dto.dateOfBirth }
        : {}),
      ...(dto.identityNumber !== undefined
        ? { identityNumber: dto.identityNumber.trim() || null }
        : {}),
      ...(dto.address !== undefined
        ? { address: dto.address.trim() || null }
        : {}),
      ...(dto.healthInsuranceNumber !== undefined
        ? { healthInsuranceNumber: dto.healthInsuranceNumber.trim() || null }
        : {}),
      ...(dto.emergencyContactName !== undefined
        ? { emergencyContactName: dto.emergencyContactName.trim() || null }
        : {}),
      ...(dto.emergencyContactPhone !== undefined
        ? { emergencyContactPhone: dto.emergencyContactPhone.trim() || null }
        : {}),
    });
    await this.auditLogsService.record(
      id,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      'Cập nhật thông tin cá nhân',
      'Thay đổi thông tin hồ sơ của tài khoản đang đăng nhập',
    );
    return {
      message: 'Cập nhật thông tin cá nhân thành công',
      data: this.toResponse(user),
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: người dùng
  async changeOwnPassword(id: number, dto: ChangePasswordDto) {
    const current = await this.getExisting(id);
    if (
      !(await this.passwordService.verify(dto.currentPassword, current.matKhau))
    ) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.userRepository.update(id, { passwordHash });
    await this.auditLogsService.record(
      id,
      PhanHeNhatKyHeThong.XAC_THUC,
      'Đổi mật khẩu',
      'Người dùng thay đổi mật khẩu đăng nhập',
    );
    return {
      message: 'Đổi mật khẩu thành công',
      data: null,
    };
  }

  // Tạo mới dữ liệu cho chức năng: người dùng
  async create(dto: CreateUserDto, currentUserId: number) {
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber?.trim() || null;
    const roleCodes = this.normalizeRoleCodes(dto.roleCodes);

    if (roleCodes.includes('DOCTOR')) {
      throw new BadRequestException(
        'Hãy dùng chức năng Quản lý bác sĩ để tạo tài khoản DOCTOR kèm hồ sơ chuyên môn',
      );
    }

    await this.ensureUnique(email, phoneNumber);
    const roles = await this.getExistingRoles(roleCodes);
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.create({
      fullName: dto.fullName.trim(),
      email,
      phoneNumber,
      passwordHash,
      roleIds: roles.map((role) => role.id),
      status: dto.status ?? TrangThaiNguoiDung.DANG_HOAT_DONG,
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      'Thêm người dùng',
      `Tạo tài khoản ${user.email ?? user.hoTen}`,
    );
    return {
      message: 'Thêm người dùng thành công',
      data: this.toResponse(user),
    };
  }

  // Cập nhật dữ liệu cho chức năng: người dùng
  async update(id: number, dto: UpdateUserDto, currentUserId: number) {
    const current = await this.getExisting(id);
    const email = dto.email?.trim().toLowerCase() ?? current.email ?? '';
    const phoneNumber =
      dto.phoneNumber !== undefined
        ? dto.phoneNumber.trim() || null
        : current.soDienThoai;

    if (!email) {
      throw new BadRequestException('Người dùng quản trị phải có email');
    }
    await this.ensureUnique(email, phoneNumber, id);

    let roleIds: number[] | undefined;
    if (dto.roleCodes) {
      const roleCodes = this.normalizeRoleCodes(dto.roleCodes);
      const currentRoleCodes = current.nguoiDungVaiTro
        .map((item) => item.vaiTro.maVaiTro)
        .sort();
      const rolesChanged =
        currentRoleCodes.join('|') !== [...roleCodes].sort().join('|');

      if (rolesChanged && this.hasLinkedProfile(current)) {
        throw new BadRequestException(
          'Không thể đổi vai trò của tài khoản đã gắn hồ sơ nghiệp vụ',
        );
      }
      if (id === currentUserId && !roleCodes.includes('ADMIN')) {
        throw new ForbiddenException(
          'Bạn không thể tự gỡ vai trò ADMIN của mình',
        );
      }
      const roles = await this.getExistingRoles(roleCodes);
      roleIds = roles.map((role) => role.id);
    }

    if (
      id === currentUserId &&
      dto.status !== undefined &&
      dto.status !== TrangThaiNguoiDung.DANG_HOAT_DONG
    ) {
      throw new ForbiddenException('Bạn không thể tự khóa tài khoản của mình');
    }

    const passwordHash = dto.password
      ? await this.passwordService.hash(dto.password)
      : undefined;
    const user = await this.userRepository.update(id, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.email !== undefined ? { email } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber } : {}),
      ...(passwordHash ? { passwordHash } : {}),
      ...(roleIds ? { roleIds } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      'Cập nhật người dùng',
      `Cập nhật tài khoản ${user.email ?? user.hoTen}`,
    );
    return {
      message: 'Cập nhật người dùng thành công',
      data: this.toResponse(user),
    };
  }

  // Xóa dữ liệu cho chức năng: người dùng
  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new ForbiddenException('Bạn không thể tự xóa tài khoản của mình');
    }
    const user = await this.getExisting(id);
    if (this.hasLinkedProfile(user)) {
      throw new BadRequestException(
        'Không thể xóa tài khoản đã gắn hồ sơ bác sĩ, nhân viên hoặc bệnh nhân',
      );
    }
    try {
      await this.userRepository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Không thể xóa người dùng đang có dữ liệu nghiệp vụ liên quan',
        );
      }
      throw error;
    }
    if (user.anhDaiDienPublicId) {
      await this.cloudinaryService.deleteImage(user.anhDaiDienPublicId);
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      'Xóa người dùng',
      `Xóa tài khoản ${user.email ?? user.hoTen}`,
    );
    return {
      message: 'Xóa người dùng thành công',
      data: { id },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: người dùng
  async uploadAvatar(
    id: number,
    file: Express.Multer.File | undefined,
    currentUserId: number,
  ) {
    const current = await this.getExisting(id);
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện');
    }
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Ảnh chỉ hỗ trợ JPG, PNG hoặc WEBP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ảnh đại diện không được vượt quá 5 MB');
    }

    const uploaded = await this.cloudinaryService.uploadAvatar(file.buffer, id);
    let user: ManagedUser;
    try {
      user = await this.userRepository.updateAvatar(
        id,
        uploaded.secure_url,
        uploaded.public_id,
      );
    } catch (error) {
      await this.cloudinaryService.deleteImage(uploaded.public_id);
      throw error;
    }
    if (current.anhDaiDienPublicId) {
      await this.cloudinaryService.deleteImage(current.anhDaiDienPublicId);
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      currentUserId === id
        ? 'Cập nhật ảnh đại diện cá nhân'
        : 'Cập nhật ảnh đại diện người dùng',
      `Cập nhật ảnh cho tài khoản ${user.email ?? user.hoTen}`,
    );
    return {
      message: 'Cập nhật ảnh đại diện thành công',
      data: this.toResponse(user),
    };
  }

  // Xóa dữ liệu cho chức năng: người dùng
  async removeAvatar(id: number, currentUserId: number) {
    const current = await this.getExisting(id);
    const user = await this.userRepository.updateAvatar(id, null, null);
    if (current.anhDaiDienPublicId) {
      await this.cloudinaryService.deleteImage(current.anhDaiDienPublicId);
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.NGUOI_DUNG,
      currentUserId === id
        ? 'Xóa ảnh đại diện cá nhân'
        : 'Xóa ảnh đại diện người dùng',
      `Xóa ảnh của tài khoản ${user.email ?? user.hoTen}`,
    );
    return {
      message: 'Xóa ảnh đại diện thành công',
      data: this.toResponse(user),
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: người dùng
  private async getExisting(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: người dùng
  private async ensureUnique(
    email: string,
    phoneNumber?: string | null,
    excludeId?: number,
  ) {
    const conflict = await this.userRepository.findConflict(
      email,
      phoneNumber,
      excludeId,
    );
    if (conflict) {
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại');
    }
  }

  private normalizeRoleCodes(roleCodes: string[]) {
    return [...new Set(roleCodes.map((code) => code.trim().toUpperCase()))];
  }

  // Lấy danh sách dữ liệu cho chức năng: người dùng
  private async getExistingRoles(roleCodes: string[]) {
    const roles = await this.userRepository.findRolesByCodes(roleCodes);
    if (roles.length !== roleCodes.length) {
      throw new BadRequestException('Có vai trò không tồn tại');
    }
    return roles;
  }

  private hasLinkedProfile(user: ManagedUser) {
    return Boolean(user.bacSi || user.nhanVien || user.benhNhan);
  }

  private toResponse(user: ManagedUser) {
    return {
      id: user.id,
      fullName: user.hoTen,
      email: user.email,
      phoneNumber: user.soDienThoai,
      avatarUrl: user.anhDaiDienUrl,
      gender: user.gioiTinh,
      dateOfBirth: user.ngaySinh,
      identityNumber: user.soCanCuoc,
      address: user.diaChi,
      healthInsuranceNumber: user.benhNhan?.maTheBaoHiemYTe ?? null,
      emergencyContactName: user.benhNhan?.nguoiLienHeKhanCap ?? null,
      emergencyContactPhone: user.benhNhan?.soDienThoaiKhanCap ?? null,
      status: user.trangThai,
      roles: user.nguoiDungVaiTro.map((item) => ({
        id: item.vaiTro.id,
        code: item.vaiTro.maVaiTro,
        name: item.vaiTro.tenVaiTro,
      })),
      linkedProfiles: {
        doctor: Boolean(user.bacSi),
        staff: Boolean(user.nhanVien),
        patient: Boolean(user.benhNhan),
      },
      lastLoginAt: user.lanDangNhapCuoi,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
