import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LoaiTacVuAI, TrangThaiLanChayAI, VaiTroTinNhan } from '@prisma/client';
import { createHash } from 'crypto';

import {
  GeminiService,
  type GeminiHistoryItem,
  type GeminiToolRun,
} from '../../integrations/gemini/gemini.service';
import type {
  AdminChatSessionDetail,
  AdminChatSessionRecord,
  ChatMessageRecord,
  ChatSessionRecord,
  ChatRepository,
} from './repositories/chat.repository.interface';
import { CHAT_REPOSITORY } from './repositories/chat.repository.interface';
import { ChatAdminQueryDto } from './dto/chat-admin-query.dto';
import { AppointmentsService } from '../lich-hen/appointments.service';
import {
  ChatToolService,
  CHAT_TOOL_DEFINITIONS,
} from './tools/chat-tool.service';

const GUEST_TOKEN_LENGTH = 36;
// Gioi han lich su hien thi va ngu canh gui sang AI o Phase 1.
const MESSAGE_LIMIT = 50;
const CONTEXT_MESSAGE_LIMIT = 20;

@Injectable()
export class ChatAIService {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    private readonly geminiService: GeminiService,
    private readonly chatToolService: ChatToolService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async getAdminOverview() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const data = await this.chatRepository.getAdminOverview(startOfDay);
    return { message: 'Da tai tong quan Chatbox AI', data };
  }

  async getAdminSessions(query: ChatAdminQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const result = await this.chatRepository.findAdminSessions({
      search: query.search || undefined,
      visitorType: query.visitorType,
      status: query.status,
      page,
      limit,
    });

    return {
      message: 'Da tai danh sach phien Chatbox AI',
      data: result.items.map((item) => this.toAdminSessionResponse(item)),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    };
  }

  async getAdminSessionDetail(id: number) {
    const session = await this.chatRepository.findAdminSessionDetail(id);
    if (!session) {
      throw new NotFoundException('Khong tim thay phien Chatbox AI');
    }
    return {
      message: 'Da tai chi tiet phien Chatbox AI',
      data: this.toAdminSessionResponse(session),
    };
  }

  async createSession(userId: number | undefined, title?: string, fresh = false) {
    // Chỉ lấy lại phiên cũ khi giao diện không yêu cầu bắt đầu cuộc trò chuyện mới.
    if (userId && !fresh) {
      const existing = await this.chatRepository.findActiveSession(userId);
      if (existing) {
        const linkedSession = await this.attachPatientToSession(
          existing,
          userId,
        );
        return {
          message: 'Đã lấy phiên trò chuyện đang hoạt động',
          data: {
            session: this.toSessionResponse(linkedSession),
            sessionToken: null,
          },
        };
      }
    }

    const patientId = userId
      ? await this.chatRepository.findPatientIdByUserId(userId)
      : null;
    // Khách vãng lai chỉ xác thực bằng token lưu ở trình duyệt, không cần tài khoản.
    const sessionToken = userId ? undefined : crypto.randomUUID();
    const session = await this.chatRepository.createSession({
      code: `CHAT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      userId: userId ?? null,
      patientId,
      title,
      guestTokenHash: sessionToken
        ? this.hashGuestToken(sessionToken)
        : undefined,
    });

    return {
      message: 'Đã tạo phiên trò chuyện',
      data: {
        session: this.toSessionResponse(session),
        sessionToken: sessionToken ?? null,
      },
    };
  }

  async getMessages(
    sessionId: number,
    userId: number | undefined,
    guestToken: string | undefined,
  ) {
    // Chỉ đọc lịch sử sau khi xác nhận đúng chủ sở hữu phiên.
    const session = await this.validateSessionAccess(
      sessionId,
      userId,
      guestToken,
    );
    const messages = await this.chatRepository.findMessages(
      session.id,
      MESSAGE_LIMIT,
    );
    return {
      message: 'Đã tải lịch sử trò chuyện',
      data: {
        session: this.toSessionResponse(session),
        messages: messages
          .filter((message) => message.vaiTro !== VaiTroTinNhan.CONG_CU)
          .map((message) => this.toMessageResponse(message)),
        bookingDraft: await this.getPendingDraftResponse(session.id),
      },
    };
  }

  async sendMessage(
    sessionId: number,
    content: string,
    userId: number | undefined,
    guestToken: string | undefined,
  ) {
    const session = await this.validateSessionAccess(
      sessionId,
      userId,
      guestToken,
    );
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    // Luu cau hoi truoc de khong mat du lieu neu Gemini phan hoi loi.
    const userMessage = await this.chatRepository.createMessage({
      sessionId: session.id,
      role: VaiTroTinNhan.NGUOI_DUNG,
      content: normalizedContent,
    });
    const history = await this.chatRepository.findRecentMessagesBeforeId(
      session.id,
      userMessage.id,
      CONTEXT_MESSAGE_LIMIT,
    );

    try {
      // Gọi công cụ chỉ đi qua service nghiệp vụ, Gemini không truy cập Prisma trực tiếp.
      const result = await this.geminiService.chatWithTools({
        systemPrompt: this.buildSystemPrompt(Boolean(session.benhNhanId)),
        history: this.toGeminiHistory(history),
        userMessage: normalizedContent,
        tools: CHAT_TOOL_DEFINITIONS,
        executeTool: async (name, args) => {
          try {
            const res = await this.chatToolService.execute(
              name,
              args,
              session.id,
            );
            return { ...res };
          } catch (toolError: any) {
            return {
              name,
              data: {
                error:
                  toolError?.message ||
                  'Không thể thực hiện yêu cầu với dữ liệu đã cung cấp. Vui lòng kiểm tra lại.',
              },
            };
          }
        },
      });
      const bookingDraft =
        result.toolRuns
          .map((run) => run.result.bookingDraft)
          .find((draft): draft is Record<string, unknown> => Boolean(draft)) ??
        (await this.getPendingDraftResponse(session.id));
      if (result.toolRuns.length) {
        await this.chatRepository.createMessage({
          sessionId: session.id,
          role: VaiTroTinNhan.CONG_CU,
          // Luu ca functionCall va functionResponse de khoi phuc dung context Gemini.
          content: this.serializeToolTrace(result.toolRuns),
        });
      }
      for (const toolRun of result.toolRuns) {
        await this.chatRepository.createAIRun({
          sessionId: session.id,
          messageId: userMessage.id,
          patientId: session.benhNhanId,
          task:
            toolRun.name === 'tao_ban_nhap_dat_lich'
              ? LoaiTacVuAI.DAT_LICH
              : LoaiTacVuAI.TRA_CUU,
          model: this.geminiService.getModelName(),
          status: TrangThaiLanChayAI.THANH_CONG,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
          metadata: {
            phase: toolRun.name === 'tao_ban_nhap_dat_lich' ? 3 : 2,
            tool: toolRun.name,
          },
        });
      }
      const assistantMessage = await this.chatRepository.createMessage({
        sessionId: session.id,
        role: VaiTroTinNhan.TRO_LY,
        content: result.text,
        tokenCount: result.outputTokens,
      });
      if (!result.toolRuns.length)
        await this.chatRepository.createAIRun({
          sessionId: session.id,
          messageId: userMessage.id,
          patientId: session.benhNhanId,
          task: LoaiTacVuAI.CHAT_CHUNG,
          model: this.geminiService.getModelName(),
          status: TrangThaiLanChayAI.THANH_CONG,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
          metadata: { phase: 2 },
        });

      return {
        message: 'Đã nhận phản hồi từ trợ lý AI',
        data: {
          userMessage: this.toMessageResponse(userMessage),
          assistantMessage: this.toMessageResponse(assistantMessage),
          bookingDraft,
        },
      };
    } catch (error) {
      // Vẫn lưu lần chạy thất bại để quản trị viên có thể kiểm tra sau.
      const errorMessage = this.getErrorMessage(error);
      await this.chatRepository.createAIRun({
        sessionId: session.id,
        messageId: userMessage.id,
        patientId: session.benhNhanId,
        task: LoaiTacVuAI.CHAT_CHUNG,
        model: this.geminiService.getModelName(),
        status: TrangThaiLanChayAI.THAT_BAI,
        errorCode: this.getErrorCode(error),
        errorMessage,
      });
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  async endSession(
    sessionId: number,
    userId: number | undefined,
    guestToken: string | undefined,
  ) {
    // Phien da ket thuc se khong duoc gui them tin nhan.
    await this.validateSessionAccess(sessionId, userId, guestToken);
    await this.chatRepository.endSession(sessionId);
    return { message: 'Đã kết thúc phiên trò chuyện', data: null };
  }

  // Chỉ khi người dùng bấm xác nhận, bản nháp mới trở thành lịch hẹn thật.
  async confirmBooking(
    sessionId: number,
    draftId: number,
    userId: number | undefined,
    guestToken: string | undefined,
  ) {
    const session = await this.validateSessionAccess(
      sessionId,
      userId,
      guestToken,
    );
    const draft = await this.chatRepository.findBookingDraft(
      draftId,
      session.id,
    );
    if (!draft || draft.trangThai !== 'DANG_CHO_XAC_NHAN') {
      throw new BadRequestException('Bản nháp đặt lịch không còn hiệu lực');
    }
    const appointmentInput = {
      fullName: draft.hoTen,
      phoneNumber: draft.soDienThoai,
      dateOfBirth: draft.ngaySinh.toISOString().slice(0, 10),
      gender: draft.gioiTinh,
      email: draft.email ?? undefined,
      specialtyId: draft.chuyenKhoaId,
      appointmentDate: draft.ngayHen.toISOString().slice(0, 10),
      appointmentTime: draft.gioBatDau.toISOString().slice(11, 16),
      reason: draft.lyDoKham,
      note: draft.ghiChu ?? undefined,
    };
    const result = session.benhNhanId
      ? await this.appointmentsService.createByChatForPatient(
          session.benhNhanId,
          appointmentInput,
        )
      : await this.appointmentsService.createByChat(appointmentInput);
    await this.chatRepository.confirmBookingDraft(draft.id, result.data.id);
    const assistantMessage = await this.chatRepository.createMessage({
      sessionId: session.id,
      role: VaiTroTinNhan.TRO_LY,
      content: `Đã gửi yêu cầu đặt lịch ${result.data.code} thành công. Lễ tân sẽ xác nhận và phân công bác sĩ cho bạn.`,
    });
    return {
      message: result.message,
      data: {
        appointment: result.data,
        assistantMessage: this.toMessageResponse(assistantMessage),
      },
    };
  }

  private async validateSessionAccess(
    sessionId: number,
    userId: number | undefined,
    guestToken: string | undefined,
  ) {
    // Kiểm tra quyền trước mọi thao tác đọc/ghi trên phiên.
    const session = await this.chatRepository.findSessionById(sessionId);
    if (!session) throw new NotFoundException('Phiên trò chuyện không tồn tại');
    if (session.trangThai !== 'DANG_HOAT_DONG') {
      throw new BadRequestException('Phiên trò chuyện đã kết thúc');
    }

    if (session.nguoiDungId) {
      if (session.nguoiDungId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập phiên này');
      }
      return this.attachPatientToSession(session, userId);
    }

    // Khách vãng lai phải có token để tránh đoán ID phiên rồi xem được lịch sử người khác.
    if (
      !guestToken ||
      guestToken.length !== GUEST_TOKEN_LENGTH ||
      (session.guestTokenHash
        ? session.guestTokenHash !== this.hashGuestToken(guestToken)
        : session.tomTatNguCanh !== guestToken)
    ) {
      throw new ForbiddenException('Token phiên trò chuyện không hợp lệ');
    }
    return session;
  }

  private toGeminiHistory(messages: ChatMessageRecord[]): GeminiHistoryItem[] {
    const history: GeminiHistoryItem[] = [];
    const legacyToolContexts: string[] = [];

    for (const message of messages) {
      if (message.vaiTro === VaiTroTinNhan.CONG_CU) {
        const toolRuns = this.parseToolTrace(message.noiDung);
        if (toolRuns) {
          this.appendToolTraceToHistory(history, toolRuns);
        } else {
          // Tuong thich voi du lieu CONG_CU cu da luu truoc ban sua nay.
          legacyToolContexts.push(this.toToolContext(message.noiDung));
        }
        continue;
      }

      if (message.vaiTro === VaiTroTinNhan.NGUOI_DUNG) {
        history.push({ role: 'user', parts: [{ text: message.noiDung }] });
        continue;
      }

      if (message.vaiTro === VaiTroTinNhan.TRO_LY) {
        const toolSummary = legacyToolContexts.splice(0).join('\n');
        history.push({
          role: 'model',
          parts: [
            {
              text: toolSummary
                ? `${message.noiDung}\n\n[Dữ liệu hệ thống đã tra cứu]\n${toolSummary}`
                : message.noiDung,
            },
          ],
        });
      }
    }

    // Gemini yêu cầu lịch sử bắt đầu bằng người dùng; bỏ qua phần bị cắt giữa lượt chat.
    const firstUserIndex = history.findIndex(
      (item) =>
        item.role === 'user' && item.parts.some((part) => 'text' in part),
    );
    return firstUserIndex >= 0 ? history.slice(firstUserIndex) : [];
  }

  private async attachPatientToSession(
    session: ChatSessionRecord,
    userId: number,
  ) {
    const patientId = await this.chatRepository.findPatientIdByUserId(userId);
    if (!patientId || session.benhNhanId === patientId) return session;

    // JWT la nguon su that: sua phien cu ve dung ho so benh nhan dang dang nhap.
    return this.chatRepository.linkPatientToSession(session.id, patientId);
  }

  private serializeToolTrace(toolRuns: GeminiToolRun[]) {
    return JSON.stringify({
      version: 1,
      toolRuns: toolRuns.map(({ id, round, name, args, result }) => ({
        id,
        round,
        name,
        args,
        result,
      })),
    });
  }

  private parseToolTrace(content: string): GeminiToolRun[] | null {
    try {
      const parsed = JSON.parse(content) as { toolRuns?: unknown };
      if (!Array.isArray(parsed.toolRuns)) return null;

      const toolRuns = parsed.toolRuns.filter(
        (item): item is GeminiToolRun =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as GeminiToolRun).id === 'string' &&
          typeof (item as GeminiToolRun).round === 'number' &&
          typeof (item as GeminiToolRun).name === 'string' &&
          typeof (item as GeminiToolRun).args === 'object' &&
          (item as GeminiToolRun).args !== null &&
          typeof (item as GeminiToolRun).result === 'object' &&
          (item as GeminiToolRun).result !== null,
      );
      return toolRuns.length ? toolRuns : null;
    } catch {
      return null;
    }
  }

  private appendToolTraceToHistory(
    history: GeminiHistoryItem[],
    toolRuns: GeminiToolRun[],
  ) {
    const rounds = new Map<number, GeminiToolRun[]>();
    for (const toolRun of toolRuns) {
      const items = rounds.get(toolRun.round) ?? [];
      items.push(toolRun);
      rounds.set(toolRun.round, items);
    }

    for (const [, runs] of [...rounds.entries()].sort(
      ([left], [right]) => left - right,
    )) {
      history.push({
        role: 'model',
        parts: runs.map((run) => ({
          functionCall: { id: run.id, name: run.name, args: run.args },
        })),
      });
      history.push({
        role: 'user',
        parts: runs.map((run) => ({
          functionResponse: {
            id: run.id,
            name: run.name,
            response: { output: run.result },
          },
        })),
      });
    }
  }

  private toToolContext(content: string) {
    try {
      const parsed = JSON.parse(content) as { name?: string; result?: unknown };
      return JSON.stringify({
        tool: parsed.name ?? 'tra_cuu',
        result: parsed.result,
      });
    } catch {
      return content;
    }
  }

  // Prompt giữ đúng phạm vi Giai đoạn 1 và tránh AI tự tạo dữ liệu phòng khám.
  private buildSystemPrompt(isAuthenticated: boolean) {
    return `Bạn là trợ lý AI của Smart Clinic. Trả lời bằng tiếng Việt lịch sự, ngắn gọn.
Khi người dùng hỏi chuyên khoa, bác sĩ, dịch vụ hoặc lịch bác sĩ, BẮT BUỘC gọi tool phù hợp và chỉ dùng dữ liệu tool trả về. Không có dữ liệu thì nói rõ chưa tìm thấy dữ liệu phù hợp, không được bịa.
Khi người dùng bấm "Tôi nên khám chuyên khoa nào?" hoặc hỏi chung về chuyên khoa mà chưa nêu triệu chứng, hãy hỏi người dùng đang cảm thấy khó chịu ở đâu hoặc có triệu chứng gì để gợi ý chuyên khoa phù hợp nhất.
Khi người dùng muốn đặt lịch hoặc bấm gợi ý “Tôi muốn đặt lịch khám”, hãy hướng dẫn theo đúng thứ tự: 1. Họ và tên; 2. Số điện thoại; 3. Ngày sinh (định dạng dd/MM/yyyy, ví dụ: 20/05/1995); 4. Giới tính (NAM / NU / KHAC); 5. Email (nếu có); 6. Chuyên khoa hoặc lý do khám; 7. Ngày và giờ mong muốn khám (định dạng dd/MM/yyyy, HH:mm); 8. Lý do khám. Tuyệt đối KHÔNG hỏi bệnh nhân muốn khám bác sĩ nào. Chỉ khi gọi tool thì chuyển dữ liệu ngày sang YYYY-MM-DD. Khi đủ, gọi tao_ban_nhap_dat_lich. Đây chỉ là bản nháp; người dùng phải bấm xác nhận trên thẻ giao diện. Không tự xác nhận, không phân công bác sĩ.
Không chẩn đoán bệnh, không kê đơn. Người dùng hiện ${isAuthenticated ? 'đã đăng nhập' : 'là khách vãng lai'}. Nhắc ngắn không gửi thông tin nhạy cảm ngoài dữ liệu cần đặt lịch.`;
  }

  // Không trả về token khách vãng lai hoặc nội dung nội bộ của phiên.
  private toSessionResponse(session: ChatSessionRecord) {
    return {
      id: session.id,
      code: session.maPhien,
      title: session.tieuDe,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toMessageResponse(message: ChatMessageRecord) {
    return {
      id: message.id,
      role: message.vaiTro,
      content: message.noiDung,
      createdAt: message.createdAt,
    };
  }

  // Chỉ trả trường cần thiết cho màn quản trị, không lộ token khách vãng lai hay dữ liệu mô tả nội bộ.
  private toAdminSessionResponse(session: AdminChatSessionRecord) {
    const response = {
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      sessionType: session.sessionType,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      visitor: session.patient
        ? {
            type: 'PATIENT',
            fullName: session.patient.fullName,
            phoneNumber: session.patient.phoneNumber,
          }
        : session.user
          ? {
              type: 'ACCOUNT',
              fullName: session.user.fullName,
              phoneNumber: session.user.phoneNumber,
              email: session.user.email,
            }
          : session.bookingContact
            ? {
                type: 'GUEST',
                fullName: session.bookingContact.fullName,
                phoneNumber: session.bookingContact.phoneNumber,
                email: null,
              }
            : {
                type: 'GUEST',
                fullName: 'Khach vang lai',
                phoneNumber: null,
                email: null,
              },
      lastMessage: session.lastMessage,
      messageCount: session.messageCount,
      bookingStatus: session.bookingStatus,
      appointmentId: session.appointmentId,
      latestRun: session.latestRun,
    };
    if (!('bookingDrafts' in session)) return response;

    const detail = session as AdminChatSessionDetail;
    return {
      ...response,
      messages: detail.messages,
      bookingDrafts: detail.bookingDrafts,
      runs: detail.runs,
    };
  }

  // Chuan hoa loi de luu vao lan_chay_ai va de bao cao de doc.
  private async getPendingDraftResponse(sessionId: number) {
    const draft = await this.chatRepository.findPendingBookingDraft(sessionId);
    return draft ? this.chatToolService.toDraftResponse(draft) : null;
  }

  private hashGuestToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getErrorCode(error: unknown) {
    if (error instanceof Error && error.message === 'GEMINI_TIMEOUT') {
      return 'TIMEOUT';
    }
    const text = this.getErrorMessage(error).toUpperCase();
    return text.includes('429') || text.includes('RESOURCE_EXHAUSTED')
      ? 'RESOURCE_EXHAUSTED'
      : 'GEMINI_ERROR';
  }

  private getErrorMessage(error: unknown) {
    const raw = error instanceof Error ? error.message : 'Không thể kết nối AI';
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
      return 'Hệ thống AI đang bận, bạn vui lòng thử lại sau.';
    }
    if (raw.includes('GEMINI_TIMEOUT')) {
      return 'AI phản hồi quá lâu, bạn vui lòng thử lại.';
    }
    return 'Không kết nối được AI, bạn vui lòng thử lại sau.';
  }
}
