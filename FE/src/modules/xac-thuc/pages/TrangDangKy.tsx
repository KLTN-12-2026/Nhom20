import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.75-5.59-4.11H3.08v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.93V7.48H3.08A10 10 0 0 0 2 12c0 1.62.39 3.15 1.08 4.52l3.33-2.59Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.96 2.98 14.7 2 12 2a10 10 0 0 0-8.92 5.48l3.33 2.59C7.2 7.71 9.4 5.96 12 5.96Z" />
    </svg>
  );
}

export default function TrangDangKy() {
  const { showToast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Giữ form sẵn sàng cho luồng đăng ký thật, chưa tạo tài khoản khi API chưa được kết nối.
    window.setTimeout(() => {
      setIsSubmitting(false);
      showToast('Đăng ký trực tuyến sẽ được kết nối với xác thực số điện thoại.', 'info');
    }, 250);
  };

  const handleGoogleLogin = () => {
    showToast('Đăng nhập với Google sẽ được kết nối trong giai đoạn xác thực tài khoản.', 'info');
  };

  return (
    <section aria-labelledby="register-title">
      <h2 id="register-title" className="text-headline-sm fw-bold text-on-surface mb-1">
        Tạo tài khoản bệnh nhân
      </h2>
      <p className="text-body-sm text-on-surface-variant mb-3">
        Đăng ký tài khoản để đặt lịch khám và quản lý hồ sơ khám bệnh.
      </p>

      <form onSubmit={handleSubmit} aria-label="Biểu mẫu đăng ký bệnh nhân">
        <div className="mb-3">
          <label className="form-label text-label-md text-on-surface" htmlFor="register-full-name">
            Họ và tên
          </label>
          <input
            id="register-full-name"
            className="form-control"
            type="text"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label text-label-md text-on-surface" htmlFor="register-phone">
            Số điện thoại
          </label>
          <input
            id="register-phone"
            className="form-control"
            type="tel"
            placeholder="0901234567"
            autoComplete="tel"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label text-label-md text-on-surface" htmlFor="register-password">
            Mật khẩu
          </label>
          <input
            id="register-password"
            className="form-control"
            type="password"
            placeholder="Mật khẩu tối thiểu 8 ký tự"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Đang kiểm tra thông tin...' : 'Đăng ký'}
        </button>

        <div className="d-flex align-items-center gap-2 my-3" aria-hidden="true">
          <div className="flex-grow-1 border-top" />
          <span className="text-body-sm text-on-surface-variant">hoặc</span>
          <div className="flex-grow-1 border-top" />
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={handleGoogleLogin}
          title="Đăng nhập với Google"
        >
          <GoogleIcon />
          Đăng nhập với Google
        </button>
      </form>

      <p className="text-center text-body-sm text-on-surface-variant mt-4 mb-2">
        Đã có tài khoản?{' '}
        <Link to="/dang-nhap" className="text-primary text-decoration-none">
          Đăng nhập
        </Link>
      </p>
      <p className="text-center text-body-sm text-on-surface-variant mb-0">
        <Link to="/" className="text-primary text-decoration-none">
          ← Về trang chủ
        </Link>
      </p>
    </section>
  );
}
