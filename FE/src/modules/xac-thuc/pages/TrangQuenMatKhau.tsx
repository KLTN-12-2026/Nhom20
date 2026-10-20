import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { authApi } from '../api/auth.api';

export default function TrangQuenMatKhau() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useAppToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
      showToast('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi');
    } catch {
      showToast('Không thể gửi yêu cầu lúc này', 'danger');
    }
  };

  return (
    <div>
      <h2 className="text-headline-sm fw-bold text-on-surface mb-1">Quên mật khẩu</h2>
      <p className="text-body-sm text-on-surface-variant mb-4">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
      {submitted && <div className="alert alert-success">Hãy kiểm tra hộp thư và cả mục Spam.</div>}
      <form onSubmit={submit}>
        <label htmlFor="forgot-password-email" className="form-label text-label-md text-on-surface">Email</label>
        <input id="forgot-password-email" type="email" className="form-control mb-4" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" required />
        <button type="submit" className="btn btn-primary w-100 mb-3">Gửi yêu cầu</button>
        <p className="text-center text-body-sm text-on-surface-variant mb-0"><Link to="/dang-nhap" className="text-primary text-decoration-none">← Quay lại đăng nhập</Link></p>
      </form>
    </div>
  );
}
