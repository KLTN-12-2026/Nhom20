import { LoaiTacVuAI, TrangThaiLanChayAI, VaiTroTinNhan } from '@prisma/client';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface ChatSessionRecord {
  id: number;
  maPhien: string;
  nguoiDungId: number | null;
  benhNhanId: number | null;
  loaiPhien: string;
  tieuDe: string | null;
  tomTatNguCanh: string | null;
  guestTokenHash?: string | null;
  trangThai: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: number;
  phienChatId: number;
  vaiTro: VaiTroTinNhan;
  noiDung: string;
  createdAt: Date;
}

export interface ChatBookingDraftRecord {
  id: number;
  phienChatId: number;
  hoTen: string;
  soDienThoai: string;
  ngaySinh: Date;
  gioiTinh: import('@prisma/client').GioiTinh;
  email: string | null;
  chuyenKhoaId: number;
  ngayHen: Date;
  gioBatDau: Date;
  lyDoKham: string;
  ghiChu: string | null;
  trangThai: import('@prisma/client').TrangThaiBanNhapDatLichChat;
  lichHenId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminChatSessionRecord {
  id: number;
  code: string;
  title: string | null;
  status: string;
  sessionType: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    fullName: string;
    email: string | null;
    phoneNumber: string | null;
  } | null;
  patient: { fullName: string; phoneNumber: string } | null;
  bookingContact: { fullName: string; phoneNumber: string } | null;
  lastMessage: { content: string; role: string; createdAt: Date } | null;
  messageCount: number;
  bookingStatus: string | null;
  appointmentId: number | null;
  latestRun: {
    status: string;
    latencyMs: number | null;
    errorCode: string | null;
  } | null;
}

export interface AdminChatSessionDetail extends AdminChatSessionRecord {
  messages: Array<{
    id: number;
    role: string;
    content: string;
    createdAt: Date;
  }>;
  bookingDrafts: Array<{
    id: number;
    fullName: string;
    phoneNumber: string;
    appointmentDate: Date;
    appointmentTime: Date;
    specialtyId: number;
    status: string;
    appointmentId: number | null;
  }>;
  runs: Array<{
    id: number;
    task: string;
    model: string;
    status: string;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
  }>;
}

export interface AdminChatOverviewRecord {
  todaySessionCount: number;
  todayMessageCount: number;
  successfulRunCount: number;
  failedRunCount: number;
  averageLatencyMs: number | null;
  guestSessionCount: number;
  patientSessionCount: number;
  confirmedBookingCount: number;
}

export interface ChatRepository {
  findActiveSession(userId: number): Promise<ChatSessionRecord | null>;
  findPatientIdByUserId(userId: number): Promise<number | null>;
  linkPatientToSession(
    sessionId: number,
    patientId: number,
  ): Promise<ChatSessionRecord>;
  findSessionById(id: number): Promise<ChatSessionRecord | null>;
  createSession(data: {
    code: string;
    userId: number | null;
    patientId: number | null;
    title?: string;
    guestTokenHash?: string;
  }): Promise<ChatSessionRecord>;
  findMessages(sessionId: number, limit: number): Promise<ChatMessageRecord[]>;
  findRecentMessagesBeforeId(
    sessionId: number,
    currentMessageId: number,
    limit: number,
  ): Promise<ChatMessageRecord[]>;
  createMessage(data: {
    sessionId: number;
    role: VaiTroTinNhan;
    content: string;
    tokenCount?: number | null;
  }): Promise<ChatMessageRecord>;
  createAIRun(data: {
    sessionId: number;
    messageId: number;
    patientId: number | null;
    task: LoaiTacVuAI;
    model: string;
    status: TrangThaiLanChayAI;
    inputTokens?: number | null;
    outputTokens?: number | null;
    latencyMs?: number | null;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
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
  }): Promise<ChatBookingDraftRecord>;
  findPendingBookingDraft(
    sessionId: number,
  ): Promise<ChatBookingDraftRecord | null>;
  findBookingDraft(
    id: number,
    sessionId: number,
  ): Promise<ChatBookingDraftRecord | null>;
  confirmBookingDraft(
    id: number,
    appointmentId: number,
  ): Promise<ChatBookingDraftRecord>;
  endSession(id: number): Promise<void>;
  getAdminOverview(startOfDay: Date): Promise<AdminChatOverviewRecord>;
  findAdminSessions(input: {
    search?: string;
    visitorType?: 'GUEST' | 'PATIENT';
    status?: string;
    page: number;
    limit: number;
  }): Promise<{ items: AdminChatSessionRecord[]; total: number }>;
  findAdminSessionDetail(id: number): Promise<AdminChatSessionDetail | null>;
}
