// Router chính cho trang công khai và mọi vai trò đã đăng nhập.

import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import PublicLayout from '@/layouts/PublicLayout/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout/DashboardLayout';
import DoctorDashboardLayout from '@/layouts/DashboardLayout/DoctorDashboardLayout';
import {
  ADMIN_MENU_ITEMS,
  CASHIER_MENU_ITEMS,
  PHARMACIST_MENU_ITEMS,
} from '@/config/menu.config';
import AuthenticatedRouteGuard from './AuthenticatedRouteGuard';
import AdminRouteGuard from './AdminRouteGuard';
import RoleRouteGuard from './RoleRouteGuard';
import DepartmentHeadRouteGuard from './DepartmentHeadRouteGuard';

const TrangQuanLyBacSi = lazy(() => import('@/modules/bac-si').then(module => ({ default: module.TrangQuanLyBacSi })));

const TrangTongQuanBacSi = lazy(() => import('@/modules/bac-si/pages/bac-si/TrangTongQuanBacSi'));

const TrangQuanLyBenhNhan = lazy(() => import('@/modules/benh-nhan').then(module => ({ default: module.TrangQuanLyBenhNhan })));
const TrangHoSoBenhNhanTruongKhoa = lazy(() => import('@/modules/benh-nhan/pages/bac-si/TrangHoSoBenhNhanTruongKhoa'));

const TrangBenhNhanThuNgan = lazy(() => import('@/modules/benh-nhan/pages/thu-ngan/TrangBenhNhanThuNgan'));

const TrangBaoCaoCaTruc = lazy(() => import('@/modules/ca-truc/pages/thu-ngan/TrangBaoCaoCaTruc'));
const TrangNhanBanGiaoCa = lazy(() => import('@/modules/ca-truc/pages/thu-ngan/TrangNhanBanGiaoCa'));
const TrangQuanLyBanGiaoCa = lazy(() => import('@/modules/ca-truc/pages/admin/TrangQuanLyBanGiaoCa'));

const TrangLichLamViec = lazy(() => import('@/modules/ca-lam-viec/pages/bac-si/TrangLichLamViec'));

const TrangDuyetLichLamViec = lazy(() => import('@/modules/ca-lam-viec/pages/bac-si/TrangDuyetLichLamViec'));
const TrangDuyetLichLamViecThuNgan = lazy(() => import('@/modules/ca-lam-viec/pages/thu-ngan/TrangDuyetLichLamViecThuNgan'));
const TrangLichLamViecThuNgan = lazy(() => import('@/modules/ca-lam-viec/pages/thu-ngan/TrangLichLamViecThuNgan'));

const TrangQuanLyChuyenKhoa = lazy(() => import('@/modules/chuyen-khoa').then(module => ({ default: module.TrangQuanLyChuyenKhoa })));

const TrangHangDoiKham = lazy(() => import('@/modules/hang-cho/pages/bac-si/TrangHangDoiKham'));

const TrangBangCho = lazy(() => import('@/modules/hang-cho/pages/TrangBangCho'));

const TrangKhamBenh = lazy(() => import('@/modules/kham-benh/pages/bac-si/TrangKhamBenh'));

const TrangLichSuKham = lazy(() => import('@/modules/kham-benh/pages/bac-si/TrangLichSuKham'));

const TrangQuanLyLichHen = lazy(() => import('@/modules/lich-hen').then(module => ({ default: module.TrangQuanLyLichHen })));
const TrangDatLich = lazy(() => import('@/modules/lich-hen').then(module => ({ default: module.TrangDatLich })));

const TrangLichKham = lazy(() => import('@/modules/lich-hen/pages/bac-si/TrangLichKham'));

const TrangLichHenThuNgan = lazy(() => import('@/modules/lich-hen/pages/thu-ngan/TrangLichHenThuNgan'));

const TrangNhatKyHeThong = lazy(() => import('@/modules/nhat-ky-he-thong').then(module => ({ default: module.TrangNhatKyHeThong })));

const TrangQuanLyNguoiDung = lazy(() => import('@/modules/nguoi-dung/pages/admin/TrangQuanLyNguoiDung'));

const TrangThongTinCaNhan = lazy(() => import('@/modules/nguoi-dung/pages/TrangThongTinCaNhan'));

const TrangQuanLyThanhToan = lazy(() => import('@/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan'));

const TrangTongQuanDuocSi = lazy(() => import('@/modules/cap-thuoc/pages/duoc-si/TrangTongQuanDuocSi'));

