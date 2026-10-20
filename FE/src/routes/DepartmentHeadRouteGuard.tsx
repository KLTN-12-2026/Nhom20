import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { isDepartmentHeadEmail } from '@/utils/department-head';

export default function DepartmentHeadRouteGuard({ children }: { children: ReactNode }) {
  const email = useAuthStore((state) => state.user?.email);
  // TODO(BE-QUAN-LY-DON-VI): Backend vẫn phải kiểm tra quyền theo QuanLyDonVi.
  return isDepartmentHeadEmail(email) ? children : <Navigate to="/bac-si/lich-lam-viec" replace />;
}
