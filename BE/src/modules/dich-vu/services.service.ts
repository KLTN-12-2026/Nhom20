import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong, Prisma } from '@prisma/client';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import {
  SERVICE_REPOSITORY,
  ServiceWithSpecialty,
  type ServiceRepository,
} from './repositories/service.repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly repository: ServiceRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: dịch vụ
  async findAll(query: ServiceQueryDto) {
    const items = await this.repository.findAll(
      query.search?.trim(),
      query.status,
      query.specialtyId,
    );
    return {
      message: 'Lấy danh sách dịch vụ thành công',
      data: items.map((item) => this.toResponse(item)),
      meta: { total: items.length },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: dịch vụ
  async findOne(id: number) {
    return {
      message: 'Lấy thông tin dịch vụ thành công',
      data: this.toResponse(await this.getExisting(id)),
    };
  }

  // Tạo mới dữ liệu cho chức năng: dịch vụ
  async create(dto: CreateServiceDto, userId: number) {
    await this.ensureUnique(dto.code, dto.name);
    const item = await this.repository.create(this.toCreateData(dto));
    await this.auditLogs.record(
      userId,
      PhanHeNhatKyHeThong.DICH_VU,
      'Thêm dịch vụ',
      `Tạo dịch vụ ${item.maDichVu} - ${item.tenDichVu}`,
    );
    return { message: 'Thêm dịch vụ thành công', data: this.toResponse(item) };
  }

  // Cập nhật dữ liệu cho chức năng: dịch vụ
  async update(id: number, dto: UpdateServiceDto, userId: number) {
    const current = await this.getExisting(id);
    const code = dto.code?.trim() ?? current.maDichVu;
    const name = dto.name?.trim() ?? current.tenDichVu;
    await this.ensureUnique(code, name, id);
    // Chỉ đồng bộ khi dịch vụ khám vẫn thuộc đúng chuyên khoa hiện tại.
    const isExaminationService =
      current.chuyenKhoa !== null &&
      name === `Khám ${current.chuyenKhoa.tenChuyenKhoa}` &&
      (dto.specialtyId === undefined || dto.specialtyId === current.chuyenKhoaId);
    const item = await this.repository.update(
      id,
      {
        ...(dto.code !== undefined ? { maDichVu: code } : {}),
        ...(dto.name !== undefined ? { tenDichVu: name } : {}),
        ...(dto.description !== undefined
          ? { moTa: dto.description.trim() || null }
          : {}),
        ...(dto.price !== undefined ? { donGia: dto.price } : {}),
        ...(dto.estimatedMinutes !== undefined
          ? { thoiGianDuKienPhut: dto.estimatedMinutes }
          : {}),
        ...(dto.status !== undefined ? { trangThai: dto.status } : {}),
        ...(dto.specialtyId !== undefined
          ? { chuyenKhoa: { connect: { id: dto.specialtyId } } }
          : {}),
      },
      dto.price !== undefined && isExaminationService,
    );
    await this.auditLogs.record(
      userId,
      PhanHeNhatKyHeThong.DICH_VU,
      'Cập nhật dịch vụ',
      `Cập nhật dịch vụ ${item.maDichVu} - ${item.tenDichVu}`,
    );
    return {
      message: 'Cập nhật dịch vụ thành công',
      data: this.toResponse(item),
    };
  }

  // Xóa dữ liệu cho chức năng: dịch vụ
  async remove(id: number, userId: number) {
    const item = await this.getExisting(id);
    try {
      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      )
        throw new BadRequestException(
          'Dịch vụ đã được sử dụng trong gói khám hoặc hóa đơn. Hãy chuyển sang trạng thái ngừng hoạt động.',
        );
      throw error;
    }
    await this.auditLogs.record(
      userId,
      PhanHeNhatKyHeThong.DICH_VU,
      'Xóa dịch vụ',
      `Xóa dịch vụ ${item.maDichVu} - ${item.tenDichVu}`,
    );
    return { message: 'Xóa dịch vụ thành công', data: { id } };
  }

  // Lấy danh sách dữ liệu cho chức năng: dịch vụ
  private async getExisting(id: number) {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException('Không tìm thấy dịch vụ');
    return item;
  }
  // Kiểm tra điều kiện bắt buộc cho chức năng: dịch vụ
  private async ensureUnique(code: string, name: string, excludeId?: number) {
    const conflict = await this.repository.findConflict(
      code.trim(),
      name.trim(),
      excludeId,
    );
    if (conflict)
      throw new ConflictException(
        conflict.maDichVu === code.trim()
          ? 'Mã dịch vụ đã tồn tại'
          : 'Tên dịch vụ đã tồn tại',
      );
  }
  private toCreateData(dto: CreateServiceDto): Prisma.DichVuCreateInput {
    return {
      maDichVu: dto.code.trim(),
      tenDichVu: dto.name.trim(),
      moTa: dto.description?.trim() || null,
      donGia: dto.price,
      thoiGianDuKienPhut: dto.estimatedMinutes,
      trangThai: dto.status,
      ...(dto.specialtyId
        ? { chuyenKhoa: { connect: { id: dto.specialtyId } } }
        : {}),
    };
  }
  private toResponse(item: ServiceWithSpecialty) {
    return {
      id: item.id,
      code: item.maDichVu,
      name: item.tenDichVu,
      description: item.moTa,
      price: Number(item.donGia),
      estimatedMinutes: item.thoiGianDuKienPhut,
      status: item.trangThai,
      specialty: item.chuyenKhoa
        ? {
            id: item.chuyenKhoa.id,
            code: item.chuyenKhoa.maChuyenKhoa,
            name: item.chuyenKhoa.tenChuyenKhoa,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
