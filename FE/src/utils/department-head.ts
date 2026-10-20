/**
 * TODO(BE-QUAN-LY-DON-VI): Đây chỉ là cách nhận diện trưởng khoa tạm thời
 * trong giai đoạn dựng FE. Khi API /auth/me trả managementAssignments từ
 * bảng QuanLyDonVi, thay điều kiện email bằng dữ liệu phân công đang hoạt động,
 * rồi xóa file utility này.
 */
export function isDepartmentHeadEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return normalized.startsWith('truongkhoa.') || normalized === 'duocsi@gmail.com';
}
