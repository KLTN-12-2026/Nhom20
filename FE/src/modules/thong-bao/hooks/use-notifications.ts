import { useCallback, useEffect, useState } from 'react';

import { realtimeSocket } from '@/services/socket-client';
import { type Notification, notificationsApi } from '../api/notifications.api';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getMyNotifications(1, 20);
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Không thể tải thông báo:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, daDoc: true } : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error('Không thể đánh dấu thông báo đã đọc:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, daDoc: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Không thể đánh dấu tất cả thông báo đã đọc:', error);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      if (!notification?.id) {
        void fetchNotifications();
        return;
      }
      setNotifications((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [notification, ...current],
      );
      if (!notification.daDoc) {
        setUnreadCount((current) => current + 1);
      }
    };

    realtimeSocket.on('new_notification', handleNewNotification);
    return () => { realtimeSocket.off('new_notification', handleNewNotification); };
  }, [fetchNotifications]);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
