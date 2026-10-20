import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { authApi } from '../api/auth.api';

export default function TrangXacMinhEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Đang xác minh email...');

  useEffect(() => {
    authApi.confirmEmail(params.get('token') || '')
      .then(() => setMessage('Email đã được xác minh thành công.'))
      .catch(() => setMessage('Liên kết không hợp lệ hoặc đã hết hạn.'));
  }, [params]);

  return <div><h2 className="text-headline-sm fw-bold text-on-surface mb-3">Xác minh email</h2><p className="text-body-sm text-on-surface-variant mb-4">{message}</p><Link to="/dang-nhap" className="btn btn-primary w-100">Đăng nhập</Link></div>;
}