const TrangDonThuocChoCap = lazy(() => import('@/modules/cap-thuoc/pages/duoc-si/TrangDonThuocChoCap'));

const TrangXuLyDonThuoc = lazy(() => import('@/modules/cap-thuoc/pages/duoc-si/TrangXuLyDonThuoc'));
const TrangDonThuocDangXuLy = lazy(() => import('@/modules/cap-thuoc/pages/duoc-si/TrangDonThuocDangXuLy'));

const TrangLichSuCapThuoc = lazy(() => import('@/modules/cap-thuoc/pages/duoc-si/TrangLichSuCapThuoc'));
const TrangLichLamViecDuocSi = lazy(() => import('@/modules/ca-lam-viec/pages/duoc-si/TrangLichLamViecDuocSi'));
const TrangDuyetLichLamViecDuocSi = lazy(() => import('@/modules/ca-lam-viec/pages/duoc-si/TrangDuyetLichLamViecDuocSi'));

const TrangQuanLyKhoThuoc = lazy(() => import('@/modules/thuoc').then(module => ({ default: module.TrangQuanLyKhoThuoc })));

const TrangTiepDonBenhNhan = lazy(() => import('@/modules/tiep-don/pages/thu-ngan/TrangTiepDonBenhNhan'));

const TrangInPhieuTiepDon = lazy(() => import('@/modules/tiep-don/pages/thu-ngan/TrangInPhieuTiepDon'));

const TrangTongQuanThuNgan = lazy(() => import('@/modules/tiep-don/pages/thu-ngan/TrangTongQuanThuNgan'));

const TrangChu = lazy(() => import('@/modules/trang-chu/pages/TrangChu'));

const TrangVaiTroPhanQuyen = lazy(() => import('@/modules/vai-tro').then(module => ({ default: module.TrangVaiTroPhanQuyen })));

const TrangDangNhap = lazy(() => import('@/modules/xac-thuc/pages/TrangDangNhap'));

const TrangDangKy = lazy(() => import('@/modules/xac-thuc/pages/TrangDangKy'));

const TrangQuenMatKhau = lazy(() => import('@/modules/xac-thuc/pages/TrangQuenMatKhau'));
const TrangDatLaiMatKhau = lazy(() => import('@/modules/xac-thuc/pages/TrangDatLaiMatKhau'));
const TrangXacMinhEmail = lazy(() => import('@/modules/xac-thuc/pages/TrangXacMinhEmail'));

const TrangDichVu = lazy(() => import('@/modules/dich-vu/pages/TrangDichVu'));

const TrangQuanLyDichVu = lazy(() => import('@/modules/dich-vu/pages/admin/TrangQuanLyDichVu'));
const TrangBaoCaoThongKe = lazy(() => import('@/modules/bao-cao-thong-ke').then(module => ({ default: module.TrangBaoCaoThongKe })));
const TrangTongQuanAdmin = lazy(() => import('@/modules/bao-cao-thong-ke/pages/admin/TrangTongQuanAdmin'));
const TrangQuanLyDanhGiaBacSi = lazy(() => import('@/modules/danh-gia-bac-si/pages/admin/TrangQuanLyDanhGiaBacSi'));
const TrangQuanLyChatboxAI = lazy(() => import('@/modules/chat-ai/pages/admin/TrangQuanLyChatboxAI'));

const TrangChuyenKhoa = lazy(() => import('@/modules/chuyen-khoa/pages/TrangChuyenKhoa'));

const TrangDoiNguBacSi = lazy(() => import('@/modules/bac-si/pages/TrangDoiNguBacSi'));

const TrangLienHe = lazy(() => import('@/modules/trang-chu/pages/TrangLienHe'));
const TrangCaiDatHeThong = lazy(() => import('@/modules/cai-dat/pages/admin/TrangCaiDatHeThong'));


