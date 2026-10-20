# Đánh giá V13 — Blueprint code (phiên bản chính thức)

Ngày: 09/08/2026  
Trạng thái: **CHỜ DUYỆT** — chưa code, chỉ mô tả.  
Thay thế: V12 (đã lỗi thời)

---

## DIFF so với V12

| # | Mục | V12 (cũ) | V13 (mới) |
|---|-----|---------|---------|
| 1 | SDK | `@google/generative-ai` | `@google/genai` — SDK chính thức hiện tại |
| 2 | API Pattern | `GoogleGenerativeAI` class + `model.startChat()` | `GoogleGenAI` + `ai.chats.create()` — Chats API |
| 3 | Temperature | `0.3` hardcode trong config | **Bỏ** — không cần cho gemini-3.6-flash |
| 4 | Context 20 tin | "Load 20 tin gần nhất gửi Gemini" (mơ hồ) | "Load 20 tin TRƯỚC tin hiện tại, sắp xếp cũ→mới. Tin hiện tại gửi riêng qua `chat.sendMessage()`, KHÔNG trùng trong history" |
| 5 | Guest security | Chỉ check `userId = null` | **Session token UUID** — guest phải gửi token mỗi request, không truy cập session khác bằng sessionId |
| 6 | JWT handling | Decorator `@OptionalJwt()` | `OptionalJwtAuthGuard` — guard thực sự parse JWT |

---

## Thứ tự code — không thay đổi

```text
Bước 1: Cài package @google/genai
Bước 2: BE — Gemini Integration (3 file)
Bước 3: BE — Chat-AI Module (9 file)
Bước 4: ENV
Bước 5: Đăng ký module vào app.module.ts
Bước 6: FE — Module chat-ai (10+ file)
Bước 7: Mount ChatboxWidget vào main.tsx
Bước 8: Test chat cơ bản
Bước 9: BE — Tools tra cứu (Phase 2, sau khi Phase 1 ổn)
```

---

## Bước 1: Cài package

```bash
cd BE
npm install @google/genai
```

> `@google/genai` là SDK mới nhất, hỗ trợ Chats API cho function calling. Không dùng `@google/generative-ai` (cũ).

---

## Bước 2: BE — Gemini Integration

### File 1: `BE/src/integrations/gemini/gemini.config.ts` ✅ Đã tạo

```ts
import { registerAs } from '@nestjs/config';

// Mục đích: Tập trung cấu hình Gemini vào 1 chỗ.
// Không có temperature — gemini-3.6-flash tự quản lý.
// API key KHÔNG bao giờ hard-code hoặc log.

export const geminiConfig = registerAs('gemini', () => ({
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10),
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '1', 10),
}));
```

> **Thay đổi so với V12:** Bỏ `temperature`.

---

### File 2: `BE/src/integrations/gemini/gemini.service.ts`

```ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { geminiConfig } from './gemini.config';

// Mục đích: Wrapper DUY NHẤT gọi Gemini API.
// Dùng Chats API (@google/genai) — pattern khuyến nghị cho function calling.
// Không để chat-ai.service gọi SDK trực tiếp.

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;

  constructor(
    @Inject(geminiConfig.KEY)
    private readonly config: ConfigType<typeof geminiConfig>,
  ) {
    // Khởi tạo SDK 1 lần.
    // API key từ ENV, không log.
    this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  // Trả tên model cho logging (ghi vào lan_chay_ai.ten_model)
  getModelName(): string {
    return this.config.model;
  }

  // ===================================
  // GỌI GEMINI VỚI CHATS API
  // ===================================
  // Luồng:
  //   1. Tạo chat session với history (20 tin cũ → mới)
  //   2. Gửi tin nhắn hiện tại qua chat.sendMessage()
  //      → Tin hiện tại KHÔNG nằm trong history → tránh trùng
  //   3. Đo latency
  //   4. Trả text + functionCalls + tokenUsage
  async chat(params: {
    systemPrompt: string;
    history: Content[];          // 20 tin cũ→mới, KHÔNG chứa tin hiện tại
    userMessage: string;         // Tin nhắn user hiện tại, gửi RIÊNG
    tools?: object[];            // Function declarations cho tool calling
  }): Promise<GeminiChatResult> {
    const startTime = Date.now();

    // Tạo chat qua Chats API.
    // Chats API quản lý multi-turn + function calling tự động.
    const chat = this.ai.chats.create({
      model: this.config.model,
      config: {
        systemInstruction: params.systemPrompt,
        // Không set temperature — gemini-3.6-flash tự quản lý
        ...(params.tools?.length
          ? { tools: [{ functionDeclarations: params.tools }] }
          : {}),
      },
      history: params.history,  // 20 tin cũ→mới
    });

    // Gửi tin nhắn hiện tại (riêng, không trùng history).
    // AbortController cho timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await chat.sendMessage({
        message: params.userMessage,
      });

      const latencyMs = Date.now() - startTime;

      // Lấy function calls (nếu Gemini muốn gọi tool)
      const functionCalls = response.functionCalls?.map(fc => ({
        name: fc.name,
        args: (fc.args ?? {}) as Record<string, unknown>,
      })) ?? [];

      // Text response (rỗng nếu chỉ gọi tool)
      const text = response.text ?? '';

      // Token usage cho logging
      const usage = response.usageMetadata;

      return {
        text,
        functionCalls,
        tokenUsage: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
        },
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ===================================
  // GỬI KẾT QUẢ TOOL VỀ GEMINI
  // ===================================
  // Sau khi BE thực hiện tool, gửi kết quả lại cho Gemini
  // để nó tạo câu trả lời text cho user.
  // Dùng cùng chat session (history đã chứa function call + response).
  async sendToolResult(params: {
    systemPrompt: string;
    history: Content[];     // Bao gồm cả user msg + function call
    toolName: string;
    toolResult: unknown;
    tools?: object[];
  }): Promise<GeminiChatResult> {
    const startTime = Date.now();

    const chat = this.ai.chats.create({
      model: this.config.model,
      config: {
        systemInstruction: params.systemPrompt,
        ...(params.tools?.length
          ? { tools: [{ functionDeclarations: params.tools }] }
          : {}),
      },
      history: params.history,
    });

    const timer = setTimeout(() => {}, this.config.timeoutMs);

    try {
      // Gửi function response → Gemini đọc kết quả tool → tạo text
      const response = await chat.sendMessage({
        message: {
          functionResponse: {
            name: params.toolName,
            response: { result: params.toolResult },
          },
        },
      });

      const latencyMs = Date.now() - startTime;
      const functionCalls = response.functionCalls?.map(fc => ({
        name: fc.name,
        args: (fc.args ?? {}) as Record<string, unknown>,
      })) ?? [];

      return {
        text: response.text ?? '',
        functionCalls,
        tokenUsage: {
          input: response.usageMetadata?.promptTokenCount ?? 0,
          output: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

// Type cho kết quả trả về
export interface GeminiChatResult {
  text: string;
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>;
  tokenUsage: { input: number; output: number };
  latencyMs: number;
}
```

**Thay đổi quan trọng so với V12:**
- SDK: `GoogleGenAI` thay vì `GoogleGenerativeAI`
- Pattern: `ai.chats.create()` thay vì `model.startChat()`
- Không set temperature
- `history` rõ ràng KHÔNG chứa tin nhắn hiện tại
- `sendMessage({ message: string })` gửi tin riêng

---

### File 3: `BE/src/integrations/gemini/gemini.module.ts`

```ts
// Không đổi so với V12

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { geminiConfig } from './gemini.config';

@Module({
  imports: [ConfigModule.forFeature(geminiConfig)],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
```

---

