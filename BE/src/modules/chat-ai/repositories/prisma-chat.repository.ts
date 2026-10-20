import { Injectable } from '@nestjs/common';
import {
  LoaiPhienChat,
  TrangThaiLanChayAI,
  TrangThaiPhienChat,
  VaiTroTinNhan,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  AdminChatSessionDetail,
  AdminChatSessionRecord,
  ChatRepository,
  ChatMessageRecord,
  ChatSessionRecord,
} from './chat.repository.interface';

@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Tài khoản đăng nhập chỉ có một phiên chat đang hoạt động gần nhất.
  findActiveSession(userId: number) {
    return this.prisma.phienChat.findFirst({
      where: {
        nguoiDungId: userId,
        trangThai: TrangThaiPhienChat.DANG_HOAT_DONG,
      },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<ChatSessionRecord | null>;
  }

  async findPatientIdByUserId(userId: number) {
    // Tài khoản nhân viên có thể không gắn bệnh nhân nên trả về null.
    const patient = await this.prisma.benhNhan.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    return patient?.id ?? null;
  }

  linkPatientToSession(sessionId: number, patientId: number) {
    // Bo sung lien ket cho cac phien da tao truoc khi benh nhan dang nhap.
    return this.prisma.phienChat.update({
      where: { id: sessionId },
      data: { benhNhanId: patientId },
    }) as Promise<ChatSessionRecord>;
  }

  findSessionById(id: number) {
    return this.prisma.phienChat.findUnique({
      where: { id },
    }) as Promise<ChatSessionRecord | null>;
  }

  createSession(data: {
    code: string;
    userId: number | null;
    patientId: number | null;
    title?: string;
    guestTokenHash?: string;
  }) {
    return this.prisma.phienChat.create({
      data: {
        maPhien: data.code,
        nguoiDungId: data.userId,
        benhNhanId: data.patientId,
        loaiPhien: LoaiPhienChat.TU_VAN_CHUNG,
        tieuDe: data.title?.trim() || null,
        // Token khách vãng lai tạm lưu tại đây vì schema Giai đoạn 1 chưa thêm cột mới.
        guestTokenHash: data.guestTokenHash ?? null,
      },
    }) as Promise<ChatSessionRecord>;
  }

  async findMessages(sessionId: number, limit: number) {
    // Query moi den cu sau do dao lai de FE nhan dung thu tu hoi thoai.
    const messages = await this.prisma.tinNhanChat.findMany({
      where: { phienChatId: sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse() as ChatMessageRecord[];
  }

  async findRecentMessagesBeforeId(
    sessionId: number,
    currentMessageId: number,
    limit: number,
  ) {
    // Chi lay cac tin truoc cau hoi hien tai lam ngu canh cho Gemini.
    const messages = await this.prisma.tinNhanChat.findMany({
      where: { phienChatId: sessionId, id: { lt: currentMessageId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse() as ChatMessageRecord[];
  }

  createMessage(data: {
    sessionId: number;
    role: VaiTroTinNhan;
    content: string;
    tokenCount?: number | null;
  }) {
    return this.prisma.tinNhanChat.create({
      data: {
        phienChatId: data.sessionId,
        vaiTro: data.role,
        noiDung: data.content,
        soToken: data.tokenCount ?? null,
      },
    }) as Promise<ChatMessageRecord>;
  }

  async createAIRun(data: {
    sessionId: number;
    messageId: number;
    patientId: number | null;
    task: import('@prisma/client').LoaiTacVuAI;
    model: string;
    status: TrangThaiLanChayAI;
    inputTokens?: number | null;
    outputTokens?: number | null;
    latencyMs?: number | null;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) {
    // Luu ca thanh cong va that bai de theo doi chi phi/loi AI sau nay.
    await this.prisma.lanChayAI.create({
      data: {
        phienChatId: data.sessionId,
        tinNhanChatId: data.messageId,
        benhNhanId: data.patientId,
        tacVu: data.task,
        tenModel: data.model,
        trangThai: data.status,
        soTokenDauVao: data.inputTokens ?? null,
        soTokenDauRa: data.outputTokens ?? null,
        doTreMs: data.latencyMs ?? null,
        metadataYeuCau: (data.metadata ?? {
          phase: 2,
          contextMessageLimit: 20,
        }) as any,
        maLoi: data.errorCode ?? null,
        thongBaoLoi: data.errorMessage ?? null,
      },
    });
  }

  createBookingDraft(data: {
    sessionId: number;
    fullName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    gender: import('@prisma/client').GioiTinh;
    email: string | null;
    specialtyId: number;
    appointmentDate: Date;
    appointmentTime: string;
    reason: string;
    note: string | null;
  }) {
    const time = new Date(`1970-01-01T${data.appointmentTime}:00.000Z`);
    return this.prisma.banNhapDatLichChat.create({
      data: {
        phienChatId: data.sessionId,
        hoTen: data.fullName,
        soDienThoai: data.phoneNumber,
        ngaySinh: data.dateOfBirth,
        gioiTinh: data.gender,
        email: data.email,
        chuyenKhoaId: data.specialtyId,
        ngayHen: data.appointmentDate,
        gioBatDau: time,
        lyDoKham: data.reason,
        ghiChu: data.note,
      },
    });
  }

  findPendingBookingDraft(sessionId: number) {
    return this.prisma.banNhapDatLichChat.findFirst({
      where: { phienChatId: sessionId, trangThai: 'DANG_CHO_XAC_NHAN' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findBookingDraft(id: number, sessionId: number) {
    return this.prisma.banNhapDatLichChat.findFirst({
      where: { id, phienChatId: sessionId },
    });
  }

  confirmBookingDraft(id: number, appointmentId: number) {
    return this.prisma.banNhapDatLichChat.update({
      where: { id },
      data: { trangThai: 'DA_XAC_NHAN', lichHenId: appointmentId },
    });
  }

  async endSession(id: number) {
    await this.prisma.phienChat.update({
      where: { id },
      data: {
        trangThai: TrangThaiPhienChat.DA_KET_THUC,
        thoiGianKetThuc: new Date(),
      },
    });
  }

  async getAdminOverview(startOfDay: Date) {
    const [
      todaySessionCount,
      todayMessageCount,
      successfulRunCount,
      failedRunCount,
      latency,
      visitorRows,
      confirmedBookingCount,
    ] = await Promise.all([
      this.prisma.phienChat.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.tinNhanChat.count({
        where: {
          createdAt: { gte: startOfDay },
          vaiTro: { not: VaiTroTinNhan.CONG_CU },
        },
      }),
      this.prisma.lanChayAI.count({
        where: {
          createdAt: { gte: startOfDay },
          trangThai: TrangThaiLanChayAI.THANH_CONG,
        },
      }),
      this.prisma.lanChayAI.count({
        where: {
          createdAt: { gte: startOfDay },
          trangThai: TrangThaiLanChayAI.THAT_BAI,
        },
      }),
      this.prisma.lanChayAI.aggregate({
        where: {
          createdAt: { gte: startOfDay },
          trangThai: TrangThaiLanChayAI.THANH_CONG,
          doTreMs: { not: null },
        },
        _avg: { doTreMs: true },
      }),
      this.prisma.phienChat.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { nguoiDungId: true },
      }),
      this.prisma.banNhapDatLichChat.count({
        where: { createdAt: { gte: startOfDay }, trangThai: 'DA_XAC_NHAN' },
      }),
    ]);

    return {
      todaySessionCount,
      todayMessageCount,
      successfulRunCount,
      failedRunCount,
      averageLatencyMs: latency._avg.doTreMs
        ? Math.round(latency._avg.doTreMs)
        : null,
      guestSessionCount: visitorRows.filter((item) => item.nguoiDungId === null)
        .length,
      patientSessionCount: visitorRows.filter(
        (item) => item.nguoiDungId !== null,
      ).length,
      confirmedBookingCount,
    };
  }

  async findAdminSessions(input: {
    search?: string;
    visitorType?: 'GUEST' | 'PATIENT';
    status?: string;
    page: number;
    limit: number;
  }) {
    const where = {
      ...(input.visitorType === 'GUEST' ? { nguoiDungId: null } : {}),
      ...(input.visitorType === 'PATIENT'
        ? { nguoiDungId: { not: null } }
        : {}),
      ...(input.status
        ? { trangThai: input.status as TrangThaiPhienChat }
        : {}),
      ...(input.search
        ? {
            OR: [
              {
                maPhien: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                tieuDe: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                nguoiDung: {
                  hoTen: {
                    contains: input.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                benhNhan: {
                  hoTen: {
                    contains: input.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              { benhNhan: { soDienThoai: { contains: input.search } } },
              {
                banNhapDatLich: {
                  some: {
                    hoTen: {
                      contains: input.search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
              {
                banNhapDatLich: {
                  some: { soDienThoai: { contains: input.search } },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.phienChat.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          nguoiDung: {
            select: { hoTen: true, email: true, soDienThoai: true },
          },
          benhNhan: { select: { hoTen: true, soDienThoai: true } },
          tinNhan: {
            where: { vaiTro: { not: VaiTroTinNhan.CONG_CU } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { noiDung: true, vaiTro: true, createdAt: true },
          },
          banNhapDatLich: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              hoTen: true,
              soDienThoai: true,
              trangThai: true,
              lichHenId: true,
            },
          },
          lanChayAI: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { trangThai: true, doTreMs: true, maLoi: true },
          },
          _count: { select: { tinNhan: true } },
        },
      }),
      this.prisma.phienChat.count({ where }),
    ]);
    return {
      total,
      items: items.map((item) => this.toAdminSession(item)),
    };
  }

  async findAdminSessionDetail(
    id: number,
  ): Promise<AdminChatSessionDetail | null> {
    const item = await this.prisma.phienChat.findUnique({
      where: { id },
      include: {
        nguoiDung: { select: { hoTen: true, email: true, soDienThoai: true } },
        benhNhan: { select: { hoTen: true, soDienThoai: true } },
        tinNhan: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: { id: true, vaiTro: true, noiDung: true, createdAt: true },
        },
        banNhapDatLich: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            hoTen: true,
            soDienThoai: true,
            ngayHen: true,
            gioBatDau: true,
            chuyenKhoaId: true,
            trangThai: true,
            lichHenId: true,
          },
        },
        lanChayAI: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            tacVu: true,
            tenModel: true,
            trangThai: true,
            doTreMs: true,
            maLoi: true,
            thongBaoLoi: true,
            createdAt: true,
          },
        },
        _count: { select: { tinNhan: true } },
      },
    });
    if (!item) return null;
    const base = this.toAdminSession({
      ...item,
      tinNhan: item.tinNhan
        .filter((message) => message.vaiTro !== VaiTroTinNhan.CONG_CU)
        .slice(-1),
      banNhapDatLich: item.banNhapDatLich.slice(0, 1),
      lanChayAI: item.lanChayAI.slice(0, 1),
    });
    return {
      ...base,
      messages: item.tinNhan.map((message) => ({
        id: message.id,
        role: message.vaiTro,
        content: message.noiDung,
        createdAt: message.createdAt,
      })),
      bookingDrafts: item.banNhapDatLich.map((draft) => ({
        id: draft.id,
        fullName: draft.hoTen,
        phoneNumber: draft.soDienThoai,
        appointmentDate: draft.ngayHen,
        appointmentTime: draft.gioBatDau,
        specialtyId: draft.chuyenKhoaId,
        status: draft.trangThai,
        appointmentId: draft.lichHenId,
      })),
      runs: item.lanChayAI.map((run) => ({
        id: run.id,
        task: run.tacVu,
        model: run.tenModel,
        status: run.trangThai,
        latencyMs: run.doTreMs,
        errorCode: run.maLoi,
        errorMessage: run.thongBaoLoi,
        createdAt: run.createdAt,
      })),
    };
  }

  private toAdminSession(item: {
    id: number;
    maPhien: string;
    tieuDe: string | null;
    trangThai: string;
    loaiPhien: string;
    createdAt: Date;
    updatedAt: Date;
    nguoiDung: {
      hoTen: string;
      email: string | null;
      soDienThoai: string | null;
    } | null;
    benhNhan: { hoTen: string; soDienThoai: string } | null;
    tinNhan: Array<{ noiDung: string; vaiTro: string; createdAt: Date }>;
    banNhapDatLich: Array<{
      hoTen: string;
      soDienThoai: string;
      trangThai: string;
      lichHenId: number | null;
    }>;
    lanChayAI: Array<{
      trangThai: string;
      doTreMs: number | null;
      maLoi: string | null;
    }>;
    _count: { tinNhan: number };
  }): AdminChatSessionRecord {
    const lastMessage = item.tinNhan[0] ?? null;
    const booking = item.banNhapDatLich[0] ?? null;
    const latestRun = item.lanChayAI[0] ?? null;
    return {
      id: item.id,
      code: item.maPhien,
      title: item.tieuDe,
      status: item.trangThai,
      sessionType: item.loaiPhien,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: item.nguoiDung
        ? {
            fullName: item.nguoiDung.hoTen,
            email: item.nguoiDung.email,
            phoneNumber: item.nguoiDung.soDienThoai,
          }
        : null,
      patient: item.benhNhan
        ? {
            fullName: item.benhNhan.hoTen,
            phoneNumber: item.benhNhan.soDienThoai,
          }
        : null,
      lastMessage: lastMessage
        ? {
            content: lastMessage.noiDung,
            role: lastMessage.vaiTro,
            createdAt: lastMessage.createdAt,
          }
        : null,
      bookingContact: booking
        ? { fullName: booking.hoTen, phoneNumber: booking.soDienThoai }
        : null,
      messageCount: item._count.tinNhan,
      bookingStatus: booking?.trangThai ?? null,
      appointmentId: booking?.lichHenId ?? null,
      latestRun: latestRun
        ? {
            status: latestRun.trangThai,
            latencyMs: latestRun.doTreMs,
            errorCode: latestRun.maLoi,
          }
        : null,
    };
  }
}
