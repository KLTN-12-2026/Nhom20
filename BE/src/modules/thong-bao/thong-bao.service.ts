import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import {
  REALTIME_ROOMS,
  REALTIME_EVENTS,
} from '../thoi-gian-thuc/realtime.events';

@Injectable()
export class ThongBaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // Lấy danh sách dữ liệu cho chức năng: thông báo
  async getMyNotifications(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.thongBao.findMany({
      where: { nguoiDungId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.thongBao.count({
      where: { nguoiDungId: userId },
    });

    const unreadCount = await this.prisma.thongBao.count({
      where: { nguoiDungId: userId, daDoc: false },
    });

    return { items, total, unreadCount, page, limit };
  }

  // Xử lý logic nghiệp vụ cho chức năng: thông báo
  async markAsRead(userId: number, notificationId: number) {
    await this.prisma.thongBao.updateMany({
      where: { id: notificationId, nguoiDungId: userId },
      data: { daDoc: true },
    });
  }

  // Xử lý logic nghiệp vụ cho chức năng: thông báo
  async markAllAsRead(userId: number) {
    await this.prisma.thongBao.updateMany({
      where: { nguoiDungId: userId, daDoc: false },
      data: { daDoc: true },
    });
  }

  // Xử lý logic nghiệp vụ cho chức năng: thông báo
  async notifyUsers(
    userIds: number[],
    payload: { title: string; content: string; type: string; link?: string },
  ) {
    if (!userIds.length) return;

    const notifications = await this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.thongBao.create({
          data: {
            nguoiDungId: userId,
            tieuDe: payload.title,
            noiDung: payload.content,
            loaiThongBao: payload.type,
            duongDan: payload.link,
          },
        }),
      ),
    );

    for (const notification of notifications) {
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.user(notification.nguoiDungId),
        REALTIME_EVENTS.NEW_NOTIFICATION,
        notification,
      );
    }
  }

  // Xử lý logic nghiệp vụ cho chức năng: thông báo
  async notifyRoles(
    roleCodes: string[],
    payload: { title: string; content: string; type: string; link?: string },
  ) {
    const users = await this.prisma.nguoiDung.findMany({
      where: {
        trangThai: 'DANG_HOAT_DONG',
        nguoiDungVaiTro: {
          some: { vaiTro: { maVaiTro: { in: roleCodes } } },
        },
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    await this.notifyUsers(userIds, payload);
  }
}
