import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import type { Notification } from '../api/notifications.api';
import { useNotifications } from '../hooks/use-notifications';
import './notification-bell.css';

const notificationIcons: Record<string, string> = {
  DON_THUOC: 'prescriptions',
  LICH_LAM_VIEC: 'calendar_month',
  LICH_HEN: 'event_note',
  THANH_TOAN: 'receipt_long',
  BAN_GIAO_CA: 'assignment_turned_in',
};

function getNotificationIcon(type: string) {
  return notificationIcons[type] ?? 'notifications';
}

// Phân nhóm màu theo nghiệp vụ để người dùng nhận biết thông báo nhanh hơn.
function getNotificationTone(type: string) {
  const tones: Record<string, string> = {
    DON_THUOC: 'medicine',
    LICH_LAM_VIEC: 'schedule',
    LICH_HEN: 'appointment',
    THANH_TOAN: 'payment',
    BAN_GIAO_CA: 'handover',
  };

  return tones[type] ?? 'general';
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  // Đóng bảng thông báo khi người dùng bấm ra ngoài hoặc nhấn Escape.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.daDoc) {
      void markAsRead(notification.id);
    }

    setIsOpen(false);
    if (notification.duongDan) {
      navigate(notification.duongDan);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadLabel = unreadCount > 99 ? '99+ chưa đọc' : `${unreadCount} chưa đọc`;

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell__btn ${isOpen ? 'notification-bell__btn--open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadLabel}` : 'Thông báo'}
        aria-expanded={isOpen}
        aria-controls="notification-popover"
        title="Thông báo"
      >
        <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section id="notification-popover" className="notification-bell__dropdown" aria-label="Danh sách thông báo">
          <header className="notification-bell__header">
            <div>
              <p className="notification-bell__eyebrow">TRUNG TÂM THÔNG BÁO</p>
              <h4>
                Thông báo
                {unreadCount > 0 && <span className="notification-bell__unread-count">{unreadLabel}</span>}
              </h4>
            </div>
            <button
              type="button"
              className="notification-bell__read-all"
              onClick={() => void handleMarkAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAll}
            >
              {isMarkingAll ? 'Đang cập nhật...' : 'Đánh dấu đã đọc'}
            </button>
          </header>

          <div className="notification-bell__list" aria-live="polite">
            {isLoading && notifications.length === 0 ? (
              <div className="notification-bell__skeleton" aria-label="Đang tải thông báo">
                <span />
                <span />
                <span />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-bell__empty">
                <span className="material-symbols-outlined" aria-hidden="true">notifications_off</span>
                <strong>Chưa có thông báo mới</strong>
                <p>Thông báo lịch hẹn, ca làm và công việc sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-item ${!notification.daDoc ? 'notification-item--unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  aria-label={`${notification.daDoc ? 'Đã đọc' : 'Mới'}: ${notification.tieuDe}. ${notification.noiDung}`}
                >
                  <span
                    className={`notification-item__icon notification-item__icon--${getNotificationTone(notification.loaiThongBao)}`}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{getNotificationIcon(notification.loaiThongBao)}</span>
                  </span>
                  <span className="notification-item__content">
                    <span className="notification-item__topline">
                      <strong className="notification-item__title">{notification.tieuDe}</strong>
                      {!notification.daDoc && <span className="notification-item__new">Mới</span>}
                    </span>
                    <span className="notification-item__desc">{notification.noiDung}</span>
                    <time className="notification-item__time">{dinhDangNgayGio(notification.createdAt)}</time>
                  </span>
                  {!notification.daDoc && <span className="notification-item__dot" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
