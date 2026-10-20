import { Inject, Injectable, Logger } from '@nestjs/common';
import { PhanHeNhatKyHeThong } from '@prisma/client';

import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from './repositories/audit-log.repository.interface';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: nhật ký hệ thống
  async findAll(query: AuditLogQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const result = await this.auditLogRepository.findAll({
      search: query.search?.trim(),
      module: query.module,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Lấy nhật ký hệ thống thành công',
      data: result.items.map((item) => ({
        id: item.id,
        userId: item.nguoiDungId,
        userName: item.hoTen,
        email: item.email,
        role: item.vaiTro,
        module: item.phanHe,
        action: item.hanhDong,
        detail: item.chiTiet,
        occurredAt: item.createdAt,
        avatar: item.nguoiDung?.anhDaiDienUrl ?? null,
      })),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: nhật ký hệ thống
  async record(
    userId: number,
    module: PhanHeNhatKyHeThong,
    action: string,
    detail?: string,
  ) {
    try {
      const actor = await this.auditLogRepository.findActor(userId);
      if (!actor) {
        this.logger.warn(`Không tìm thấy người dùng ${userId} để ghi nhật ký`);
        return;
      }

      await this.auditLogRepository.create({
        nguoiDungId: actor.id,
        hoTen: actor.hoTen,
        email: actor.email,
        vaiTro:
          actor.nguoiDungVaiTro
            .map((item) => item.vaiTro.tenVaiTro)
            .join(', ') || 'Chưa xác định',
        phanHe: module,
        hanhDong: action,
        chiTiet: detail?.trim() || null,
      });
    } catch (error) {
      this.logger.error(
        `Không thể ghi nhật ký cho người dùng ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
