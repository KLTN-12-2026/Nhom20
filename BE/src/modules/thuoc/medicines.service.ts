import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong, Prisma } from '@prisma/client';

import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { StockInDto } from './dto/stock-in.dto';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { MEDICINE_REPOSITORY } from './repositories/medicine.repository.interface';
import type { MedicineRepository } from './repositories/medicine.repository.interface';

@Injectable()
export class MedicinesService {
  constructor(
    @Inject(MEDICINE_REPOSITORY)
    private readonly medicineRepository: MedicineRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: thuốc
  async findAll(query: MedicineQueryDto) {
    const [medicines, allMedicines] = await Promise.all([
      this.medicineRepository.findAll(
        query.search?.trim(),
        query.group?.trim(),
        query.status,
      ),
      this.medicineRepository.findAll(),
    ]);

    // Xử lý lọc theo tab cảnh báo (ví dụ: sắp hết hạn, sắp hết hàng) nếu cần thiết
    let filtered = medicines;
    if (query.tab === 'LOW_STOCK') {
      filtered = medicines.filter((m) => m.soLuongTon <= m.mucTonToiThieu);
    } else if (query.tab === 'EXPIRED_SOON') {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      filtered = medicines.filter(
        (m) =>
          this.nearestExpiry(m) !== null &&
          this.nearestExpiry(m) >= now &&
          this.nearestExpiry(m) <= threeMonthsLater,
      );
    } else if (query.tab === 'EXPIRED') {
      const now = new Date();
      filtered = medicines.filter(
        (m) => this.nearestExpiry(m) !== null && this.nearestExpiry(m) < now,
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    return {
      message: 'Lấy danh sách thuốc thành công',
      data: paginated.map((medicine) => this.toResponse(medicine)),
      meta: {
        total,
        page: safePage,
        limit,
        totalPages,
        stats: {
          total: allMedicines.length,
          lowStock: allMedicines.filter(
            (medicine) => medicine.soLuongTon <= medicine.mucTonToiThieu,
          ).length,
          inventoryValue: allMedicines.reduce(
            (sum, medicine) =>
              sum + Number(medicine.giaNhap) * medicine.soLuongTon,
            0,
          ),
          activeIngredients: new Set(
            allMedicines
              .flatMap((medicine) => this.activeIngredientNames(medicine))
              .filter(Boolean),
          ).size,
          expiringSoon: allMedicines.filter(
            (medicine) =>
              this.nearestExpiry(medicine) !== null &&
              this.nearestExpiry(medicine) >= now &&
              this.nearestExpiry(medicine) <= threeMonthsLater,
          ).length,
          expired: allMedicines.filter(
            (medicine) =>
              this.nearestExpiry(medicine) !== null &&
              this.nearestExpiry(medicine) < now,
          ).length,
        },
        groups: [
          ...new Set(
            allMedicines
              .flatMap((medicine) => this.activeIngredientNames(medicine))
              .filter((group): group is string => Boolean(group)),
          ),
        ].sort((first, second) => first.localeCompare(second, 'vi')),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: thuốc
  async findOne(id: number) {
    const medicine = await this.getExisting(id);

    return {
      message: 'Lấy thông tin thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  async findBatches(search?: string) {
    // Chức năng: Quản lý thuốc — tra cứu lô thuốc và trạng thái tồn kho
    const batches = await this.medicineRepository.findBatches(search?.trim());
    const today = new Date();
    const soon = new Date(today);
    soon.setMonth(soon.getMonth() + 3);
    return {
      message: 'Lấy tồn kho theo lô thành công',
      data: batches.map((batch) => ({
        id: batch.id,
        batchCode: batch.maLo,
        medicineId: batch.thuocId,
        medicine: batch.thuoc.tenThuoc,
        unit: batch.thuoc.donViTinh,
        stock: batch.soLuongConLai,
        expiryDate: batch.hanDung,
        supplier: batch.nhaCungCap,
        status:
          batch.soLuongConLai <= 0
            ? 'HẾT HÀNG'
            : batch.hanDung < today
              ? 'ĐÃ HẾT HẠN'
              : batch.hanDung <= soon
                ? 'SẮP HẾT HẠN'
                : 'CÒN HẠN',
      })),
    };
  }

  // Tạo mới dữ liệu cho chức năng: thuốc
  async create(dto: CreateMedicineDto, currentUserId: number) {
    await this.ensureUnique(dto.name);
    if (dto.stock > 0 || dto.expiryDate) {
      throw new BadRequestException(
        'Tồn kho và hạn dùng phải được tạo bằng chức năng nhập lô mới',
      );
    }
    const generatedCode = await this.generateCode();

    let medicine = await this.medicineRepository.create({
      maThuoc: generatedCode,
      tenThuoc: dto.name.trim(),
      donViTinh: dto.unit.trim(),
      giaNhap: 0, // Giá nhập ban đầu là 0, sẽ được cập nhật khi nhập kho
      giaBan: dto.salePrice,
      // Số lượng tồn chỉ tăng/giảm qua LoThuoc để luôn truy được theo lô.
      soLuongTon: 0,
      mucTonToiThieu: dto.minimumStock ?? 100,
      nhaSanXuat: dto.manufacturer?.trim() || null,
      moTa: dto.description?.trim() || null,
      anhThuocUrl: dto.imageUrl || null,
      anhThuocPublicId: dto.imagePublicId || null,
      trangThai: dto.status,
    });
    medicine = await this.medicineRepository.replaceActiveIngredient(
      medicine.id,
      dto.group,
    );

    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Thêm thuốc mới',
      `Tạo thuốc ${medicine.maThuoc} - ${medicine.tenThuoc}`,
    );

    return {
      message: 'Thêm thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  // Cập nhật dữ liệu cho chức năng: thuốc
  async update(id: number, dto: UpdateMedicineDto, currentUserId: number) {
    const current = await this.getExisting(id);
    if (dto.name) {
      await this.ensureUnique(dto.name, id);
    }
    if (
      (dto.stock !== undefined && dto.stock !== current.soLuongTon) ||
      dto.expiryDate
    ) {
      throw new BadRequestException(
        'Không thể sửa tồn kho hoặc hạn dùng tại danh mục thuốc; hãy nhập/chỉnh lô thuốc',
      );
    }

    let medicine = await this.medicineRepository.update(id, {
      ...(dto.name !== undefined ? { tenThuoc: dto.name.trim() } : {}),
      ...(dto.unit !== undefined ? { donViTinh: dto.unit.trim() } : {}),
      ...(dto.salePrice !== undefined ? { giaBan: dto.salePrice } : {}),
      ...(dto.minimumStock !== undefined
        ? { mucTonToiThieu: dto.minimumStock }
        : {}),
      ...(dto.manufacturer !== undefined
        ? { nhaSanXuat: dto.manufacturer.trim() || null }
        : {}),
      ...(dto.description !== undefined
        ? { moTa: dto.description.trim() || null }
        : {}),
      ...(dto.imageUrl !== undefined ? { anhThuocUrl: dto.imageUrl } : {}),
      ...(dto.imagePublicId !== undefined
        ? { anhThuocPublicId: dto.imagePublicId }
        : {}),
      ...(dto.status !== undefined ? { trangThai: dto.status } : {}),
    });
    if (dto.group !== undefined) {
      medicine = await this.medicineRepository.replaceActiveIngredient(
        id,
        dto.group,
      );
    }

    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Cập nhật thuốc',
      `Cập nhật thuốc ${medicine.maThuoc} - ${medicine.tenThuoc}`,
    );

    return {
      message: 'Cập nhật thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: thuốc
  async stockIn(id: number, dto: StockInDto, currentUserId: number) {
    // Chức năng: Quản lý thuốc — nhập lô mới vào kho
    const current = await this.getExisting(id);

    const medicine = await this.medicineRepository.stockIn(
      id,
      currentUserId,
      dto,
    );

    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Nhập kho thuốc',
      `Nhập kho ${dto.quantity} đơn vị thuốc ${current.maThuoc}. Lô: ${dto.batchCode}`,
    );

    return {
      message: 'Nhập kho thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: thuốc
  async uploadImage(
    id: number,
    file: Express.Multer.File | undefined,
    currentUserId: number,
  ) {
    const current = await this.getExisting(id);
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh thuốc');
    }
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Ảnh thuốc chỉ hỗ trợ JPG, PNG hoặc WEBP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ảnh thuốc không được vượt quá 5 MB');
    }

    const uploaded = await this.cloudinaryService.uploadMedicineImage(
      file.buffer,
      id,
    );
    let medicine;
    try {
      medicine = await this.medicineRepository.update(id, {
        anhThuocUrl: uploaded.secure_url,
        anhThuocPublicId: uploaded.public_id,
      });
    } catch (error) {
      await this.cloudinaryService.deleteImage(uploaded.public_id);
      throw error;
    }
    if (current.anhThuocPublicId) {
      await this.cloudinaryService.deleteImage(current.anhThuocPublicId);
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Cập nhật ảnh thuốc',
      `Cập nhật ảnh thuốc ${medicine.maThuoc} - ${medicine.tenThuoc}`,
    );
    return {
      message: 'Cập nhật ảnh thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  // Xóa dữ liệu cho chức năng: thuốc
  async removeImage(id: number, currentUserId: number) {
    const current = await this.getExisting(id);
    const medicine = await this.medicineRepository.update(id, {
      anhThuocUrl: null,
      anhThuocPublicId: null,
    });
    if (current.anhThuocPublicId) {
      await this.cloudinaryService.deleteImage(current.anhThuocPublicId);
    }
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Xóa ảnh thuốc',
      `Xóa ảnh thuốc ${medicine.maThuoc} - ${medicine.tenThuoc}`,
    );
    return {
      message: 'Xóa ảnh thuốc thành công',
      data: this.toResponse(medicine),
    };
  }

  // Xóa dữ liệu cho chức năng: thuốc
  async remove(id: number, currentUserId: number) {
    const isManager =
      await this.medicineRepository.isDepartmentHead(currentUserId);
    if (!isManager) {
      throw new ForbiddenException(
        'Chỉ Trưởng khoa Dược mới có quyền xóa thuốc khỏi hệ thống',
      );
    }

    const medicine = await this.getExisting(id);

    try {
      await this.medicineRepository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Không thể xóa thuốc đã được sử dụng trong hóa đơn hoặc lịch sử nhập kho',
        );
      }
      throw error;
    }
    if (medicine.anhThuocPublicId) {
      await this.cloudinaryService.deleteImage(medicine.anhThuocPublicId);
    }

    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Xóa thuốc',
      `Xóa thuốc ${medicine.maThuoc} - ${medicine.tenThuoc}`,
    );

    return {
      message: 'Xóa thuốc thành công',
      data: { id },
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: thuốc
  private async getExisting(id: number) {
    const medicine = await this.medicineRepository.findById(id);
    if (!medicine) {
      throw new NotFoundException('Không tìm thấy thuốc');
    }
    return medicine;
  }

  // Kiểm tra điều kiện bắt buộc cho chức năng: thuốc
  private async ensureUnique(name: string, excludeId?: number) {
    const conflict = await this.medicineRepository.findConflict(
      name.trim(),
      excludeId,
    );
    if (conflict) {
      throw new ConflictException('Tên thuốc đã tồn tại');
    }
  }

  // Xử lý logic nghiệp vụ cho chức năng: thuốc
  private async generateCode(): Promise<string> {
    const lastCode = await this.medicineRepository.findLastCode();
    if (!lastCode) return 'MED-001';

    const match = lastCode.match(/MED-(\d+)/);
    if (!match) return 'MED-001';

    const nextNumber = parseInt(match[1], 10) + 1;
    return `MED-${nextNumber.toString().padStart(3, '0')}`;
  }

  private toResponse(
    medicine: Awaited<ReturnType<MedicineRepository['findById']>>,
  ) {
    if (!medicine) return medicine;
    return {
      ...medicine,
      // API giữ tên trường cũ để FE không vỡ, nhưng dữ liệu đã lấy từ quan hệ chuẩn.
      hoatChat: this.activeIngredientNames(medicine).join(', ') || null,
      hanSuDung: this.nearestExpiry(medicine),
      giaNhap: Number(medicine.giaNhap),
      giaBan: Number(medicine.giaBan),
    };
  }

  private activeIngredientNames(
    medicine: NonNullable<Awaited<ReturnType<MedicineRepository['findById']>>>,
  ) {
    return medicine.hoatChatCauThanh.map((item) => item.hoatChat.tenHoatChat);
  }

  private nearestExpiry(
    medicine: NonNullable<Awaited<ReturnType<MedicineRepository['findById']>>>,
  ) {
    const activeBatches = medicine.loThuoc
      .filter((batch) => batch.soLuongConLai > 0)
      .map((batch) => batch.hanDung)
      .sort((first, second) => first.getTime() - second.getTime());
    return activeBatches[0] ?? null;
  }
}