const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" role="status"></div></div>}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/bang-cho',
    element: <LazyLoad><TrangBangCho /></LazyLoad>,
  },
  // ==============================
  // Trang công khai có đầu trang và chân trang.
  // ==============================
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <LazyLoad><TrangChu /></LazyLoad>,
      },
      {
        path: '/dat-lich',
        element: <LazyLoad><TrangDatLich /></LazyLoad>,
      },
      {
        path: '/dich-vu',
        element: <LazyLoad><TrangDichVu /></LazyLoad>,
      },
      {
        path: '/chuyen-khoa',
        element: <LazyLoad><TrangChuyenKhoa /></LazyLoad>,
      },
      {
        path: '/doi-ngu-bac-si',
        element: <LazyLoad><TrangDoiNguBacSi /></LazyLoad>,
      },
      {
        path: '/lien-he',
        element: <LazyLoad><TrangLienHe /></LazyLoad>,
      },
      {
        path: '/thong-tin-ca-nhan',
        element: (
          <AuthenticatedRouteGuard><LazyLoad><TrangThongTinCaNhan /></LazyLoad></AuthenticatedRouteGuard>
        ),
      },
    ],
  },

  // ==============================
  // Trang xác thực không có đầu trang hoặc chân trang.
  // ==============================
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/dang-nhap',
        element: <LazyLoad><TrangDangNhap /></LazyLoad>,
      },
      {
        path: '/dang-ky',
        element: <LazyLoad><TrangDangKy /></LazyLoad>,
      },
      {
        path: '/quen-mat-khau',
        element: <LazyLoad><TrangQuenMatKhau /></LazyLoad>,
      },
      {
        path: '/dat-lai-mat-khau',
        element: <LazyLoad><TrangDatLaiMatKhau /></LazyLoad>,
      },
      {
        path: '/xac-minh-email',
        element: <LazyLoad><TrangXacMinhEmail /></LazyLoad>,
      },
    ],
  },

  // ==============================
  // Admin pages
  // ==============================
  {
    path: '/admin',
    element: (
      <AdminRouteGuard>
        <DashboardLayout
          navigationItems={ADMIN_MENU_ITEMS}
          roleLabel="Quản trị hệ thống"
          profilePath="/admin/thong-tin-ca-nhan"
        />
      </AdminRouteGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      { path: 'dashboard', element: <LazyLoad><TrangTongQuanAdmin /></LazyLoad> },
      { path: 'nguoi-dung', element: <LazyLoad><TrangQuanLyNguoiDung /></LazyLoad> },
      { path: 'thong-tin-ca-nhan', element: <LazyLoad><TrangThongTinCaNhan /></LazyLoad> },
      { path: 'benh-nhan', element: <LazyLoad><TrangQuanLyBenhNhan /></LazyLoad> },
      { path: 'vai-tro', element: <LazyLoad><TrangVaiTroPhanQuyen /></LazyLoad> },
      { path: 'bac-si', element: <LazyLoad><TrangQuanLyBacSi /></LazyLoad> },
      { path: 'chuyen-khoa', element: <LazyLoad><TrangQuanLyChuyenKhoa /></LazyLoad> },
      { path: 'thuoc', element: <LazyLoad><TrangQuanLyKhoThuoc /></LazyLoad> },
      { path: 'nhat-ky', element: <LazyLoad><TrangNhatKyHeThong /></LazyLoad> },
      { path: 'lich-hen', element: <LazyLoad><TrangQuanLyLichHen /></LazyLoad> },
      { path: 'dich-vu', element: <LazyLoad><TrangQuanLyDichVu /></LazyLoad> },
      { path: 'bao-cao', element: <LazyLoad><TrangBaoCaoThongKe /></LazyLoad> },
      { path: 'danh-gia-bac-si', element: <LazyLoad><TrangQuanLyDanhGiaBacSi /></LazyLoad> },
      { path: 'chatbox-ai', element: <LazyLoad><TrangQuanLyChatboxAI /></LazyLoad> },
      { path: 'ban-giao-ca', element: <LazyLoad><TrangQuanLyBanGiaoCa /></LazyLoad> },
      { path: 'cai-dat', element: <LazyLoad><TrangCaiDatHeThong /></LazyLoad> },
    ],
  },

  // ==============================
  // Doctor pages
  // ==============================
  {
    path: '/bac-si',
    element: (
      <RoleRouteGuard allowedRoles={['DOCTOR']}>
        <DoctorDashboardLayout />
      </RoleRouteGuard>
    ),
    children: [
      { index: true, element: <LazyLoad><TrangTongQuanBacSi /></LazyLoad> },
      { path: 'lich-kham', element: <LazyLoad><TrangLichKham /></LazyLoad> },
      { path: 'hang-doi', element: <LazyLoad><TrangHangDoiKham /></LazyLoad> },
      { path: 'kham-benh', element: <LazyLoad><TrangKhamBenh /></LazyLoad> },
      { path: 'lich-su-kham', element: <LazyLoad><TrangLichSuKham /></LazyLoad> },
      { path: 'ho-so-benh-nhan', element: <DepartmentHeadRouteGuard><LazyLoad><TrangHoSoBenhNhanTruongKhoa /></LazyLoad></DepartmentHeadRouteGuard> },
      { path: 'lich-lam-viec', element: <LazyLoad><TrangLichLamViec /></LazyLoad> },
      {
        path: 'duyet-lich-lam-viec',
        element: (
          <DepartmentHeadRouteGuard><LazyLoad><TrangDuyetLichLamViec /></LazyLoad></DepartmentHeadRouteGuard>
        ),
      },
      { path: 'thong-tin-ca-nhan', element: <LazyLoad><TrangThongTinCaNhan /></LazyLoad> },
    ],
  },

  // ==============================
  // Pharmacist pages
  // ==============================
  {
    path: '/duoc-si',
    element: (
      <RoleRouteGuard allowedRoles={['PHARMACIST']}>
        <DashboardLayout
          navigationItems={PHARMACIST_MENU_ITEMS}
          roleLabel="Dược sĩ"
          profilePath="/duoc-si/thong-tin-ca-nhan"
        />
      </RoleRouteGuard>
    ),
    children: [
      {
        index: true,
        element: <LazyLoad><TrangTongQuanDuocSi /></LazyLoad>,
      },
      { path: 'don-cho-cap', element: <LazyLoad><TrangDonThuocChoCap /></LazyLoad> },
      { path: 'dang-xu-ly', element: <LazyLoad><TrangDonThuocDangXuLy /></LazyLoad> },
      {
        path: 'dang-xu-ly/:id',
        element: <LazyLoad><TrangXuLyDonThuoc /></LazyLoad>,
      },
      { path: 'thuoc', element: <LazyLoad><TrangQuanLyKhoThuoc /></LazyLoad> },
      { path: 'ton-kho', element: <Navigate to="/duoc-si/thuoc" replace /> },
      { path: 'lich-su-cap-thuoc', element: <LazyLoad><TrangLichSuCapThuoc /></LazyLoad> },
      { path: 'lich-lam-viec', element: <LazyLoad><TrangLichLamViecDuocSi /></LazyLoad> },
      { path: 'duyet-lich-lam-viec', element: <DepartmentHeadRouteGuard><LazyLoad><TrangDuyetLichLamViecDuocSi /></LazyLoad></DepartmentHeadRouteGuard> },
      { path: 'thong-tin-ca-nhan', element: <LazyLoad><TrangThongTinCaNhan /></LazyLoad> },
    ],
  },

  // ==============================
  // Receptionist / cashier pages
  // ==============================
  {
    path: '/thu-ngan',
    element: (
      <RoleRouteGuard allowedRoles={['RECEPTIONIST']}>
        <DashboardLayout
          navigationItems={CASHIER_MENU_ITEMS}
          roleLabel="Lễ tân / Thu ngân"
          profilePath="/thu-ngan/thong-tin-ca-nhan"
        />
      </RoleRouteGuard>
    ),
    children: [
      { index: true, element: <LazyLoad><TrangTongQuanThuNgan /></LazyLoad> },
      { path: 'tiep-don', element: <LazyLoad><TrangTiepDonBenhNhan /></LazyLoad> },
      {
        path: 'tiep-don/phieu/:queueNumber',
        element: <LazyLoad><TrangInPhieuTiepDon /></LazyLoad>,
      },
      // Giữ tương thích đường dẫn in phiếu cũ để không còn mở trang in trống.
      {
        path: 'tiep-don/preview/:queueNumber',
        element: <LazyLoad><TrangInPhieuTiepDon /></LazyLoad>,
      },
      { path: 'lich-hen', element: <LazyLoad><TrangLichHenThuNgan /></LazyLoad> },
      { path: 'benh-nhan', element: <LazyLoad><TrangBenhNhanThuNgan /></LazyLoad> },
      { path: 'thanh-toan', element: <LazyLoad><TrangQuanLyThanhToan /></LazyLoad> },
      { path: 'ca-truc', element: <LazyLoad><TrangBaoCaoCaTruc /></LazyLoad> },
      { path: 'nhan-ban-giao', element: <LazyLoad><TrangNhanBanGiaoCa /></LazyLoad> },
      { path: 'lich-lam-viec', element: <LazyLoad><TrangLichLamViecThuNgan /></LazyLoad> },
      {
        path: 'duyet-lich-lam-viec',
        element: (
          <DepartmentHeadRouteGuard>
            <LazyLoad><TrangDuyetLichLamViecThuNgan /></LazyLoad>
          </DepartmentHeadRouteGuard>
        ),
      },
      { path: 'thong-tin-ca-nhan', element: <LazyLoad><TrangThongTinCaNhan /></LazyLoad> },
    ],
  },

]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
