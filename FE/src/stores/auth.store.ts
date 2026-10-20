import { create } from 'zustand';

import type { AuthenticatedUser } from '@/modules/xac-thuc/types/auth.types';

const ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_USER_KEY = 'authUser';

function readStoredUser() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthenticatedUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  setSession: (accessToken: string, user: AuthenticatedUser) => void;
  clearSession: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  user: readStoredUser(),

  setSession: (accessToken, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    set({ accessToken, user });
  },

  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    set({ accessToken: null, user: null });
  },

  hasRole: (role) => get().user?.roles.includes(role) ?? false,
}));