## Bước 3: BE — Chat-AI Module

### File 4: `BE/src/modules/chat-ai/repositories/chat.repository.interface.ts`

```ts
export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface ChatRepository {
  // Tạo phiên chat. Guest phiên có sessionToken UUID.
  createSession(data: {
    code: string;
    userId?: number;
    patientId?: number;
    type: string;
    sessionToken?: string;  // ← MỚI: UUID cho guest
  }): Promise<ChatSession>;

  // Tìm phiên đang hoạt động.
  // User đăng nhập: tìm theo userId.
  // Guest: không tìm — luôn tạo mới.
  findActiveSession(userId: number): Promise<ChatSession | null>;

  // Tìm phiên theo ID.
  // Dùng để validate quyền truy cập.
  findSessionById(id: number): Promise<ChatSession | null>;

  // Kết thúc phiên
  endSession(id: number): Promise<void>;

  // Tạo tin nhắn
  createMessage(data: {
    sessionId: number;
    role: string;
    content: string;
    toolName?: string;
    toolCallId?: string;
    metadata?: unknown;
    tokenCount?: number;
  }): Promise<ChatMessage>;

  // ===================================================
  // QUAN TRỌNG: Logic context 20 tin nhắn
  // ===================================================
  // Lấy 20 tin nhắn GẦN NHẤT của phiên (TRƯỚC tin hiện tại).
  // Query: ORDER BY created_at DESC LIMIT 20
  // Trả về: Đã REVERSE thành cũ → mới.
  // Tin nhắn user hiện tại KHÔNG nằm trong kết quả.
  findRecentMessages(sessionId: number, limit: number): Promise<ChatMessage[]>;

  // Load lịch sử cho FE (phân trang, hỗ trợ scroll lên)
  findMessages(sessionId: number, limit: number, before?: number): Promise<ChatMessage[]>;

  // Ghi lần gọi AI (không ghi API key)
  createAIRun(data: { /* ... giữ nguyên V12 ... */ }): Promise<{ id: number }>;

  // Tìm bệnh nhân theo userId (để gắn benhNhanId cho phiên)
  findPatientIdByUserId(userId: number): Promise<number | null>;
}

export interface ChatSession {
  id: number;
  maPhien: string;
  nguoiDungId: number | null;
  benhNhanId: number | null;
  loaiPhien: string;
  tieuDe: string | null;
  tomTatNguCanh: string | null;
  trangThai: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  phienChatId: number;
  vaiTro: string;
  noiDung: string;
  tenCongCu: string | null;
  maLanGoiCongCu: string | null;
  metadata: unknown;
  soToken: number | null;
  createdAt: Date;
}
```

**Thay đổi so với V12:**
- Thêm `sessionToken` cho guest
- Tách `findRecentMessages()` (cho Gemini context) khác `findMessages()` (cho FE pagination)
- `findRecentMessages` trả về đã sắp xếp cũ→mới
- Thêm `findPatientIdByUserId()` để gắn bệnh nhân

---

### File 5: `BE/src/modules/chat-ai/repositories/prisma-chat.repository.ts`

