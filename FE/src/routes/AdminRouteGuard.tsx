import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { authApi } from '@/modules/xac-thuc/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

type VerificationState = 'checking' | 'valid' | 'invalid';

export default function AdminRouteGuard({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [verification, setVerification] = useState<VerificationState>(
    accessToken ? 'checking' : 'invalid',
  );

  useEffect(() => {
    let active = true;
    if (!accessToken) {
      setVerification('invalid');
      return () => {
        active = false;
      };
    }

    setVerification('checking');
    void authApi
      .getMe()
      .then((response) => {
        if (!active) return;
        setSession(accessToken, response.data);
        setVerification(
          response.data.roles.includes('ADMIN') ? 'valid' : 'invalid',
        );
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setVerification('invalid');
      });

    return () => {
      active = false;
    };
  }, [accessToken, clearSession, setSession]);

  if (verification === 'checking') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!accessToken || !user || verification === 'invalid') {
    return (
      <Navigate
        to="/dang-nhap"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
