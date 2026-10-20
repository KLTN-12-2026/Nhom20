import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type FunctionDeclaration } from '@google/genai';

export type GeminiHistoryPart =
  | { text: string }
  | {
      functionCall: {
        id: string;
        name: string;
        args: Record<string, unknown>;
      };
    }
  | {
      functionResponse: {
        id: string;
        name: string;
        response: { output: Record<string, unknown> };
      };
    };

// Luu dung cau truc tool cua Gemini de co the dung lai o cac luot chat sau.
export interface GeminiHistoryItem {
  role: 'user' | 'model';
  parts: GeminiHistoryPart[];
}

export interface GeminiChatResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

export interface GeminiToolRun {
  id: string;
  round: number;
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fallbackModel = 'gemini-flash-lite-latest';

  constructor(configService: ConfigService) {
    // Khong khoi tao Gemini neu chua co key de tranh loi am tham luc gui tin.
    const apiKey = configService.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini chưa được cấu hình');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = configService.get<string>('GEMINI_MODEL', 'gemini-3.5-flash-lite');
    this.timeoutMs = Number(
      // Giới hạn 45 giây để đảm bảo đủ thời gian cho các lượt gọi tool.
      configService.get<string>('GEMINI_TIMEOUT_MS', '45000'),
    );
  }

  getModelName() {
    return this.model;
  }

  private isTransientError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('429')
    );
  }

  async chat(params: {
    systemPrompt: string;
    history: GeminiHistoryItem[];
    userMessage: string;
  }): Promise<GeminiChatResult> {
    try {
      return await this.executeChat(this.model, params);
    } catch (error) {
      if (this.isTransientError(error) && this.model !== this.fallbackModel) {
        return await this.executeChat(this.fallbackModel, params);
      }
      throw error;
    }
  }

  private async executeChat(
    model: string,
    params: {
      systemPrompt: string;
      history: GeminiHistoryItem[];
      userMessage: string;
    },
  ): Promise<GeminiChatResult> {
    // Bat dau tinh do tre de luu vao lan_chay_ai.
    const startedAt = Date.now();

    // Tin hiện tại được gửi riêng để không bị lặp lại trong history.
    const chat = this.ai.chats.create({
      model,
      config: { systemInstruction: params.systemPrompt },
      history: params.history.map((item) => ({
        role: item.role,
        parts: item.parts,
      })),
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      // Dung Promise.race de khong cho Gemini qua lau khi mang co su co.
      const response = await Promise.race([
        chat.sendMessage({ message: params.userMessage }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('GEMINI_TIMEOUT')),
            this.timeoutMs,
          );
        }),
      ]);

      return {
        text:
          response.text?.trim() ||
          'Tôi chưa nhận được nội dung phản hồi. Bạn vui lòng thử lại.',
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GEMINI_ERROR';
      if (message === 'GEMINI_TIMEOUT') {
        throw new ServiceUnavailableException(
          'AI phản hồi quá lâu, bạn vui lòng thử lại.',
        );
      }
      throw error;
    } finally {
      // Don timer de tranh giu tai nguyen sau khi da co ket qua.
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Gemini quyết định khi nào gọi tool; service nghiệp vụ thực thi tool ở tầng module.
  async chatWithTools(params: {
    systemPrompt: string;
    history: GeminiHistoryItem[];
    userMessage: string;
    tools: readonly FunctionDeclaration[];
    executeTool: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  }): Promise<GeminiChatResult & { toolRuns: GeminiToolRun[] }> {
    try {
      return await this.executeChatWithTools(this.model, params);
    } catch (error) {
      if (this.isTransientError(error) && this.model !== this.fallbackModel) {
        return await this.executeChatWithTools(this.fallbackModel, params);
      }
      throw error;
    }
  }

  private async executeChatWithTools(
    model: string,
    params: {
      systemPrompt: string;
      history: GeminiHistoryItem[];
      userMessage: string;
      tools: readonly FunctionDeclaration[];
      executeTool: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    },
  ): Promise<GeminiChatResult & { toolRuns: GeminiToolRun[] }> {
    const startedAt = Date.now();
    // Toàn bộ lượt chat có tool chỉ được dùng tối đa một ngân sách thời gian chung.
    const deadline = startedAt + this.timeoutMs;
    const chat = this.ai.chats.create({
      model,
      config: {
        systemInstruction: params.systemPrompt,
        tools: [{ functionDeclarations: [...params.tools] }],
      },
      history: params.history.map((item) => ({
        role: item.role,
        parts: item.parts,
      })),
    });
    let response: any = await this.withTimeout(
      chat.sendMessage({ message: params.userMessage }),
      this.getRemainingTimeout(deadline),
    );
    const toolRuns: GeminiToolRun[] = [];
    for (let index = 0; index < 4; index += 1) {
      const calls = (response.functionCalls ?? []) as Array<{
        id?: string;
        name?: string;
        args?: Record<string, unknown>;
      }>;
      if (!calls.length) break;
      const responses = [] as Array<Record<string, unknown>>;
      for (const call of calls) {
        if (!call.name) continue;
        const args = call.args ?? {};
        const result = await params.executeTool(call.name, args);
        const callId =
          call.id ?? `tool-${Date.now()}-${index}-${toolRuns.length}`;
        toolRuns.push({
          id: callId,
          round: index,
          name: call.name,
          args,
          result,
        });
        responses.push({
          functionResponse: {
            id: callId,
            name: call.name,
            response: { output: result },
          },
        });
      }
      response = await this.withTimeout(
        chat.sendMessage({ message: responses }),
        this.getRemainingTimeout(deadline),
      );
    }
    return {
      text:
        response.text?.trim() ||
        'Tôi chưa tìm thấy dữ liệu phù hợp. Bạn vui lòng thử diễn đạt rõ hơn.',
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      latencyMs: Date.now() - startedAt,
      toolRuns,
    };
  }

  // Không cho nhiều vòng tool cộng dồn thành thời gian chờ quá dài cho khách.
  private getRemainingTimeout(deadline: number) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('GEMINI_TIMEOUT');
    return remaining;
  }

  private async withTimeout<T>(
    request: Promise<T>,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        request,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('GEMINI_TIMEOUT')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
