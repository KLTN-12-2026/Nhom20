import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhanHeNhatKyHeThong, TrangThaiDonThuoc } from '@prisma/client';

import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';
import { RefusePrescriptionDto } from './dto/refuse-prescription.dto';
import {
  DISPENSING_REPOSITORY,
  type DispenseAllocation,
  type DispensingPrescription,
  type DispensingRepository,
} from './repositories/dispensing.repository.interface';

@Injectable()
export class DispensingService {
  constructor(
    @Inject(DISPENSING_REPOSITORY)
    private readonly repository: DispensingRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly realtimeService: RealtimeService,
    private readonly thongBaoService: ThongBaoService,
  ) {}

  // Lấy thông tin chi tiết cho chức năng: cấp phát thuốc
  async findPending(query: PrescriptionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.repository.findPending({
      search: query.search?.trim(),
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      message: 'Lấy danh sách đơn thuốc chờ cấp thành công',
      data: {
        items: items.map((item) => this.toResponse(item)),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: cấp phát thuốc
  async findHistory(query: PrescriptionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.repository.findHistory({
      search: query.search?.trim(),
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      message: 'Lấy lịch sử cấp thuốc thành công',
      data: {
        items: items.map((item) => this.toResponse(item)),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findProcessing(currentUserId: number, query: PrescriptionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.repository.findProcessing({
      pharmacistId: currentUserId,
      search: query.search?.trim(),
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      message: 'Lấy danh sách đơn thuốc đang xử lý thành công',
      data: { items: items.map((item) => this.toResponse(item)) },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: cấp phát thuốc
  async findOne(id: number) {
    const prescription = await this.repository.findById(id);
    if (!prescription) throw new NotFoundException('Không tìm thấy đơn thuốc');
    return {
      message: 'Lấy chi tiết đơn thuốc thành công',
      data: this.toResponse(prescription),
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: cấp phát thuốc
  async accept(id: number, currentUserId: number) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy đơn thuốc');
    if (current.trangThai !== TrangThaiDonThuoc.CHO_CAP_THUOC) {
      throw new BadRequestException(
        'Chỉ có thể tiếp nhận đơn thuốc đang chờ cấp',
      );
    }
    const prescription = await this.repository.accept(id, currentUserId);
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Tiếp nhận đơn thuốc',
      `Tiếp nhận đơn thuốc ${prescription.maDonThuoc}`,
    );
    return {
      message: 'Tiếp nhận đơn thuốc thành công',
      data: this.toResponse(prescription),
    };
  }

  // Dược sĩ từ chối một đơn đang xử lý và bắt buộc nêu lý do để bác sĩ/trưởng khoa theo dõi.
  async refuse(id: number, dto: RefusePrescriptionDto, currentUserId: number) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy đơn thuốc');
    if (current.trangThai !== TrangThaiDonThuoc.DANG_XU_LY) {
      throw new BadRequestException('Chỉ có thể từ chối đơn thuốc đang xử lý');
    }

    const prescription = await this.repository.refuse(
      id,
      currentUserId,
      dto.reason.trim(),
    );
    await this.auditLogsService.record(
      currentUserId,
      PhanHeNhatKyHeThong.THUOC,
      'Từ chối cấp thuốc',
      `Từ chối cấp đơn thuốc ${prescription.maDonThuoc}: ${dto.reason.trim()}`,
    );
    return {
      message: 'Đã từ chối cấp thuốc và lưu lý do',
      data: this.toResponse(prescription),
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: cấp phát thuốc
  async dispense(
    id: number,
    dto: DispensePrescriptionDto,
    currentUserId: number,
  ) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy đơn thuốc');
    if (current.trangThai !== TrangThaiDonThuoc.DANG_XU_LY) {
      throw new BadRequestException('Chỉ có thể cấp đơn thuốc đang xử lý');
    }

    const allocations: DispenseAllocation[] = [];
    for (const itemDto of dto.items) {
      const item = current.chiTiet.find(
        (c) => c.id === itemDto.prescriptionItemId,
      );
      if (!item)
        throw new BadRequestException(
          `Không tìm thấy chi tiết đơn thuốc id ${itemDto.prescriptionItemId}`,
        );

      let allocatedQty = 0;
      for (const batch of itemDto.batches) {
        allocations.push({
          prescriptionItemId: item.id,
          medicineId: item.thuocId,
          batchId: batch.batchId,
          quantity: batch.quantity,
        });
        allocatedQty += batch.quantity;
      }

      if (allocatedQty !== item.soLuong) {
        throw new BadRequestException(
          `Số lượng cấp cho thuốc ${item.thuoc.tenThuoc} không khớp với đơn`,
        );
      }
    }

    try {
      const prescription = await this.repository.dispense({
        id,
        pharmacistId: currentUserId,
        allocations,
        notes: dto.notes,
      });
      await this.auditLogsService.record(
        currentUserId,
        PhanHeNhatKyHeThong.THUOC,
        'Hoàn tất cấp thuốc',
        `Đã cấp xong đơn thuốc ${prescription.maDonThuoc}`,
      );
      const response = this.toResponse(prescription);
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.role('RECEPTIONIST'),
        REALTIME_EVENTS.PRESCRIPTION_DISPENSED,
        response,
      );
      await this.thongBaoService.notifyRoles(['RECEPTIONIST'], {
        title: 'Đơn thuốc chờ thanh toán',
        content: `Bệnh nhân ${prescription.hoSoKham.luotKham.benhNhan.hoTen} đã được cấp thuốc thành công.`,
        type: 'DON_THUOC',
        link: '/thu-ngan/thanh-toan',
      });
      return {
        message: 'Hoàn tất cấp thuốc thành công',
        data: response,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'BATCH_STOCK_CHANGED') {
        throw new BadRequestException(
          'Tồn kho lô thuốc không đủ hoặc đã hết hạn, vui lòng chọn lại lô',
        );
      }
      if (error instanceof Error && error.message === 'INVOICE_ALREADY_PAID') {
        throw new BadRequestException(
          'Hóa đơn của lượt khám này đã thanh toán, không thể cấp lại đơn',
        );
      }
      throw error;
    }
  }

  private toResponse(prescription: DispensingPrescription) {
    const now = new Date();
    return {
      id: prescription.id,
      code: prescription.maDonThuoc,
      status: prescription.trangThai,
      patient: {
        id: prescription.hoSoKham.luotKham.benhNhan.id,
        fullName: prescription.hoSoKham.luotKham.benhNhan.hoTen,
        code: prescription.hoSoKham.luotKham.benhNhan.maBenhNhan,
      },
      doctor: {
        id: prescription.hoSoKham.luotKham.bacSi?.id || 0,
        fullName: prescription.hoSoKham.luotKham.bacSi?.hoTen || 'Không xác định',
        specialty:
          prescription.hoSoKham.luotKham.bacSi?.chuyenKhoa.tenChuyenKhoa || 'Không xác định',
      },
      pharmacist: (prescription.nguoiCapThuoc ?? prescription.nguoiTuChoi)
        ? {
            id: (prescription.nguoiCapThuoc ?? prescription.nguoiTuChoi)!.id,
            fullName:
              (prescription.nguoiCapThuoc ?? prescription.nguoiTuChoi)!.hoTen,
          }
        : null,
      refusal: prescription.lyDoTuChoi
        ? {
            reason: prescription.lyDoTuChoi,
            refusedAt: prescription.thoiGianTuChoi?.toISOString() ?? null,
            pharmacist: prescription.nguoiTuChoi
              ? {
                  id: prescription.nguoiTuChoi.id,
                  fullName: prescription.nguoiTuChoi.hoTen,
                }
              : null,
          }
        : null,
      diagnosis: prescription.hoSoKham.chanDoan,
      createdAt: prescription.createdAt.toISOString(),
      dispensedAt:
        (prescription.thoiGianCapThuoc ?? prescription.thoiGianTuChoi)?.toISOString() ||
        null,
      items: prescription.chiTiet.map((item) => {
        // Lọc các lô thuốc còn hạn và còn tồn kho, sắp xếp FEFO (hạn dùng gần nhất trước)
        const availableBatches = item.thuoc.loThuoc
          .filter((batch) => batch.soLuongConLai > 0 && batch.hanDung > now)
          .sort((a, b) => a.hanDung.getTime() - b.hanDung.getTime());

        // Gợi ý phân bổ tự động theo FEFO.
        let remainingToAllocate = item.soLuong;
        const suggestedAllocations: Array<{
          batchId: number;
          quantity: number;
        }> = [];
        for (const batch of availableBatches) {
          if (remainingToAllocate <= 0) break;
          const take = Math.min(batch.soLuongConLai, remainingToAllocate);
          suggestedAllocations.push({ batchId: batch.id, quantity: take });
          remainingToAllocate -= take;
        }

        return {
          id: item.id,
          medicine: {
            id: item.thuoc.id,
            name: item.thuoc.tenThuoc,
            unit: item.thuoc.donViTinh,
          },
          quantity: item.soLuong,
          instructions: item.huongDanSuDung,
          dosage: item.lieuDung,
          frequency: item.tanSuat,
          days: item.soNgaySuDung,
          // Chi tiết đã cấp (nếu đã cấp xong)
          dispensedBatches: item.chiTietCapThuoc.map((d) => ({
            batchId: d.loThuocId,
            batchCode: d.loThuoc.maLo,
            quantity: d.soLuong,
          })),
          // Các lô có thể dùng và gợi ý phân bổ để giao diện dễ hiển thị.
          availableBatches: availableBatches.map((b) => ({
            batchId: b.id,
            batchCode: b.maLo,
            expiryDate: b.hanDung.toISOString().slice(0, 10),
            remainingStock: b.soLuongConLai,
          })),
          suggestedAllocations,
          isStockSufficient: remainingToAllocate === 0,
        };
      }),
    };
  }
}
