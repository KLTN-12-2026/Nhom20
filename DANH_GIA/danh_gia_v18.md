# Đánh giá v18 — In ấn, Dashboard Admin và chuẩn hóa ngày

## Đã hoàn thành

- `/admin` chuyển hướng đến `/admin/dashboard`; sau khi đăng nhập, Quản trị viên cũng vào Dashboard này.
- Dashboard Admin dùng API báo cáo thật `GET /admin-reports/overview`, hiển thị nhanh lịch hẹn, lượt khám hoàn tất, doanh thu, đánh giá, trạng thái lịch hẹn, lượt khám theo chuyên khoa và phương thức thanh toán.
- Tạo helper dùng chung `dinhDangNgay` và `dinhDangNgayGio` để hiển thị thống nhất `dd/MM/yyyy` và `dd/MM/yyyy HH:mm`.
- Giá trị kỹ thuật của `input type="date"` vẫn là `yyyy-MM-dd` qua `giaTriInputNgay`, không đổi dữ liệu API/Database.
- Bổ sung mẫu in riêng; cửa sổ in chỉ chứa nội dung chứng từ, không có sidebar/header/nút thao tác của web.

## In ấn theo nghiệp vụ

| Role | Màn hình | Chứng từ in | Trạng thái |
|---|---|---|---|
| Lễ tân / Thu ngân | Quản lý lịch hẹn, tiếp đón | Phiếu tiếp đón / phiếu hàng chờ | Đã có, dùng trang in riêng hiện có |
| Lễ tân / Thu ngân | Quản lý thanh toán | Hóa đơn gồm bệnh nhân, các khoản thu, tổng tiền và lịch sử thanh toán | Đã chuẩn hóa sang cửa sổ in riêng |
| Bác sĩ | Lịch sử khám | Phiếu khám và đơn thuốc đã hoàn tất | Đã bổ sung |
| Dược sĩ | Đơn đang xử lý | Phiếu cấp thuốc / hướng dẫn dùng thuốc | Đã bổ sung |
| Admin | Báo cáo và thống kê | Báo cáo vận hành theo khoảng ngày lọc | Đã có |
| Bệnh nhân | Lịch sử khám cá nhân | Đơn thuốc của lượt khám | Đã bổ sung |

Không thêm nút in vào quản lý nhân sự, chuyên khoa, kho thuốc, vai trò, lịch làm và các màn cấu hình vì chúng không phải chứng từ giao cho người bệnh/nhân viên hoặc báo cáo nghiệp vụ chính thức.

## API và dữ liệu sử dụng

- Không thêm API, không đổi Prisma và không đổi Neon.
- Dashboard tái sử dụng `GET /admin-reports/overview`.
- Phiếu khám dùng `GET /examinations/history/me`.
- Hóa đơn dùng dữ liệu API hóa đơn hiện có, gồm `chiTiet` (snapshot nội dung thu) và `thanhToan`.
- Phiếu tiếp đón, đơn thuốc, cấp thuốc tiếp tục dùng các API nghiệp vụ hiện có.

## Chuẩn hóa ngày

Đã thay các chỗ hiển thị ngày/datetime trọng yếu ở lịch hẹn, tiếp đón, bệnh nhân, khám bệnh, kho thuốc, cấp thuốc, thanh toán, lịch làm, bàn giao, thông báo, chat, đánh giá, nhật ký, báo cáo và bản in sang helper chung.

Quét source không còn mẫu hiển thị `dd/MM/yy`. Các chỗ còn `toLocaleTimeString` chỉ hiển thị **giờ** (không phải ngày), nên giữ nguyên.

## File tạo mới

- `FE/src/utils/dinh-dang-ngay.ts`
- `FE/src/utils/in-an.ts`
- `FE/src/modules/bao-cao-thong-ke/pages/admin/TrangTongQuanAdmin.tsx`

## File chỉnh sửa chính

- `FE/src/routes/AppRouter.tsx`
- `FE/src/config/menu.config.ts`
- `FE/src/modules/xac-thuc/pages/TrangDangNhap.tsx`
- `FE/src/modules/bao-cao-thong-ke/pages/admin/TrangBaoCaoThongKe.tsx`
- `FE/src/modules/bao-cao-thong-ke/admin-reports.css`
- `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx`
- `FE/src/modules/tiep-don/pages/thu-ngan/TrangInPhieuTiepDon.tsx`
- `FE/src/modules/tiep-don/pages/thu-ngan/TrangTiepDonBenhNhan.tsx`
- `FE/src/modules/lich-hen/pages/admin/TrangQuanLyLichHen.tsx`
- `FE/src/modules/lich-hen/pages/thu-ngan/TrangLichHenThuNgan.tsx`
- `FE/src/modules/kham-benh/pages/bac-si/TrangLichSuKham.tsx`
- `FE/src/modules/cap-thuoc/pages/duoc-si/TrangXuLyDonThuoc.tsx`
- `FE/src/modules/benh-nhan/components/PatientMedicalHistorySection.tsx`
- Các trang lịch làm, bệnh nhân, kho thuốc, nhật ký, bàn giao, chat và đánh giá có format ngày hiển thị.

## Kiểm tra

- `FE: npm run build` — **PASS**.
- `FE: npm run lint` — **PASS có 4 cảnh báo hook cũ**, không phát sinh từ đợt này: Chatbox AI, `use-chatbox`, `use-users`, Quản lý đánh giá bác sĩ.
- Backend/Database không sửa trong đợt này nên không cần build BE, migration hay smoke test API mới.

## Cần kiểm tra thủ công

1. Đăng nhập Admin: vào `/admin/dashboard`; mở `/admin` để kiểm tra redirect.
2. Mở từng chứng từ ở bảng trên, bấm In và xác nhận cửa sổ in không có sidebar/nút web.
3. Chọn ngày ở các form để chắc `input type="date"` vẫn mở lịch, nhưng các bảng/phiếu hiển thị `dd/MM/yyyy`.
