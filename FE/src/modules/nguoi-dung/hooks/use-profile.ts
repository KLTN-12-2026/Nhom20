import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { profileApi } from '../api/profile.api';
import type {
  ChangePasswordPayload,
  ManagedUser,
  UpdateProfilePayload,
} from '../types/user.types';

export function useProfile() {
  const [profile, setProfile] = useState<ManagedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await profileApi.getProfile();
      setProfile(response.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tải thông tin cá nhân'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const response = await profileApi.updateProfile(payload);
    setProfile(response.data);
    return response;
  };

  const uploadAvatar = async (file: File) => {
    const response = await profileApi.uploadAvatar(file);
    setProfile(response.data);
    return response;
  };

  const removeAvatar = async () => {
    const response = await profileApi.removeAvatar();
    setProfile(response.data);
    return response;
  };

  const changePassword = (payload: ChangePasswordPayload) =>
    profileApi.changePassword(payload);

  return {
    profile,
    isLoading,
    error,
    reload: loadProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
  };
}
