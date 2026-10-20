import { useCallback, useEffect, useState } from 'react';

import { receptionApi } from '../api/reception.api';
import type { FollowUpReminderGroups } from '../types/reception.types';

const EMPTY_FOLLOW_UPS: FollowUpReminderGroups = { today: [], tomorrow: [] };

export function useFollowUpReminders() {
  const [followUps, setFollowUps] = useState<FollowUpReminderGroups>(EMPTY_FOLLOW_UPS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await receptionApi.getFollowUps();
      setFollowUps(response.data);
    } catch {
      // Giữ dashboard dùng được khi API tạm thời chưa phản hồi.
      setFollowUps(EMPTY_FOLLOW_UPS);
      setError('Không thể tải danh sách nhắc tái khám.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { followUps, isLoading, error, reload };
}
