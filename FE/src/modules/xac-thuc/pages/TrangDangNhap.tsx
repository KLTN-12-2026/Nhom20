import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';

import { useAuth } from '../hooks/use-auth';

interface LoginLocationState {
  from?: string;
}

function getDefaultRoute(roles: string[]) {
  if (roles.includes('ADMIN')) return '/admin/dashboard';
  if (roles.includes('DOCTOR')) return '/bac-si';
  if (roles.includes('RECEPTIONIST')) return '/thu-ngan';
  if (roles.includes('PHARMACIST')) return '/duoc-si';
  if (roles.includes('PATIENT')) return '/thong-tin-ca-nhan';
  return '/';
}

export default function TrangDangNhap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useAppToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await login({ identifier, password });
      showToast(response.message);

      const requestedRoute = (location.state as LoginLocationState | null)
        ?.from;
      const canOpenRequestedAdminRoute =
        requestedRoute?.startsWith('/admin') &&
        response.data.user.roles.includes('ADMIN');

      navigate(
        canOpenRequestedAdminRoute && requestedRoute
          ? requestedRoute
          : getDefaultRoute(response.data.user.roles),
        { replace: true },
      );
    } catch (requestError) {
      showToast(
        getApiErrorMessage(
          requestError,
          'Email, số điện thoại hoặc mật khẩu không chính xác',
        ),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-headline-sm fw-bold text-on-surface mb-1">
        Đăng nhập hệ thống
      </h2>
      <p className="text-body-sm text-on-surface-variant mb-4">
        Nhập thông tin tài khoản của bạn để tiếp tục.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label
            htmlFor="login-identifier"
            className="form-label text-label-md text-on-surface"
          >
            Tài khoản
          </label>
          <input
            id="login-identifier"
            name="identifier"
            type="text"
            className="form-control"
            placeholder="Nhập email hoặc số điện thoại"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            required
            style={{
              borderRadius: 8,
              borderColor: 'var(--sc-outline-variant)',
              fontSize: 14,
              padding: '10px 14px',
            }}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="login-password"
            className="form-label text-label-md text-on-surface"
          >
            Mật khẩu
          </label>
          <div className="position-relative">
            <input
              id="login-password"
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              className="form-control"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
              style={{
                borderRadius: 8,
                borderColor: 'var(--sc-outline-variant)',
                fontSize: 14,
                padding: '10px 48px 10px 14px',
              }}
            />
            <button
              type="button"
              className="btn position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent px-3"
              onClick={() => setIsPasswordVisible((current) => !current)}
              aria-label={
                isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
              }
              aria-pressed={isPasswordVisible}
              title={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 20 }}
              >
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="text-end mb-3">
          <Link
            to="/quen-mat-khau"
            className="text-primary text-decoration-none text-body-sm"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 mb-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p className="text-center text-body-sm text-on-surface-variant mb-2">
          Chưa có tài khoản?{' '}
          <Link to="/dang-ky" className="text-primary text-decoration-none">
            Đăng ký
          </Link>
        </p>

        <p className="text-center text-body-sm text-on-surface-variant mb-0">
          <Link to="/" className="text-primary text-decoration-none">
            ← Về trang chủ
          </Link>
        </p>
      </form>
    </div>
  );
}
