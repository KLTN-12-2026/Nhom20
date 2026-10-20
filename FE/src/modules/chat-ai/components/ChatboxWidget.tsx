import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronDown, LoaderCircle, MessageCircleMore, SendHorizontal, Sparkles, UserRound, X } from 'lucide-react';

import { useChatbox } from '../hooks/use-chatbox';
import { BookingConfirmCard } from './BookingConfirmCard';
import type { ChatMessage } from '../types/chat-ai.types';
import '../chat-ai.css';

const QUICK_SUGGESTIONS = [
  '✨ Tôi nên khám chuyên khoa nào?',
  '📅 Tôi muốn đặt lịch khám',
  '👨‍⚕️ Tìm bác sĩ phù hợp',
  '🏥 Quy trình đi khám như thế nào?',
] as const;

function MessageContent({ content }: { content: string }) {
  // Gemini đôi khi trả về Markdown **in đậm**. Render an toàn, không chèn HTML thô.
  return (
    <>
      {content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        return isBold ? <strong key={index}>{part.slice(2, -2)}</strong> : part;
      })}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'NGUOI_DUNG';
  return (
    <div id={`chatbox-message-${message.id}`} className={`chatbox-v1-message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      {!isUser && <span className="chatbox-v1-avatar"><Bot size={15} /></span>}
      <div className={`chatbox-v1-bubble ${isUser ? 'is-user' : 'is-assistant'}`}>
        <MessageContent content={message.content} />
        {message.isPending && <span className="chatbox-v1-pending">Đang gửi…</span>}
      </div>
      {isUser && <span className="chatbox-v1-avatar is-user"><UserRound size={15} /></span>}
    </div>
  );
}

export default function ChatboxWidget() {
  const { isOpen, setIsOpen, messages, isInitializing, isSending, error, sendMessage, bookingDraft, confirmBooking } = useChatbox();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const quickSuggestionsUsed = new Set(
    messages
      .filter((message) => message.role === 'NGUOI_DUNG')
      .map((message) => message.content),
  );
  const remainingQuickSuggestions = QUICK_SUGGESTIONS.filter(
    (suggestion) => !quickSuggestionsUsed.has(suggestion),
  );

  useEffect(() => {
    if (!isOpen || isInitializing) return;

    const latestMessage = messages.at(-1);
    const target = latestMessage
      ? document.getElementById(`chatbox-message-${latestMessage.id}`)
      : messagesEndRef.current;

    // Khi vừa gửi, ưu tiên đưa bong bóng của khách vào vùng nhìn thấy.
    // Không cuộn thẳng xuống "AI đang trả lời" khiến khách tưởng tin nhắn bị mất.
    requestAnimationFrame(() => target?.scrollIntoView({
      behavior: 'smooth',
      block: isSending ? 'center' : 'end',
    }));
  }, [isInitializing, isOpen, isSending, messages]);

  useEffect(() => {
    if (isOpen && !isInitializing) inputRef.current?.focus();
  }, [isInitializing, isOpen]);

  const submitMessage = async (content = input) => {
    const sent = await sendMessage(content);
    if (sent) setInput('');
  };

  return createPortal(
    <div className="chatbox-v1-root" aria-live="polite">
      {isOpen && (
        <section className="chatbox-v1-panel shadow-lg" aria-label="Trợ lý Smart Clinic">
          <header className="chatbox-v1-header">
            <div className="d-flex align-items-center gap-2">
              <span className="chatbox-v1-header-icon"><Sparkles size={18} /></span>
              <div><h2>Trợ lý Smart Clinic</h2><p>Hỗ trợ thông tin chung</p></div>
            </div>
            <button type="button" className="chatbox-v1-icon-button" onClick={() => setIsOpen(false)} aria-label="Thu gọn Chatbox" title="Thu gọn"><ChevronDown size={20} /></button>
          </header>

          <div className="chatbox-v1-messages">
            {isInitializing ? (
              <div className="chatbox-v1-empty-state"><LoaderCircle className="spin" size={24} /><span>Đang mở cuộc trò chuyện…</span></div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="chatbox-v1-welcome"><span className="chatbox-v1-welcome-icon"><Bot size={19} /></span><div><strong>Xin chào, tôi có thể hỗ trợ gì?</strong><p>Tôi hỗ trợ thông tin chung về quy trình khám.</p></div></div>
                )}
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                {bookingDraft && <BookingConfirmCard draft={bookingDraft} isLoading={isSending} onConfirm={() => void confirmBooking()} />}
                {isSending && <div className="chatbox-v1-message-row is-assistant"><span className="chatbox-v1-avatar"><Bot size={15} /></span><div className="chatbox-v1-bubble is-assistant chatbox-v1-typing"><LoaderCircle className="spin" size={15} /> AI đang trả lời…</div></div>}
                {error && <div className="chatbox-v1-error">{error}</div>}
                {messages.length === 0 && !isSending && (
                  <div className="chatbox-v1-suggestions" aria-label="Gợi ý nhanh">
                    {QUICK_SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" className="chatbox-v1-suggestion" disabled={isSending} onClick={() => void submitMessage(suggestion)}>{suggestion}</button>)}
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && remainingQuickSuggestions.length > 0 && (
            <div className="chatbox-v1-compact-suggestions" aria-label="Gợi ý khác">
              {remainingQuickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chatbox-v1-compact-suggestion"
                  disabled={isInitializing || isSending}
                  onClick={() => void submitMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className="chatbox-v1-composer" onSubmit={(event) => { event.preventDefault(); void submitMessage(); }}>
            <label className="visually-hidden" htmlFor="smart-clinic-chat-input">Nhập tin nhắn</label>
            <input ref={inputRef} id="smart-clinic-chat-input" value={input} maxLength={2000} disabled={isInitializing || isSending} onChange={(event) => setInput(event.target.value)} placeholder="Nhập câu hỏi của bạn…" />
            <button className="chatbox-v1-send-button" type="submit" disabled={!input.trim() || isInitializing || isSending} aria-label="Gửi tin nhắn" title="Gửi tin nhắn"><SendHorizontal size={19} /></button>
          </form>
          <p className="chatbox-v1-note">AI hỗ trợ thông tin chung. Khi đặt lịch, chỉ gửi dữ liệu cần thiết; không gửi thông tin nhạy cảm khác.</p>
        </section>
      )}
      <button type="button" className={`chatbox-v1-launcher shadow ${isOpen ? 'is-open' : ''}`} aria-label={isOpen ? 'Đóng Chatbox' : 'Mở Chatbox'} title={isOpen ? 'Đóng Chatbox' : 'Hỏi trợ lý Smart Clinic'} onClick={() => setIsOpen((current) => !current)}>{isOpen ? <X size={23} /> : <MessageCircleMore size={24} />}</button>
    </div>,
    document.body,
  );
}
