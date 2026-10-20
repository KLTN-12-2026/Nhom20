import { useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';
import { useAuthStore } from '@/stores/auth.store';

import { profileApi } from '../api/profile.api';

export function useProfileAvatar() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const syncAvatar = (avatarUrl: string | null) => {
    if (!accessToken || !currentUser) return;
    setSession(accessToken, { ...currentUser, avatarUrl });
  };

  const uploadAvatar = async (file: File) => {
    setIsSubmitting(true);
    try {
      const response = await profileApi.uploadAvatar(file);
      syncAvatar(response.data.avatarUrl);
      return response;
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, 'Không thể cập nhật ảnh đại diện'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAvatar = async () => {
    setIsSubmitting(true);
    try {
      const response = await profileApi.removeAvatar();
      syncAvatar(null);
      return response;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Không thể xóa ảnh đại diện'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, uploadAvatar, removeAvatar };
}
