import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong, Prisma } from '@prisma/client';

import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { SpecialtyQueryDto } from './dto/specialty-query.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import {
  SPECIALTY_REPOSITORY,
  SpecialtyWithDoctorCount,
} from './repositories/specialty.repository.interface';
import type { SpecialtyRepository } from './repositories/specialty.repository.interface';

@Injectable()
export class SpecialtiesService {
  constructor(
    @Inject(SPECIALTY_REPOSITORY)
    private readonly specialtyRepository: SpecialtyRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: chuyên khoa
  async findAll(query: SpecialtyQueryDto) {
    const specialties = await this.specialtyRepository.findAll(
      query.search?.trim(),
      query.status,
    );

    return {
      message: 'Lấy danh sách chuyên khoa thành công',
      data: specialties.map((specialty) => this.toResponse(specialty)),
      meta: { total: specialties.length },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: chuyên khoa
  async findOne(id: number) {
    const specialty = await this.getExisting(id);

    return {
      message: 'Lấy thông tin chuyên khoa thành công',
      data: this.toResponse(specialty),
    };
  }

  // Tạo mới dữ liệu cho chức năng: chuyên khoa
  async create(dto: CreateSpecialtyDto, currentUserId: number) {
    await this.ensureUnique(dto.code, dto.name);
    const specialty = await this.specialtyRepository.create({
      maChuyenKhoa: dto.code.trim().toUpperCase(),
      tenChuyenKhoa: dto.name.trim(),
      moTa: dto.description?.trim() || null,
      phiKham: dto.examinationFee,
      trangThai: dto.status,
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.CHUYEN_KHOA,
      'Thêm chuyên khoa',
      `Tạo chuyên khoa ${specialty.maChuyenKhoa} - ${specialty.tenChuyenKhoa}`,
    );

    return {
      message: 'Thêm chuyên khoa thành công',
      data: this.toResponse(specialty),
    };
  }

  // Cập nhật dữ liệu cho chức năng: chuyên khoa
  async update(id: number, dto: UpdateSpecialtyDto, currentUserId: number) {
    const current = await this.getExisting(id);
    const code = dto.code?.trim().toUpperCase() ?? current.maChuyenKhoa;
    const name = dto.name?.trim() ?? current.tenChuyenKhoa;
    await this.ensureUnique(code, name, id);

    const specialty = await this.specialtyRepository.update(
      id,
      {
        ...(dto.code !== undefined ? { maChuyenKhoa: code } : {}),
        ...(dto.name !== undefined ? { tenChuyenKhoa: name } : {}),
        ...(dto.description !== undefined
          ? { moTa: dto.description.trim() || null }
          : {}),
        ...(dto.examinationFee !== undefined
          ? { phiKham: dto.examinationFee }
          : {}),
        ...(dto.status !== undefined ? { trangThai: dto.status } : {}),
      },
      current.tenChuyenKhoa,
      dto.examinationFee !== undefined,
    );
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.CHUYEN_KHOA,
      'Cập nhật chuyên khoa',
      `Cập nhật chuyên khoa ${specialty.maChuyenKhoa} - ${specialty.tenChuyenKhoa}`,
    );

    return {
      message: 'Cập nhật chuyên khoa thành công',
      data: this.toResponse(specialty),
    };
  }

  // Xóa dữ liệu cho chức năng: chuyên khoa
  async remove(id: number, currentUserId: number) {
    const specialty = await this.getExisting(id);
    if (specialty._count.bacSi > 0) {
      throw new BadRequestException(
        `Không thể xóa chuyên khoa vì đang có ${specialty._count.bacSi} bác sĩ trực thuộc. Hãy chuyển chuyên khoa sang trạng thái ngừng hoạt động.`,
      );
    }

    try {
      await this.specialtyRepository.delete(id);
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: unknown }).code
          : null;
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2003' || error.code === 'P2014')) ||
        errorCode === 'P2003' ||
        errorCode === 'P2014'
      ) {
        throw new BadRequestException(
          'Không thể xóa chuyên khoa vì đang có phòng khám, lịch hẹn hoặc dữ liệu khám liên quan. Hãy chuyển chuyên khoa sang trạng thái ngừng hoạt động.',
        );
      }
      throw error;
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.CHUYEN_KHOA,
      'Xóa chuyên khoa',
      `Xóa chuyên khoa ${specialty.maChuyenKhoa} - ${specialty.tenChuyenKhoa}`,
    );

    return {
      message: 'Xóa chuyên khoa thành công',
      data: { id },
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: chuyên khoa
  private async getExisting(id: number) {
    const specialty = await this.specialtyRepository.findById(id);
    if (!specialty) {
      throw new NotFoundException('Không tìm thấy chuyên khoa');
    }
    return specialty;
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: chuyên khoa
  private async ensureUnique(code: string, name: string, excludeId?: number) {
    const conflict = await this.specialtyRepository.findConflict(
      code.trim().toUpperCase(),
      name.trim(),
      excludeId,
    );
    if (conflict) {
      throw new ConflictException(
        conflict.maChuyenKhoa === code.trim().toUpperCase()
          ? 'Mã chuyên khoa đã tồn tại'
          : 'Tên chuyên khoa đã tồn tại',
      );
    }
  }

  private toResponse(specialty: SpecialtyWithDoctorCount) {
    return {
      id: specialty.id,
      code: specialty.maChuyenKhoa,
      name: specialty.tenChuyenKhoa,
      description: specialty.moTa,
      examinationFee: Number(specialty.phiKham),
      status: specialty.trangThai,
      doctorCount: specialty._count.bacSi,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
    };
  }
}
