import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { authApi } from '../api/auth.api';

export default function TrangDatLaiMatKhau() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const { showToast } = useAppToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = params.get('token') || '';
    if (password !== confirmPassword) {
      showToast('Xác nhận mật khẩu chưa khớp', 'danger');
      return;
    }

    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      showToast('Đặt lại mật khẩu thành công');
    } catch {
      showToast('Liên kết không hợp lệ hoặc đã hết hạn', 'danger');
    }
  };

  return (
    <div>
      <h2 className="text-headline-sm fw-bold text-on-surface mb-1">Đặt lại mật khẩu</h2>
      <p className="text-body-sm text-on-surface-variant mb-4">Tạo mật khẩu mới cho tài khoản của bạn.</p>
      {done ? <Link to="/dang-nhap" className="btn btn-primary w-100">Đăng nhập</Link> : (
        <form onSubmit={submit}>
          <label htmlFor="new-password" className="form-label">Mật khẩu mới</label>
          <input id="new-password" type="password" minLength={8} className="form-control mb-4" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <label htmlFor="confirm-password" className="form-label">Xác nhận mật khẩu mới</label>
          <input id="confirm-password" type="password" minLength={8} className="form-control mb-4" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <button type="submit" className="btn btn-primary w-100">Lưu mật khẩu</button>
        </form>
      )}
    </div>
  );
}