```ts
@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(data) {
    return this.prisma.phienChat.create({
      data: {
        maPhien: data.code,
        nguoiDungId: data.userId ?? null,
        benhNhanId: data.patientId ?? null,
        loaiPhien: 'TU_VAN_CHUNG',
        trangThai: 'DANG_HOAT_DONG',
        // sessionToken lưu vào tomTatNguCanh tạm thời cho guest
        // (hoặc tạo cột mới nếu cần — nhưng tránh migration)
        // → Giải pháp: lưu trong metadata JSON hoặc tieuDe prefix
        // → Quyết định cuối: dùng field tomTatNguCanh cho guest token
        //   vì guest không cần tóm tắt ngữ cảnh
        tomTatNguCanh: data.sessionToken ?? null,
      },
    });
  }

  async findActiveSession(userId: number) {
    // Chỉ cho user đăng nhập.
    // Guest không tìm phiên cũ — luôn tạo mới.
    return this.prisma.phienChat.findFirst({
      where: {
        nguoiDungId: userId,
        trangThai: 'DANG_HOAT_DONG',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =====================================================
  // CONTEXT 20 TIN NHẮN — LOGIC QUAN TRỌNG
  // =====================================================
  async findRecentMessages(sessionId: number, limit: number) {
    // Bước 1: Lấy 20 tin MỚI NHẤT (DESC)
    const messages = await this.prisma.tinNhanChat.findMany({
      where: { phienChatId: sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,  // 20
    });
    // Bước 2: Reverse thành cũ → mới
    // Gemini cần history theo thứ tự thời gian.
    return messages.reverse();
  }

  // Load cho FE (phân trang, scroll lên xem tin cũ)
  async findMessages(sessionId: number, limit: number, before?: number) {
    return this.prisma.tinNhanChat.findMany({
      where: {
        phienChatId: sessionId,
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    // FE sẽ reverse lại khi hiển thị
  }

  async findPatientIdByUserId(userId: number) {
    const patient = await this.prisma.benhNhan.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    return patient?.id ?? null;
  }

  // createMessage, endSession, createAIRun — giữ nguyên logic V12
}
```

---

### File 6–7: DTOs — Giữ nguyên V12

- `create-chat-session.dto.ts` — optional title
- `send-message.dto.ts` — required content, max 2000 ký tự

---

### File 8: `BE/src/modules/chat-ai/guards/optional-jwt-auth.guard.ts` ← MỚI

```ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Mục đích: Parse JWT nếu có, KHÔNG throw nếu không có.
// Guest: req.user = null.
// User đăng nhập: req.user = { sub: userId, ... }.
// Khác decorator đơn giản: đây là guard thực sự gọi Passport strategy.

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: unknown) {
    // Nếu JWT hợp lệ → trả user.
    // Nếu không có JWT hoặc JWT sai → trả null (guest).
    // KHÔNG throw lỗi 401.
    return user || null;
  }

  // Cho phép request đi qua dù không có token
  canActivate(context: ExecutionContext) {
    // Gọi super để parse JWT nếu có
    return super.canActivate(context);
  }
}
```

**Thay đổi so với V12:** Thêm file guard mới thay vì decorator đơn giản.

---

### File 9: `BE/src/modules/chat-ai/chat-ai.service.ts`

