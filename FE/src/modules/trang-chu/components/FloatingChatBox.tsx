import { type FormEvent, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: number;
  sender: 'assistant' | 'user';
  content: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    content:
      'Xin chào! Tôi là trợ lý Smart Clinic. Bạn có thể mô tả triệu chứng hoặc đặt câu hỏi về dịch vụ khám.',
  },
];

const SUGGESTED_QUESTIONS = [
  'Tôi nên khám chuyên khoa nào?',
  'Hướng dẫn đặt lịch khám',
];

export default function FloatingChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [isOpen, messages]);

  function sendMessage(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    const createdAt = Date.now();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createdAt,
        sender: 'user',
        content: trimmedContent,
      },
      {
        id: createdAt + 1,
        sender: 'assistant',
        content:
          'Chatbox đang ở chế độ giao diện thử nghiệm. Câu hỏi của bạn sẽ được gửi đến trợ lý AI khi Backend được kết nối.',
      },
    ]);
    setMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(message);
  }

  return (
    <div className="floating-chatbox">
      {isOpen && (
        <section
          className="floating-chatbox__panel"
          aria-label="Trợ lý Smart Clinic"
        >
          <header className="floating-chatbox__header">
            <div className="d-flex align-items-center gap-3">
              <div className="floating-chatbox__avatar">
                <span className="material-symbols-outlined filled">
                  health_and_safety
                </span>
              </div>

              <div>
                <h2 className="text-label-lg mb-0">Trợ lý Smart Clinic</h2>
                <div className="d-flex align-items-center gap-2">
                  <span className="floating-chatbox__status-dot" />
                  <span style={{ fontSize: 12 }}>Sẵn sàng hỗ trợ</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="floating-chatbox__icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ trò chuyện"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <div
            ref={messageListRef}
            className="floating-chatbox__messages"
            aria-live="polite"
          >
            <p className="floating-chatbox__notice">
              Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán của
              bác sĩ.
            </p>

            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`floating-chatbox__message floating-chatbox__message--${chatMessage.sender}`}
              >
                {chatMessage.content}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="d-flex flex-column align-items-start gap-2">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="floating-chatbox__suggestion"
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="floating-chatbox__composer" onSubmit={handleSubmit}>
            <label htmlFor="health-chat-message" className="visually-hidden">
              Nhập câu hỏi
            </label>
            <input
              id="health-chat-message"
              type="text"
              className="floating-chatbox__input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              autoComplete="off"
            />
            <button
              type="submit"
              className="floating-chatbox__send"
              disabled={!message.trim()}
              aria-label="Gửi câu hỏi"
            >
              <span className="material-symbols-outlined filled">send</span>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="floating-chatbox__launcher"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={isOpen ? 'Đóng trợ lý' : 'Mở trợ lý Smart Clinic'}
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined filled">
          {isOpen ? 'close' : 'chat'}
        </span>
        {!isOpen && <span>Hỏi trợ lý AI</span>}
      </button>
    </div>
  );
}
