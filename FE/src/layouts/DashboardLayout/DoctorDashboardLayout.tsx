import { DOCTOR_MENU_ITEMS } from '@/config/menu.config';
import { useAuthStore } from '@/stores/auth.store';
import { isDepartmentHeadEmail } from '@/utils/department-head';
import DashboardLayout from './DashboardLayout';

export default function DoctorDashboardLayout() {
  const user = useAuthStore((state) => state.user);
  // TODO(BE-QUAN-LY-DON-VI): thay bằng managementAssignments từ /auth/me.
  const isDepartmentHead = isDepartmentHeadEmail(user?.email);
  const navigationItems = DOCTOR_MENU_ITEMS.filter(
    (item) => !item.departmentHeadOnly || isDepartmentHead,
  );

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      roleLabel={isDepartmentHead ? 'Trưởng khoa' : 'Bác sĩ'}
      profilePath="/bac-si/thong-tin-ca-nhan"
    />
  );
}