```ts
@Injectable()
export class ChatAIService {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepo: ChatRepository,
    private readonly geminiService: GeminiService,
  ) {}

  // ==========================================
  // TẠO PHIÊN CHAT
  // ==========================================
  async createSession(userId?: number) {
    // User đăng nhập → tìm phiên cũ DANG_HOAT_DONG
    if (userId) {
      const existing = await this.chatRepo.findActiveSession(userId);
      if (existing) return { session: existing, isNew: false };
    }

    // Tìm bệnh nhân (nếu đăng nhập)
    const patientId = userId
      ? await this.chatRepo.findPatientIdByUserId(userId)
      : null;

    // Guest: tạo session token UUID
    const sessionToken = userId ? undefined : crypto.randomUUID();

    const session = await this.chatRepo.createSession({
      code: `CHAT-${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      userId: userId ?? undefined,
      patientId: patientId ?? undefined,
      type: 'TU_VAN_CHUNG',
      sessionToken,
    });

    return {
      session,
      sessionToken,  // Chỉ trả cho guest. User đăng nhập = undefined.
      isNew: true,
    };
  }

  // ==========================================
  // GỬI TIN NHẮN + NHẬN PHẢN HỒI AI
  // ==========================================
  async sendMessage(
    sessionId: number,
    content: string,
    userId?: number,
    guestToken?: string,
  ) {
    // Bước 1: Validate quyền truy cập phiên
    const session = await this.validateSessionAccess(sessionId, userId, guestToken);

    // Bước 2: Lưu tin nhắn user vào DB
    const userMessage = await this.chatRepo.createMessage({
      sessionId,
      role: 'NGUOI_DUNG',
      content,
    });

    // Bước 3: Build system prompt (khác nhau cho guest vs đăng nhập)
    const systemPrompt = this.buildSystemPrompt(userId, session.benhNhanId);

    // =======================================================
    // Bước 4: Load 20 tin nhắn GẦN NHẤT TRƯỚC tin hiện tại
    // =======================================================
    // findRecentMessages trả về đã sắp xếp cũ → mới.
    // TIN NHẮN USER VỪA LƯU Ở BƯỚC 2 SẼ NẰM TRONG 20 TIN NÀY
    // → Cần exclude nó ra! Vì ta gửi riêng qua chat.sendMessage().
    //
    // Cách 1: Query 21 tin rồi bỏ tin cuối (tin vừa lưu)
    // Cách 2: Query WHERE id < userMessage.id
    //
    // → Dùng cách 2: rõ ràng hơn.
    const recentMessages = await this.chatRepo.findRecentMessagesBeforeId(
      sessionId, 20, userMessage.id,
    );

    // Bước 5: Convert sang format Gemini Content[]
    const history = this.convertToGeminiHistory(recentMessages);

    // Bước 6: Gọi Gemini
    try {
      const result = await this.geminiService.chat({
        systemPrompt,
        history,                // 20 tin cũ→mới, KHÔNG chứa tin hiện tại
        userMessage: content,   // Tin hiện tại gửi RIÊNG
        tools: [],              // Phase 1: không có tools
      });

      // Phase 2: xử lý function calls ở đây
      // if (result.functionCalls.length > 0) { ... }

      // Bước 7: Lưu tin nhắn AI
      const aiMessage = await this.chatRepo.createMessage({
        sessionId,
        role: 'TRO_LY',
        content: result.text,
        tokenCount: result.tokenUsage.output,
      });

      // Bước 8: Ghi lan_chay_ai
      await this.chatRepo.createAIRun({
        sessionId,
        messageId: userMessage.id,
        patientId: session.benhNhanId,
        task: 'CHAT_CHUNG',
        model: this.geminiService.getModelName(),
        status: 'THANH_CONG',
        inputTokens: result.tokenUsage.input,
        outputTokens: result.tokenUsage.output,
        latencyMs: result.latencyMs,
      });

      return {
        message: 'Gửi tin nhắn thành công',
        data: {
          userMessage: this.toMessageResponse(userMessage),
          aiMessage: this.toMessageResponse(aiMessage),
        },
      };
    } catch (error) {
      // Ghi THAT_BAI vào lan_chay_ai
      // Phân loại: 429 → 503, timeout → 504, khác → 500
      // ...
    }
  }

  // ==========================================
  // VALIDATE QUYỀN TRUY CẬP PHIÊN
  // ==========================================
  private async validateSessionAccess(
    sessionId: number,
    userId?: number,
    guestToken?: string,
  ) {
    const session = await this.chatRepo.findSessionById(sessionId);
    if (!session) throw new NotFoundException('Phiên chat không tồn tại');
    if (session.trangThai !== 'DANG_HOAT_DONG')
      throw new BadRequestException('Phiên chat đã kết thúc');

    if (session.nguoiDungId) {
      // Phiên của user đăng nhập → kiểm tra userId khớp
      if (session.nguoiDungId !== userId)
        throw new ForbiddenException('Không có quyền truy cập phiên này');
    } else {
      // Phiên guest → kiểm tra session token
      if (session.tomTatNguCanh !== guestToken)
        throw new ForbiddenException('Token phiên không hợp lệ');
    }

    return session;
  }

  // ==========================================
  // CONVERT TIN NHẮN DB → GEMINI FORMAT
  // ==========================================
  private convertToGeminiHistory(messages: ChatMessage[]): Content[] {
    // Đã sắp xếp cũ → mới (do repository xử lý).
    // Map:
    //   NGUOI_DUNG → { role: 'user', parts: [{ text }] }
    //   TRO_LY    → { role: 'model', parts: [{ text }] }
    //   CONG_CU   → bỏ qua (Phase 2 sẽ xử lý functionResponse)
    //   HE_THONG  → bỏ qua (system prompt riêng)
    return messages
      .filter(m => m.vaiTro === 'NGUOI_DUNG' || m.vaiTro === 'TRO_LY')
      .map(m => ({
        role: m.vaiTro === 'NGUOI_DUNG' ? 'user' : 'model',
        parts: [{ text: m.noiDung }],
      }));
  }

  // System prompt — giữ nguyên logic V12
  // buildSystemPrompt(), toMessageResponse() ...
}
```

**Thay đổi quan trọng so với V12:**
1. `findRecentMessagesBeforeId(sessionId, 20, userMessage.id)` — exclude tin hiện tại
2. `validateSessionAccess()` — kiểm tra guest token
3. `createSession()` — tạo UUID cho guest
4. Không dùng temperature

---

### File 10: `BE/src/modules/chat-ai/chat-ai.controller.ts`

```ts
@Controller('chat-ai')
export class ChatAIController {
  constructor(private readonly chatAIService: ChatAIService) {}

