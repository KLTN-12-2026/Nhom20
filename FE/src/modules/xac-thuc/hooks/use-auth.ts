import { authApi } from '../api/auth.api';
import type { LoginPayload } from '../types/auth.types';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    setSession(response.data.accessToken, response.data.user);
    return response;
  };

  return {
    user,
    accessToken,
    login,
    logout: clearSession,
  };
}
