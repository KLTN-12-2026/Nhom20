# Kế Hoạch Cải Thiện UI Mobile & Tích Hợp PWA Push Notification

Tài liệu này vạch ra kế hoạch chi tiết để giải quyết 2 yêu cầu: cải thiện trải nghiệm giao diện trên thiết bị di động (Responsive UI) và xây dựng hệ thống thông báo đẩy (Web Push Notification) cho tính năng nhắc thuốc/lịch khám.

---

## 📱 Phần 1: Cải thiện Responsive UI trên Mobile

Giao diện hiện tại đang bị lỗi hiển thị trên điện thoại do `DashboardSidebar` có chiều rộng cố định (280px) và đẩy nội dung chính ra khỏi màn hình bằng `marginLeft`.

### 1. Cập nhật CSS toàn cục (`index.css`)
- Bổ sung Media Query (`@media (max-width: 768px)`) cho Layout.
- Cấu hình lại biến `--sc-sidebar-width` thành `0px` trên mobile hoặc sử dụng cơ chế Offcanvas (Drawer).
- Đảm bảo các bảng dữ liệu (`.table`) luôn được bọc trong thẻ `div.table-responsive` để có thể cuộn ngang trên màn hình hẹp.

### 2. Cập nhật Component Layout+
- **DashboardLayout.tsx**: 
  - Điều chỉnh `marginLeft` của nội dung chính để tự động thay đổi thành 0 khi ở chế độ mobile.
  - Bổ sung state `isSidebarOpen` để điều khiển trạng thái mở/đóng của sidebar trên mobile.
- **DashboardSidebar.tsx**:
  - Chuyển thành một Offcanvas (Drawer) trượt từ bên trái ra khi ở màn hình nhỏ. Bổ sung Overlay nền đen mờ để đóng khi nhấn ra ngoài.
- **DashboardHeader.tsx**:
  - Bổ sung nút Hamburger (Menu icon) ở góc trái (chỉ hiện trên mobile) để mở Sidebar.

### 3. Tối ưu Component Trang
- Chuyển đổi các dạng Grid `col-md-` trong các trang (như Khám Bệnh, Lịch Làm Việc) để các field không bị ép nhỏ lại mà sẽ stack thành một cột (100% width) trên điện thoại.

---

## 🔔 Phần 2: Tích hợp PWA Push Notification

Dựa theo tài liệu hướng dẫn (`Huong_dan_tich_hop_PWA_Push_Notification.md`), đây là kế hoạch chi tiết để tích hợp tính năng nhắc thuốc.

### 1. Thiết kế Cơ Sở Dữ Liệu (Prisma)
Bổ sung các bảng vào `schema.prisma` để quản lý việc nhắc nhở mà **không làm thay đổi cấu trúc bảng đơn thuốc gốc**:
- `DangKyThongBaoDay` (Push Subscription): Lưu thông tin Endpoint và Key (`p256dh`, `auth`) của các thiết bị trình duyệt đã cấp quyền Push API.
- `CauHinhNhacThuoc`: Quản lý việc bật/tắt nhắc nhở cho từng `ChiTietDonThuoc`, kèm theo ngày bắt đầu và kết thúc nhắc.
- `ThoiGianNhacThuoc`: Lưu các mốc giờ cụ thể mà bệnh nhân muốn nhận thông báo (ví dụ: `08:00`, `20:00`).
- `LichSuNhac`: Ghi lại nhật ký các thông báo đã gửi để chống gửi trùng lặp (Idempotency).

### 2. Triển khai Backend (NestJS)
- **Dependencies**: Cài đặt thư viện `web-push` và `@nestjs/schedule` (để chạy Cron Job).
- **Service & Controller**:
  - API đăng ký và hủy đăng ký Push Subscription (`/api/v1/push-subscriptions`).
  - API CRUD cấu hình nhắc thuốc của bệnh nhân (`/api/v1/medicine-reminders`).
- **Cron Job**: 
  - Tạo một Background Job chạy mỗi phút (`@Cron('* * * * *')`).
  - Lấy danh sách `ThoiGianNhacThuoc` khớp với giờ hiện tại.
  - Fetch cấu hình `DangKyThongBaoDay` tương ứng và gọi hàm `webpush.sendNotification()`.

### 3. Triển khai Frontend (React + PWA)
- **Service Worker**: Tạo file `sw.js` (hoặc cấu hình Vite PWA plugin) có chứa listener `self.addEventListener('push', ...)` để hiển thị notification kể cả khi tắt web.
- **Giao diện xin quyền Push**: Tạo nút/modal yêu cầu bệnh nhân cho phép thông báo (Notification Permission).
- **Giao diện "Đơn thuốc của tôi" (Bệnh nhân)**:
  - Hiển thị nút "Bật nhắc thuốc" ở từng loại thuốc.
  - Hiển thị Modal cấu hình giờ nhắc (Bắt đầu, Kết thúc, thêm các mốc giờ).

---

> [!IMPORTANT] 
> **Tiếp theo**
> Nếu bạn đồng ý với kế hoạch trên:
> 1. Tôi sẽ tiến hành sửa lỗi Responsive Layout trước tiên.
> 2. Sau đó, tôi sẽ định nghĩa cấu trúc Prisma Schema mới cho Push Notification và gửi lại cho bạn kiểm tra trước khi push DB.