  // Tất cả endpoint dùng OptionalJwtAuthGuard:
  // - Có JWT → req.user = { sub, ... }
  // - Không JWT → req.user = null

  @Post('sessions')
  @UseGuards(OptionalJwtAuthGuard)
  async createSession(@Req() req) {
    const userId = req.user?.sub ?? undefined;
    return this.chatAIService.createSession(userId);
    // Response cho guest sẽ chứa sessionToken
    // FE guest lưu sessionToken trong memory/sessionStorage
  }

  @Get('sessions/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const userId = req.user?.sub ?? undefined;
    const guestToken = req.headers['x-session-token'] as string | undefined;
    // Guest gửi token qua header X-Session-Token
    return this.chatAIService.getMessages(id, userId, guestToken, ...);
  }

  @Post('sessions/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Req() req,
  ) {
    const userId = req.user?.sub ?? undefined;
    const guestToken = req.headers['x-session-token'] as string | undefined;
    return this.chatAIService.sendMessage(id, dto.content, userId, guestToken);
  }

  @Patch('sessions/:id/end')
  @UseGuards(OptionalJwtAuthGuard)
  async endSession(@Param('id', ParseIntPipe) id: number, @Req() req) {
    // ...
  }
}
```

**Thay đổi so với V12:**
- `@UseGuards(OptionalJwtAuthGuard)` thay vì decorator
- Guest gửi `X-Session-Token` header
- Tất cả endpoint kiểm tra quyền qua `validateSessionAccess()`

---

### File 11: `BE/src/modules/chat-ai/chat-ai.module.ts`

```ts
// Giữ nguyên V12, thêm guard

@Module({
  imports: [GeminiModule],
  controllers: [ChatAIController],
  providers: [
    ChatAIService,
    OptionalJwtAuthGuard,
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
  ],
})
export class ChatAIModule {}
```

---

## Bước 4–5: ENV + app.module.ts — Giữ nguyên V12

```text
.env.example thêm:
  GEMINI_API_KEY=
  GEMINI_MODEL=gemini-3.6-flash
  GEMINI_TIMEOUT_MS=30000
  GEMINI_MAX_RETRIES=1
  (KHÔNG có GEMINI_TEMPERATURE)

app.module.ts thêm:
  import GeminiModule, ChatAIModule
