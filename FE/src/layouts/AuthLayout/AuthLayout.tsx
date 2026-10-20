// Khung dùng chung cho đăng nhập, đăng ký và khôi phục mật khẩu.
// Không có đầu trang hoặc chân trang, chỉ có thương hiệu và biểu mẫu căn giữa.

import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ backgroundColor: 'var(--sc-surface-container-low)' }}
    >
      <div className="w-100" style={{ maxWidth: 440, padding: '0 24px' }}>
        {/* Brand */}
        <div className="text-center mb-4">
          <span
            className="material-symbols-outlined filled text-primary"
            style={{ fontSize: 48 }}
          >
            medical_services
          </span>
          <h1 className="text-headline-md fw-bold text-primary mt-2 mb-0">
            Smart Clinic
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Chăm sóc sức khỏe thông minh
          </p>
        </div>

        {/* Form container */}
        <div
          className="card border-0 p-4"
          style={{
            borderRadius: 16,
            boxShadow: 'var(--sc-shadow-md)',
            backgroundColor: 'var(--sc-surface-container-lowest)',
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
