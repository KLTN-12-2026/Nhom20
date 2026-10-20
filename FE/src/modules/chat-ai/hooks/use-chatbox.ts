import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';

import { chatAiApi } from '../api/chat-ai.api';
import type { BookingDraft, ChatMessage, ChatSession } from '../types/chat-ai.types';

function normalizeLegacyBookingDateFormat(content: string) {
  // Chỉ đổi cách hiển thị các hướng dẫn cũ đã lưu trước khi chuẩn ngày dd/MM/yyyy được áp dụng.
  return content
    .replaceAll('định dạng YYYY-MM-DD, ví dụ: 1995-05-20', 'định dạng dd/MM/yyyy, ví dụ: 20/05/1995')
    .replaceAll('định dạng YYYY-MM-DD, HH:mm', 'định dạng dd/MM/yyyy, HH:mm')
    .replaceAll('YYYY-MM-DD', 'dd/MM/yyyy')
    .replaceAll('YYYY/MM/DD', 'dd/MM/yyyy');
}

export function useChatbox() {
  const { showToast } = useAppToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializePromiseRef = useRef<Promise<void> | null>(null);
  const sessionRef = useRef<ChatSession | null>(null);
  const guestTokenRef = useRef<string | undefined>(undefined);
  const sendingRef = useRef(false);

  const loadSessionMessages = useCallback(
    async (sessionId: number, token?: string) => {
      const data = await chatAiApi.getMessages(sessionId, token);
      sessionRef.current = data.data.session;
      setMessages(
        data.data.messages.map((message) => ({
          ...message,
          content: normalizeLegacyBookingDateFormat(message.content),
        })),
      );
      setBookingDraft(data.data.bookingDraft);
    },
    [],
  );

  const initialize = useCallback(async () => {
    if (sessionRef.current) return;
    if (initializePromiseRef.current) return initializePromiseRef.current;

    const task = (async () => {
      setIsLoadingHistory(true);
      setError(null);
      try {
        // Mỗi lần tải lại trang bắt đầu một phiên hiển thị mới, lịch sử cũ vẫn lưu cho Admin tra cứu.
        const data = await chatAiApi.createSession(true);
        sessionRef.current = data.data.session;
        setMessages([]);
        setBookingDraft(null);

        guestTokenRef.current = data.data.sessionToken ?? undefined;
      } catch (error) {
        setError(getApiErrorMessage(error, 'Không thể khởi tạo trò chuyện'));
        showToast(
          getApiErrorMessage(error, 'Không thể khởi tạo trò chuyện'),
          'danger',
        );
      } finally {
        setIsLoadingHistory(false);
      }
    })();

    initializePromiseRef.current = task;
    try {
      await task;
    } finally {
      initializePromiseRef.current = null;
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) void initialize();
  }, [initialize, isOpen]);

  const sendMessage = useCallback(
    async (content: string) => {
      const normalizedContent = content.trim();
      if (!normalizedContent || sendingRef.current) return false;

      // Khóa gửi ngay từ lúc khởi tạo phiên để ngăn click nhanh tạo tin nhắn trùng.
      sendingRef.current = true;
      setIsSending(true);

      if (!sessionRef.current) await initialize();
      const activeSession = sessionRef.current;
      if (!activeSession) {
        showToast('Không thể tạo phiên trò chuyện, vui lòng thử lại.', 'danger');
        setIsSending(false);
        sendingRef.current = false;
        return false;
      }

      // Hiển thị ngay nội dung khách vừa gửi, không chờ Gemini phản hồi mới render.
      const pendingMessageId = -Date.now();
      const pendingMessage: ChatMessage = {
        id: pendingMessageId,
        role: 'NGUOI_DUNG',
        content: normalizedContent,
        createdAt: new Date().toISOString(),
        isPending: true,
      };
      setMessages((current) => [...current, pendingMessage]);
      setError(null);

      // Nhường một khung hình để nội dung khách vừa gửi xuất hiện trước trạng thái AI.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      try {
        const data = await chatAiApi.sendMessage(
          activeSession.id,
          normalizedContent,
          guestTokenRef.current,
        );
        setMessages((current) => [
          ...current.map((message) =>
            message.id === pendingMessageId ? data.data.userMessage : message,
          ),
          {
            ...data.data.assistantMessage,
            content: normalizeLegacyBookingDateFormat(data.data.assistantMessage.content),
          },
        ]);
        setBookingDraft(data.data.bookingDraft);
        return true;
      } catch (error) {
        // Nếu mạng lỗi, giữ lại nội dung đã nhập để khách không phải gõ lại.
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessageId
              ? { ...message, isPending: false }
              : message,
          ),
        );
        setError(getApiErrorMessage(error, 'Không thể gửi câu hỏi đến AI'));
        showToast(
          getApiErrorMessage(error, 'Không thể gửi câu hỏi đến AI'),
          'danger',
        );
        try {
          await loadSessionMessages(activeSession.id, guestTokenRef.current);
        } catch {
          // Tin đã lưu sẽ được tải lại khi người dùng mở Chatbox lần sau.
        }
        return false;
      } finally {
        setIsSending(false);
        sendingRef.current = false;
      }
    },
    [initialize, loadSessionMessages, showToast],
  );

  const confirmBooking = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || !bookingDraft || isSending) return false;
    setIsSending(true);
    try {
      const data = await chatAiApi.confirmBooking(
        activeSession.id,
        bookingDraft.id,
        guestTokenRef.current,
      );
      setMessages((current) => [...current, data.data.assistantMessage]);
      setBookingDraft(null);
      showToast('Đã gửi yêu cầu đặt lịch. Lễ tân sẽ xác nhận sau.', 'success');
      return true;
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể xác nhận yêu cầu đặt lịch'), 'danger');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [bookingDraft, isSending, showToast]);

  return {
    isOpen,
    setIsOpen,
    messages,
    isInitializing: isLoadingHistory,
    isSending,
    error,
    sendMessage,
    bookingDraft,
    confirmBooking,
  };
}
