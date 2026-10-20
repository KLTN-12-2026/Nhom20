# 🔍 ĐÁNH GIÁ V20 — Nâng cấp Toàn diện UI Khám Bệnh (Hallmark) & Bảo mật

> **Ngày phân tích**: 19/08/2026
> **Mục tiêu**: Cung cấp tài liệu "Đặc tả kỹ thuật chi tiết" (Detailed Specification) để đội ngũ Dev hoặc AI (Codex/Cursor) có thể dựa vào đây code 100% chính xác mà không làm vỡ các tính năng Backend hiện tại.

---

## 1. Bức tranh Tổng thể: Bác sĩ khám như thế nào?

**Lỗi nhận thức cũ**: Đừng nhầm tưởng giao diện khám bệnh chỉ có mỗi vài thanh trượt hay nút bấm sinh hiệu. 
**Thực tế lâm sàng**: Khối "Khám Chuyên Khoa" chỉ là **MỘT PHẦN** nằm giữa luồng khám bệnh. Tổng thể luồng khám của bác sĩ (File `TrangKhamBenh.tsx`) phải luôn giữ cấu trúc chuẩn:
1. **Phần Chung 1**: Lý do khám, Bệnh sử, Sinh hiệu cơ bản (Mạch, Nhiệt độ, Huyết áp).
2. **PHẦN CHUYÊN KHOA (Dynamic)**: Form sẽ tự động render 1 trong 8 UI chuyên khoa (Mắt, Sản, Da Liễu...) tùy thuộc vào bệnh nhân đang khám ở phòng nào. *(Đây là nơi áp dụng thiết kế Hallmark)*.
3. **Phần Chung 2**: Chẩn đoán bệnh (ICD-10).
4. **Kê đơn thuốc**: Dropdown tìm kiếm thuốc thông minh (Command Palette).
5. **Kết luận**: Hướng điều trị, dặn dò.

---

## 2. Tiêu chuẩn Thiết kế Hallmark & Minimalist (CSS Đặc tả)

*Coder cần bổ sung các class sau vào file `doctor-workspace.css` để sử dụng:*

- **Không gian (Macrostructure)**: Loại bỏ form viền thô cứng. Sử dụng `.minimal-card` (Nền trắng `#ffffff`, bo góc `24px`, shadow cực nhẹ `0 4px 6px -1px rgba(0,0,0,0.02)`, viền `1px solid #f3f4f6`).
- **Màu sắc (Accent Colors)**: Mỗi khoa có một biến `--accent-color` riêng (Mắt: `#0ea5e9`, Tim Mạch: `#ef4444`, Da Liễu: `#f59e0b`).
- **Bố cục (Layout)**: Dùng `.minimal-split` (`grid-template-columns: 1fr 1fr`) để chia 2 cột cho các chỉ số đối xứng (Ví dụ: Mắt Trái / Mắt Phải).
- **Thành phần Xúc giác (Micro-interactions)**:
  - `.minimal-stepper`: Nút tăng/giảm (+/-) thay cho input number thuần.
  - `.minimal-slider`: Thanh trượt chọn mức độ đau/ngứa (0-10) thay cho gõ số.
  - `.segment-group` & `.segment-item`: Cụm nút bấm chọn nhanh (Chip) thay cho Radio button cổ điển. Trạng thái `.active` nổi bật với màu chữ `#111827` và shadow nhẹ.
- **Dropdown Thuốc (Command Palette)**:
  - Khung dropdown nổi `.command-palette-dropdown`.
  - Hiển thị thông tin thuốc gồm 2 dòng: `.cp-medicine-name` (Tên thương mại đậm) và `.cp-medicine-active-ingredient` (Hoạt chất mờ hơn).
  - Tích hợp Badge tồn kho: `.cp-badge.in-stock` (Xanh lá) và `.cp-badge.out-of-stock` (Đỏ nhạt, disable click).

---

## 3. Chỉ dẫn Code Frontend Chi tiết (Zero Regression)

### 3.1. Sửa Base Component (`KhamChuyenKhoaTruong.tsx`)
- **Action**: Chuyển từ render mảng `fields` sang dạng **Wrapper Component**.
- **Code mẫu**:
  ```tsx
  export function KhamChuyenKhoaTruong({ title, icon, accentColor, children }: Props) {
    return (
      <section className="minimal-card" style={{ '--accent-color': accentColor }}>
        <div className="minimal-header">
           <span className="material-symbols-outlined icon">{icon}</span>
           <h2>{title}</h2>
        </div>
        <div className="minimal-body">{children}</div>
      </section>
    );
  }
  ```

