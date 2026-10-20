import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong, Prisma, TrangThaiChung } from '@prisma/client';

import { PasswordService } from '../../common/security/password.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import {
  DOCTOR_REPOSITORY,
  type DoctorRepository,
  type DoctorWithRelations,
} from './repositories/doctor.repository.interface';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DOCTOR_REPOSITORY)
    private readonly doctorRepository: DoctorRepository,
    private readonly passwordService: PasswordService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  // Lấy danh sách dữ liệu cho chức năng: bác sĩ
  async findAll(query: DoctorQueryDto) {
    const doctors = await this.doctorRepository.findAll(
      query.search?.trim(),
      query.status,
      query.specialtyId,
    );
    return {
      message: 'Lấy danh sách bác sĩ thành công',
      data: doctors.map((doctor) => this.toResponse(doctor)),
      meta: { total: doctors.length },
    };
  }

  async findAvailable(dateString: string, specialtyId?: number) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ');
    }
    const doctors = await this.doctorRepository.findAvailable(date, specialtyId);
    return {
      message: 'Lấy danh sách bác sĩ đi làm thành công',
      data: doctors.map((doctor) => this.toResponse(doctor)),
    };
  }

  // Lấy thông tin chi tiết cho chức năng: bác sĩ
  async findOne(id: number) {
    const doctor = await this.getExisting(id);
    return {
      message: 'Lấy thông tin bác sĩ thành công',
      data: this.toResponse(doctor),
    };
  }

  // Tạo mới dữ liệu cho chức năng: bác sĩ
  async create(dto: CreateDoctorDto, currentUserId: number) {
    const normalized = this.normalizeCreateDto(dto);
    await this.ensureSpecialty(normalized.specialtyId);
    await this.ensureUnique(
      normalized.code,
      normalized.email,
      normalized.phoneNumber,
    );
    const passwordHash = await this.passwordService.hash(dto.initialPassword);
    const doctor = await this.doctorRepository.create({
      ...normalized,
      passwordHash,
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.BAC_SI,
      'Thêm bác sĩ',
      `Tạo bác sĩ ${doctor.maBacSi} - ${doctor.hoTen}`,
    );
    return {
      message: 'Thêm bác sĩ và tạo tài khoản DOCTOR thành công',
      data: this.toResponse(doctor),
    };
  }

  // Cập nhật dữ liệu cho chức năng: bác sĩ
  async update(id: number, dto: UpdateDoctorDto, currentUserId: number) {
    const current = await this.getExisting(id);
    const code = dto.code?.trim().toUpperCase() ?? current.maBacSi;
    const email =
      dto.email?.trim().toLowerCase() ?? current.nguoiDung.email ?? '';
    const phoneNumber =
      dto.phoneNumber !== undefined
        ? dto.phoneNumber.trim() || null
        : current.soDienThoai;
    const specialtyId = dto.specialtyId ?? current.chuyenKhoaId;

    await this.ensureSpecialty(specialtyId);
    await this.ensureUnique(code, email, phoneNumber, id);

    const passwordHash = dto.initialPassword
      ? await this.passwordService.hash(dto.initialPassword)
      : undefined;
    const doctor = await this.doctorRepository.update(id, {
      ...(dto.code !== undefined ? { code } : {}),
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.specialtyId !== undefined ? { specialtyId } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber } : {}),
      ...(dto.email !== undefined ? { email } : {}),
      ...(passwordHash ? { passwordHash } : {}),
      ...(dto.academicDegree !== undefined
        ? { academicDegree: dto.academicDegree.trim() || null }
        : {}),
      ...(dto.experienceYears !== undefined
        ? { experienceYears: dto.experienceYears }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() || null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.BAC_SI,
      'Cập nhật bác sĩ',
      `Cập nhật bác sĩ ${doctor.maBacSi} - ${doctor.hoTen}`,
    );
    return {
      message: 'Cập nhật bác sĩ thành công',
      data: this.toResponse(doctor),
    };
  }

  // Xóa dữ liệu cho chức năng: bác sĩ
  async remove(id: number, currentUserId: number) {
    const doctor = await this.getExisting(id);
    const relatedRecordCount =
      doctor._count.luotKham +
      doctor._count.hoSoKham +
      doctor._count.donThuoc +
      doctor._count.lichHen +
      doctor._count.danhGia;
    if (relatedRecordCount > 0) {
      throw new BadRequestException(
        `Không thể xóa bác sĩ vì đang có ${relatedRecordCount} lịch hẹn, lượt khám hoặc hồ sơ chuyên môn liên quan. Hãy chuyển bác sĩ sang trạng thái ngừng hoạt động.`,
      );
    }
    try {
      await this.doctorRepository.delete(id);
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
          'Không thể xóa tài khoản bác sĩ vì đang có dữ liệu nhân sự hoặc lịch làm việc liên quan. Hãy chuyển bác sĩ sang trạng thái ngừng hoạt động.',
        );
      }
      throw error;
    }
    if (doctor.nguoiDung.anhDaiDienPublicId) {
      await this.cloudinaryService.deleteImage(
        doctor.nguoiDung.anhDaiDienPublicId,
      );
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.BAC_SI,
      'Xóa bác sĩ',
      `Xóa bác sĩ ${doctor.maBacSi} - ${doctor.hoTen}`,
    );
    return {
      message: 'Xóa bác sĩ và tài khoản liên kết thành công',
      data: { id },
    };
  }

  private normalizeCreateDto(dto: CreateDoctorDto) {
    return {
      code: dto.code.trim().toUpperCase(),
      fullName: dto.fullName.trim(),
      specialtyId: dto.specialtyId,
      phoneNumber: dto.phoneNumber?.trim() || null,
      email: dto.email.trim().toLowerCase(),
      academicDegree: dto.academicDegree?.trim() || null,
      experienceYears: dto.experienceYears ?? 0,
      description: dto.description?.trim() || null,
      status: dto.status ?? TrangThaiChung.DANG_HOAT_DONG,
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: bác sĩ
  private async getExisting(id: number) {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy bác sĩ');
    }
    return doctor;
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: bác sĩ
  private async ensureSpecialty(id: number) {
    if (!(await this.doctorRepository.specialtyExists(id))) {
      throw new BadRequestException('Chuyên khoa không tồn tại');
    }
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: bác sĩ
  private async ensureUnique(
    code: string,
    email: string,
    phoneNumber?: string | null,
    excludeDoctorId?: number,
  ) {
    const conflict = await this.doctorRepository.findConflict(
      code,
      email,
      phoneNumber,
      excludeDoctorId,
    );
    if (conflict) {
      throw new ConflictException(
        'Mã bác sĩ, email hoặc số điện thoại đã tồn tại',
      );
    }
  }

  private toResponse(doctor: DoctorWithRelations) {
    const ratingCount = doctor.danhGia.length;
    const averageRating = ratingCount
      ? doctor.danhGia.reduce((total, review) => total + review.soSao, 0) /
      ratingCount
      : null;
    return {
      id: doctor.id,
      userId: doctor.nguoiDungId,
      code: doctor.maBacSi,
      fullName: doctor.hoTen,
      email: doctor.nguoiDung.email,
      avatarUrl: doctor.nguoiDung.anhDaiDienUrl,
      phoneNumber: doctor.soDienThoai,
      academicDegree: doctor.hocVi,
      experienceYears: doctor.soNamKinhNghiem,
      description: doctor.moTa,
      status: doctor.trangThai,
      specialty: {
        id: doctor.chuyenKhoa.id,
        code: doctor.chuyenKhoa.maChuyenKhoa,
        name: doctor.chuyenKhoa.tenChuyenKhoa,
      },
      examinationCount: doctor._count.luotKham,
      ratingCount,
      averageRating:
        averageRating === null ? null : Number(averageRating.toFixed(1)),
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }
}
