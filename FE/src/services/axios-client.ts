import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_USER_KEY = 'authUser';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Bộ chặn yêu cầu — gắn token xác thực.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function clearSessionAndRedirect() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (window.location.pathname !== '/dang-nhap') {
    window.location.href = '/dang-nhap';
  }
}

let sessionVerification: Promise<boolean> | null = null;

function verifyCurrentSession(token: string) {
  if (!sessionVerification) {
    sessionVerification = axios
      .get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
      .then(() => true)
      .catch((verificationError: unknown) => {
        if (axios.isAxiosError(verificationError)) {
          const status = verificationError.response?.status;
          return status !== 401 && status !== 403;
        }
        return true;
      })
      .finally(() => {
        sessionVerification = null;
      });
  }
  return sessionVerification;
}

// Chỉ kết thúc phiên khi token thực sự không còn hợp lệ.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      const isSessionRequest = error.config?.url?.includes('/auth/me');
      const isSessionValid =
        token && !isSessionRequest
          ? await verifyCurrentSession(token)
          : false;

      if (!isSessionValid) {
        clearSessionAndRedirect();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Không thể thực hiện yêu cầu',
) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