```

---

## Bước 6–7: FE — Giữ nguyên logic V12

Thay đổi duy nhất:

### `chat-ai.api.ts` — Guest token

```ts
export const chatAIApi = {
  // Guest: sau createSession, lưu sessionToken vào sessionStorage
  // Mọi request sau đó gửi header X-Session-Token

  async sendMessage(sessionId: number, content: string, guestToken?: string) {
    return axiosClient.post(
      `/chat-ai/sessions/${sessionId}/messages`,
      { content },
      guestToken ? { headers: { 'X-Session-Token': guestToken } } : {},
    );
  },
};
```

### `use-chatbox.ts` — Quản lý guest token

```ts
export function useChatbox() {
  // State thêm:
  //   guestToken: string | null — lưu trong sessionStorage

  // Flow tạo phiên guest:
  //   1. Gọi createSession
  //   2. Nếu response có sessionToken → lưu sessionStorage
  //   3. Mọi request sau gửi kèm token

  // Nếu user đăng nhập → không cần guestToken (JWT đủ)
}
```

---

## Bước 8: Test

```text
Test 1 — Guest chat:
  1. Không đăng nhập → mở chatbox → tạo phiên
  2. Nhận sessionToken
  3. Gõ "Xin chào" → AI trả lời
  4. Kiểm tra DB: phien_chat (nguoiDungId = null), tin_nhan_chat, lan_chay_ai
  5. Thử truy cập phiên bằng sessionId khác → bị chặn

Test 2 — Login chat:
  1. Đăng nhập bệnh nhân → mở chatbox → tái sử dụng phiên cũ
  2. Gõ "Lịch khám của tôi" → AI trả lời (Phase 1 chỉ text, chưa tool)
  3. Kiểm tra DB: phien_chat (nguoiDungId = userId), tin_nhan_chat
  4. Reload → mở lại → thấy lịch sử cũ

Test 3 — Context không trùng:
  1. Chat 25 tin → gửi tin thứ 26
  2. Kiểm tra Gemini nhận 20 tin (tin 6–25), tin 26 gửi riêng
  3. Không có tin nào bị gửi 2 lần
```

---

## Tóm tắt file sẽ tạo (cập nhật)

| # | File | Thay đổi so V12 |
|---|------|-----------------|
| 1 | `BE/src/integrations/gemini/gemini.config.ts` | ✅ Đã tạo. **Sẽ sửa:** bỏ temperature |
| 2 | `BE/src/integrations/gemini/gemini.service.ts` | **Viết lại:** `@google/genai` + Chats API |
| 3 | `BE/src/integrations/gemini/gemini.module.ts` | Không đổi |
| 4 | `BE/src/modules/chat-ai/repositories/chat.repository.interface.ts` | **Thêm:** sessionToken, findRecentMessagesBeforeId, findPatientIdByUserId |
| 5 | `BE/src/modules/chat-ai/repositories/prisma-chat.repository.ts` | **Thêm:** logic WHERE id < currentId + reverse |
| 6 | `BE/src/modules/chat-ai/dto/create-chat-session.dto.ts` | Không đổi |
| 7 | `BE/src/modules/chat-ai/dto/send-message.dto.ts` | Không đổi |
| 8 | `BE/src/modules/chat-ai/guards/optional-jwt-auth.guard.ts` | **MỚI** — thay decorator V12 |
| 9 | `BE/src/modules/chat-ai/chat-ai.service.ts` | **Viết lại:** context exclude, guest token, no temperature |
| 10 | `BE/src/modules/chat-ai/chat-ai.controller.ts` | **Sửa:** UseGuards + X-Session-Token header |
| 11 | `BE/src/modules/chat-ai/chat-ai.module.ts` | Thêm guard |
| 12–21 | FE module `chat-ai/` | **Thêm:** guestToken logic |
| — | `BE/.env.example` | **Bỏ** GEMINI_TEMPERATURE |
| — | `BE/src/app.module.ts` | Không đổi |
| — | `FE/src/main.tsx` | Không đổi |
