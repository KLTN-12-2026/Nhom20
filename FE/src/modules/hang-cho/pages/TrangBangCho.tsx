import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { realtimeSocket } from '@/services/socket-client';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';

import { queueApi } from '../api/queue.api';
import type { QueueTicket } from '../types/queue.types';
import './waiting-board.css';

function getInitials(fullName?: string | null) {
  if (!fullName) return 'BS';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function formatClock(value: Date) {
  return value.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(value: Date) {
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(value);
  const text = `${weekday}, ${dinhDangNgay(value)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TrangBangCho() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await queueApi.getPublicQueue();
      setTickets(response.data.items);
      setError(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải bảng gọi số'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Bảng chờ là trang public, không qua auth flow → cần tự connect socket
    if (!realtimeSocket.connected) {
      realtimeSocket.connect();
    }
    realtimeSocket.emit('waiting-board.join');
    void reload();

    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);
    const refreshTimer = window.setInterval(() => void reload(), 30_000);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
    };
  }, [reload]);

  useRealtimeEvent<QueueTicket>('queue.patient_called', reload);
  useRealtimeEvent<QueueTicket>('queue.updated', reload);

  const activeTicket = tickets[0] ?? null;
  const otherTickets = useMemo(() => tickets.slice(1), [tickets]);

  return (
    <main className="waiting-board">
      <header className="waiting-board__header">
        <div className="waiting-board__heading">
          <div className="waiting-board__brand-line">
            <span className="waiting-board__brand">Smart Clinic</span>
            <span className="waiting-board__divider" />
            <span className="waiting-board__system-name">
              Hệ thống điều phối khám bệnh
            </span>
          </div>
          <h1>Bảng gọi số khám bệnh</h1>
          <p>
            Vui lòng theo dõi số phiếu và di chuyển đến phòng khám được chỉ
            định.
          </p>
        </div>
        <div className="waiting-board__clock" aria-label="Thời gian hiện tại">
          <strong>{formatClock(now)}</strong>
          <span>{formatDate(now)}</span>
        </div>
      </header>

      <section
        className="waiting-board__content"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {error && !activeTicket && (
          <div className="waiting-board__empty">
            <span className="material-symbols-outlined">cloud_off</span>
            <h2>Chưa thể tải bảng gọi số</h2>
            <p>{error}</p>
            <button type="button" onClick={() => void reload()}>
              Thử lại
            </button>
          </div>
        )}

        {!error && isLoading && (
          <div className="waiting-board__empty">
            <span className="material-symbols-outlined waiting-board__spin">
              progress_activity
            </span>
            <h2>Đang cập nhật bảng gọi số</h2>
          </div>
        )}

        {!isLoading && !error && !activeTicket && (
          <div className="waiting-board__empty">
            <span className="material-symbols-outlined">hourglass_empty</span>
            <h2>Hiện chưa có số thứ tự nào được gọi</h2>
            <p>Hệ thống đang sẵn sàng, vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {activeTicket && (
          <>
            <article className="waiting-board__active-ticket">
              <div className="waiting-board__active-number">
                <div className="waiting-board__calling-status">
                  <span className="waiting-board__pulse" />
                  Đang gọi
                </div>
                <small>Mời số</small>
                <strong>{activeTicket.queueNumber}</strong>
                <div className="waiting-board__room">
                  <span className="material-symbols-outlined">
                    meeting_room
                  </span>
                  <div>
                    <small>Phòng khám</small>
                    <b>
                      {activeTicket.room?.name ?? 'Đang phân phòng'} ·{' '}
                      {activeTicket.specialty.name}
                    </b>
                  </div>
                </div>
              </div>

              <div className="waiting-board__doctor-panel">
                <div className="waiting-board__doctor">
                  <div className="waiting-board__doctor-avatar">
                    {getInitials(activeTicket.doctor?.fullName)}
                  </div>
                  <div>
                    <small>Bác sĩ phụ trách</small>
                    <h2>
                      {activeTicket.doctor?.fullName ?? 'Đang phân công bác sĩ'}
                    </h2>
                    <span>{activeTicket.specialty.name}</span>
                  </div>
                </div>
                <div className="waiting-board__ready">
                  <div>
                    <span>Trạng thái phòng</span>
                    <strong>Sẵn sàng tiếp nhận</strong>
                  </div>
                  <div className="waiting-board__progress">
                    <span />
                  </div>
                  <p>Mời bệnh nhân có số thứ tự trên vào phòng khám.</p>
                </div>
              </div>
            </article>

            {otherTickets.length > 0 && (
              <section className="waiting-board__other-section">
                <div className="waiting-board__section-title">
                  <h2>Các số đang được gọi</h2>
                  <span>{otherTickets.length} phòng khám khác</span>
                </div>
                <div className="waiting-board__ticket-grid">
                  {otherTickets.map((ticket) => (
                    <article className="waiting-board__ticket" key={ticket.id}>
                      <div className="waiting-board__ticket-top">
                        <div>
                          <small>Mời số</small>
                          <strong>{ticket.queueNumber}</strong>
                        </div>
                        <span className="material-symbols-outlined">
                          meeting_room
                        </span>
                      </div>
                      <div className="waiting-board__ticket-info">
                        <span>
                          {ticket.room?.name ?? 'Đang phân phòng'} ·{' '}
                          {ticket.specialty.name}
                        </span>
                        <strong>
                          {ticket.doctor?.fullName ?? 'Đang phân công bác sĩ'}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      <footer className="waiting-board__ticker" aria-label="Thông báo">
        <div>
          <span>
            Vui lòng chuẩn bị sẵn giấy tờ tùy thân và thẻ bảo hiểm y tế.
          </span>
          <span>Quý khách vui lòng giữ trật tự và theo dõi bảng gọi số.</span>
          <span>Smart Clinic kính chúc quý khách nhiều sức khỏe.</span>
          <span aria-hidden="true">
            Vui lòng chuẩn bị sẵn giấy tờ tùy thân và thẻ bảo hiểm y tế.
          </span>
          <span aria-hidden="true">
            Quý khách vui lòng giữ trật tự và theo dõi bảng gọi số.
          </span>
        </div>
      </footer>
    </main>
  );
}