### 3.2. Cập nhật 8 File Chuyên Khoa
*Thay vì map `fields`, mỗi file sẽ tự render UI bằng các component tĩnh, sử dụng hàm `handleChange('key', value)` để đẩy data về cha. Cấu trúc JSON gửi về BE vẫn giữ nguyên 100%.*

1. **`KhamMat.tsx` (Mắt)**:
   - Dùng `.minimal-split` cho `thiLucMatTrai` và `thiLucMatPhai`. Sử dụng input text bình thường nhưng CSS font `monospace`.
   - Dùng `.segment-group` cho `testSacGiac` (Bình thường | Rối loạn | Chưa rõ).
2. **`KhamSanPhuKhoa.tsx` (Sản Phụ Khoa)**:
   - Dùng `type="date"` cho `ngayDauKyKinhCuoi`.
   - Dùng `.minimal-stepper` cho `tuanThai`, `soLanMangThai`, `soLanSinhCon`.
3. **`KhamTimMach.tsx` (Tim Mạch)**:
   - Dùng `.minimal-stepper` cho `spO2`.
   - Dùng `.segment-group` nhiều lựa chọn cho `dacDiemDauNguc` (Đau thắt | Đau nhói | Đè nặng).
4. **`KhamDaLieu.tsx` (Da Liễu) & `KhamCoXuongKhop.tsx` (Cơ Xương Khớp)**:
   - Áp dụng `.minimal-slider` (input `type="range"` từ 0-10) cho `mucDoNgua` và `mucDoDau`.
   - Dùng Textarea cho phần mô tả đặc điểm tổn thương.
5. **`KhamNhiKhoa.tsx`, `KhamTaiMuiHong.tsx`, `KhamNoiTongQuat.tsx`**:
   - Áp dụng Layout `.minimal-split` cho các chỉ số cơ bản (Cân nặng, Chiều cao).
   - Dùng thẻ Chip (`.segment-group`) để phân loại nhanh Tình trạng dinh dưỡng / Mức độ nghe.

### 3.3. Nâng cấp Dropdown Kê Đơn (`TrangKhamBenh.tsx`)
- **Hiện tại**: Chỉ map ra thẻ `<option>` hoặc list li đơn giản.
- **Nâng cấp**: Khi bác sĩ gõ tên thuốc vào ô tìm kiếm, hiển thị khối `.command-palette-dropdown`.
- **Dữ liệu**: Render `thuoc.tenThuoc` to rõ. Render `thuoc.hoatChat` nhỏ ở dưới.
- **Tồn kho**: Nếu số lượng tồn kho > 0 -> Render badge `Còn hàng`. Nếu = 0 -> Render badge `Hết hàng` và gán class `is-disabled` (pointer-events: none) để bác sĩ không thể kê thuốc đã hết.

---

<!-- ## 4. Hướng dẫn Bảo mật Hệ thống Web (Anti-Hacker & Anti-Spam)

Để hệ thống y tế hoạt động an toàn thực tế, Coder bắt buộc phải áp dụng 5 nguyên tắc sau:

1. **Lỗ hổng IDOR**: Khi truy vấn DB (đơn thuốc, bệnh án), luôn kiểm tra quyền sở hữu bằng cách ghép thêm điều kiện `nguoiDungId: user.id` lấy từ JWT. Không bao giờ query chỉ bằng ID truyền từ URL.
2. **Mass Assignment**: Tại NestJS Backend, bắt buộc dùng `ValidationPipe({ whitelist: true })` kết hợp DTO để tự động gạt bỏ các trường dữ liệu hacker cố tình nhét thêm (ví dụ `{role: "ADMIN"}`).
3. **Spam & Brute-force**: Sử dụng thư viện `@nestjs/throttler` để chặn IP gọi API liên tục (Rate limiting). Đặc biệt áp dụng cho luồng Đăng nhập và Đặt lịch khám public.
4. **XSS (Cross-Site Scripting)**: Tuyệt đối không sử dụng `dangerouslySetInnerHTML` trong các component React hiển thị nội dung do bệnh nhân nhập (như Lý do khám).
5. **CORS**: File `main.ts` của NestJS phải cấu hình `app.enableCors` giới hạn đúng các Domain hợp lệ của phòng khám (`https://smartclinic.vn`), chặn mọi domain lạ gọi lén API. -->
