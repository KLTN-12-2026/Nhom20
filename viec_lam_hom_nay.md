# KẾ HOẠCH VÀ PHÂN TÍCH CHI TIẾT HỆ THỐNG KHÁM BỆNH SMART CLINIC

> **Ngày lập kế hoạch:** 08/09/2026  
> **Trạng thái:** ĐÃ TRIỂN KHAI HOÀN TẤT — SẴN SÀNG KIỂM THỬ  
> **Phạm vi:** Bác sĩ → Hàng đợi → Vào phòng khám → Form khám bệnh (8 chuyên khoa) → Kê đơn thuốc → Xử lý F5/Mất mạng → Lịch sử khám.

---

## 1. TỔNG HỢP NGUYÊN NHÂN VÀ HIỆN TRẠNG LỖI

### 1.1. Hiện trạng Form khám & Đơn thuốc
- **Trường bắt buộc vs Không bắt buộc:**
  - Hệ thống hiện tại có 3 trường bắt buộc cốt lõi:
    1. `symptoms` (Triệu chứng lâm sàng)
    2. `diagnosis` (Chẩn đoán)
    3. `conclusion` (Kết luận và dặn dò)
  - Tất cả các trường còn lại:
    - Sinh hiệu (`bloodPressure`, `heartRate`, `temperature`)
    - Cả 8 chuyên khoa (`specialtyData`: 4-8 trường mỗi khoa)
    - Mã ICD-10 (`icd10Code`), Ghi chú nội bộ (`doctorNotes`), Ngày tái khám (`followUpDate`)
    - Đơn thuốc (`prescription`) khi bệnh nhân không cần dùng thuốc
    **đều là trường KHÔNG BẮT BUỘC (Optional).**
- **Vấn đề Toast ở form khám:**
  - Khi hoàn tất khám **không kê đơn thuốc**, toast hiển thị sai ngữ nghĩa: *"Đã hoàn tất khám bệnh và chuyển đơn sang Dược sĩ"* (dù không có đơn thuốc nào chuyển sang Dược sĩ). Cần chuẩn hóa thành: *"Đã hoàn tất khám bệnh thành công"*.
  - Cả 8 component khám chuyên khoa (`KhamNoiTongQuat`, `KhamNhiKhoa`, `KhamDaLieu`, `KhamTimMach`, `KhamTaiMuiHong`, `KhamSanPhuKhoa`, `KhamMat`, `KhamCoXuongKhop`) thiếu validation giới hạn số ở client (`min`, `max` cho mức độ đau 0-10, SpO2 0-100, tuần thai 0-50...). Khi bác sĩ nhập ngoài khoảng, Backend trả lỗi DTO validation nhưng FE chỉ toast chung chung *"Có lỗi xảy ra khi hoàn tất hồ sơ"* thay vì thông báo rõ trường nhập sai.

### 1.2. Hiện trạng Mất mạng / F5 làm mất bệnh nhân & phiên khám
- **Nguyên nhân 1 (Backend - Hàng đợi bỏ quên bệnh nhân đang khám):**
  - Khi bác sĩ bấm *"Vào phòng khám"*, vé hàng chờ và lượt khám chuyển sang `DA_VAO_PHONG`.
  - Nhưng API `GET /queues/doctor/me` (`findDoctorQueue`) chỉ lấy `[CHO_GOI, DANG_GOI, BO_QUA]`, loại bỏ hoàn toàn `DA_VAO_PHONG`.
  - Do đó, nếu bác sĩ quay lại trang hàng đợi hoặc mở tab mới, bệnh nhân đang ở trong phòng biến mất khỏi danh sách hàng đợi!
- **Nguyên nhân 2 (Frontend - Thiếu API khôi phục phiên khám đang active):**
  - Trang `/bac-si/kham-benh` phụ thuộc cứng vào query param `?luotKhamId=...`.
  - Nếu F5 làm mất query param, hoặc bác sĩ click menu bên trái *"Khám bệnh"*, trang không biết đang khám cho ai, không thể tải bệnh nhân.
  - Backend hiện thiếu API `GET /examinations/doctor/me/active` để lấy phiên khám dở dang của bác sĩ.
- **Nguyên nhân 3 (Frontend - Thiếu bộ nhớ đệm cục bộ Local Cache):**
  - Auto-save gửi lên Backend sau 4 giây dừng gõ. Nếu mạng chập chờn, mất kết nối hoặc bác sĩ F5 ngay khi đang gõ, toàn bộ dữ liệu chỉ nằm trong RAM của component React và bị mất sạch.

---

## 2. DANH SÁCH TẤT CẢ PHÒNG KHÁM / CHUYÊN KHOA TRONG HỆ THỐNG

Smart Clinic hiện có **8 phòng khám chuyên khoa** chính thức trong CSDL:

| STT | Mã khoa (DB) | Mã hiển thị | Tên chuyên khoa | File Component FE | File DTO BE |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `101` | `NOI_TONG_QUAT` | Nội tổng quát | `KhamNoiTongQuat.tsx` | `du-lieu-kham-noi-tong-quat.dto.ts` |
| 2 | `102` | `NHI_KHOA` | Nhi khoa | `KhamNhiKhoa.tsx` | `du-lieu-kham-nhi-khoa.dto.ts` |
| 3 | `103` | `DA_LIEU` | Da liễu | `KhamDaLieu.tsx` | `du-lieu-kham-da-lieu.dto.ts` |
| 4 | `104` | `TIM_MACH` | Tim mạch | `KhamTimMach.tsx` | `du-lieu-kham-tim-mach.dto.ts` |
| 5 | `105` | `TAI_MUI_HONG` | Tai Mũi Họng | `KhamTaiMuiHong.tsx` | `du-lieu-kham-tai-mui-hong.dto.ts` |
| 6 | `106` | `SAN_PHU_KHOA` | Sản Phụ khoa | `KhamSanPhuKhoa.tsx` | `du-lieu-kham-san-phu-khoa.dto.ts` |
| 7 | `107` | `MAT` | Mắt | `KhamMat.tsx` | `du-lieu-kham-mat.dto.ts` |
| 8 | `108` | `CO_XUONG_KHOP` | Cơ Xương Khớp | `KhamCoXuongKhop.tsx` | `du-lieu-kham-co-xuong-khop.dto.ts` |

Tất cả 8 chuyên khoa đều sử dụng chung khung trường `KhamChuyenKhoaTruong.tsx` và được điều phối qua `KhamChuyenKhoa.tsx`. Toàn bộ các trường trong 8 chuyên khoa này là **KHÔNG BẮT BUỘC (Optional)**. Bác sĩ để trống vẫn được hoàn tất khám bình thường.

---

## 3. BẢNG PHÂN LOẠI INPUT VÀ CHUẨN HÓA TOAST CẢNH BÁO

### 3.1. Phân loại Input Form Khám
1. **Bắt buộc (Required):** - Đánh dấu * màu đỏ vào để nhận biết
   - `Triệu chứng lâm sàng` (`symptoms`): Không được để trống.
   - `Chẩn đoán` (`diagnosis`): Không được để trống.
   - `Kết luận và dặn dò` (`conclusion`): Không được để trống.
   - *Khi có kê đơn thuốc:* Thuốc đã chọn bắt buộc phải có `Liều dùng` (`dosage`) và `Cách dùng` (`instructions`), số lượng > 0.
2. **Không bắt buộc (Optional):** 
   - Huyết áp, Nhịp tim, Nhiệt độ.
   - Tất cả các trường chuyên khoa của 8 phòng khám.
   - Mã ICD-10, Ghi chú nội bộ, Ngày hẹn tái khám.
   - Kê đơn thuốc: Không bắt buộc phải có thuốc (được hoàn tất khi không kê thuốc).

### 3.2. Chuẩn hóa cơ chế Toast Thông báo

| Tình huống | Loại Toast | Nội dung thông báo chuẩn | Ghi chú |
| :--- | :--- | :--- | :--- |
| Thiếu triệu chứng | `warning` | *Vui lòng nhập triệu chứng lâm sàng trước khi hoàn tất* | Focus & scroll về ô triệu chứng |
| Thiếu chẩn đoán | `warning` | *Vui lòng nhập chẩn đoán trước khi hoàn tất* | Focus & scroll về ô chẩn đoán |
| Thiếu kết luận | `warning` | *Vui lòng nhập kết luận và dặn dò trước khi hoàn tất* | Focus & scroll về ô kết luận |
| Thiếu cả 3 trường | `warning` | *Vui lòng nhập triệu chứng, chẩn đoán và kết luận trước khi hoàn tất* | Liệt kê chính xác các trường thiếu |
| Thuốc thiếu liều/cách dùng | `warning` | *Vui lòng nhập đủ liều dùng và cách dùng cho các thuốc đã chọn* | Báo lỗi dòng thuốc |
| Có cảnh báo dị ứng chưa duyệt | `warning` | *Vui lòng xác nhận hoặc bỏ qua tất cả cảnh báo nghiêm trọng trước khi hoàn tất* | Chặn hoàn tất khi còn cảnh báo đỏ |
| Dữ liệu chuyên khoa vượt ngưỡng | `warning` | *Dữ liệu khám chuyên khoa không hợp lệ: [Tên trường sai]* | Hiển thị rõ lỗi client/server |
| Lưu nháp thành công | `success` | *Đã lưu nháp hồ sơ khám* | Khi bấm lưu nháp thủ công |
| Hoàn tất khám (CÓ thuốc) | `success` | *Đã hoàn tất khám bệnh và chuyển đơn sang Dược sĩ* | Chuyển trạng thái & bắn socket Dược |
| Hoàn tất khám (KHÔNG thuốc) | `success` | *Đã hoàn tất khám bệnh thành công* | Không ghi sai chuyển Dược sĩ |
| Khôi phục phiên khám sau F5 | `info` | *Đã khôi phục dữ liệu phiên khám chưa lưu từ phiên trước* | Khôi phục từ localStorage |
| Bị mất kết nối mạng | `warning` | *Mất kết nối mạng. Dữ liệu đang được lưu tạm trên máy.* | Hiển thị banner/toast nhẹ |
| Đã kết nối lại mạng | `success` | *Đã kết nối lại và đồng bộ dữ liệu khám lên hệ thống* | Tự động đồng bộ draft |
| Lỗi API chung | `danger` | Lấy trực tiếp từ `getApiErrorMessage(error)` | Không hardcode lỗi |

---

## 4. CƠ CHẾ KHÔI PHỤC PHIÊN KHÁM KHI MẤT MẠNG / F5

```
[Bác sĩ gọi số]
       ↓
[Bấm "Vào phòng khám"]
       ↓
   Backend cập nhật:
   - ticket.trangThai = DA_VAO_PHONG
   - luotKham.trangThai = DA_VAO_PHONG
   - Khởi tạo ngay HoSoKham (BAN_NHAP) nếu chưa có
       ↓
[Bác sĩ gõ form khám] 
   ├── Auto-save debounced 3-4s → Gửi lên Backend (Database)
   └── Đồng thời ghi ngay vào `localStorage`: key `smart_clinic_draft_{luotKhamId}`
       ↓
[TÌNH HUỐNG: Mất mạng / F5 / Đóng tab]
       ↓
Bác sĩ quay lại hệ thống:
  • TRƯỜNG HỢP A: Mở lại trang `/bac-si/kham-benh` (kể cả không có URL param):
    - FE tự động gọi `GET /api/v1/examinations/doctor/me/active`
    - Backend trả về đúng bệnh nhân đang ở trạng thái `DA_VAO_PHONG`
    - FE nạp draft từ Server và đối chiếu `localStorage` (lấy bản mới nhất)
    - Toast: "Đã khôi phục dữ liệu phiên khám trước đó"
    - Tiếp tục khám bình thường, KHÔNG tạo lượt khám mới!

  • TRƯỜNG HỢP B: Bác sĩ quay lại trang `/bac-si/hang-doi`:
    - API `/queues/doctor/me` trả về thêm mục bệnh nhân `DA_VAO_PHONG`
    - Bệnh nhân đang khám hiển thị trên cùng với badge "Đang khám" và nút "Tiếp tục khám"
    - Bác sĩ bấm "Tiếp tục khám" → Điều hướng lại vào form khám của đúng bệnh nhân đó!
       ↓
[Hoàn tất khám thành công]
  - Xóa `localStorage` tương ứng
  - Cập nhật ticket & lượt khám thành `DA_HOAN_TAT`
  - Bắn Socket.IO cập nhật bảng chờ & Dược sĩ
```

---

## 5. DANH SÁCH FILE LIÊN QUAN VÀ DỰ KIẾN ĐIỀU CHỈNH

### Backend (BE):
1. `BE/src/modules/hang-cho/repositories/prisma-queue.repository.ts`:
   - Mở rộng `findDoctorQueue` cho phép trả về thêm vé có trạng thái `DA_VAO_PHONG` hoặc trả về kèm `activeTicket`.
2. `BE/src/modules/hang-cho/queues.service.ts`:
   - Đảm bảo khi `enterRoom`, nếu lượt khám chưa có `HoSoKham`, tự động khởi tạo 1 bản nháp `HoSoKham` ban đầu.
3. `BE/src/modules/kham-benh/examinations.controller.ts`:
   - Thêm endpoint `GET /examinations/doctor/me/active` cho bác sĩ lấy phiên khám đang hoạt động.
4. `BE/src/modules/kham-benh/examinations.service.ts`:
   - Triển khai hàm `findActiveVisit(userId)`.
   - Cập nhật message trả về khi hoàn tất khám: nếu không có đơn thuốc, trả về message *"Đã hoàn tất khám bệnh thành công"*.
5. `BE/src/modules/kham-benh/repositories/examination.repository.interface.ts` & `prisma-examination.repository.ts`:
   - Thêm query `findActiveVisitByDoctorId(doctorId: number)`.

### Frontend (FE):
1. `FE/src/modules/kham-benh/api/examination.api.ts`:
   - Bổ sung hàm `getActiveVisit()`.
2. `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`:
   - Bổ sung logic tự khôi phục phiên khám từ `getActiveVisit()` khi `luotKhamId` thiếu.
   - Thêm cơ chế Local Draft Caching (`localStorage`) lưu trữ tức thời mỗi khi thay đổi trường.
   - Thêm bộ lắng nghe mạng `online`/`offline` kèm banner trạng thái mạng.
   - Sửa toast thông báo hoàn tất: phân biệt có thuốc (*chuyển đơn sang Dược sĩ*) và không có thuốc (*hoàn tất khám bệnh thành công*).
   - Xóa `localStorage` sau khi hoàn tất khám.
3. `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamChuyenKhoaTruong.tsx`:
   - Thêm thuộc tính validation `min`, `max` cho các trường số của 8 chuyên khoa.
4. `FE/src/modules/hang-cho/pages/bac-si/TrangHangDoiKham.tsx`:
   - Thêm hàng/card ưu tiên hiển thị bệnh nhân đang ở trong phòng (`DA_VAO_PHONG`) kèm nút *"Tiếp tục khám"*.
5. `FE/src/modules/kham-benh/pages/bac-si/TrangLichSuKham.tsx`:
   - Chuẩn hóa việc gọi API qua `examination.api.ts` thay vì gọi trực tiếp `axiosClient`.

---

## 6. THỨ TỰ THỰC HIỆN ĐỀ XUẤT (TỪ ƯU TIÊN CAO ĐẾN THẤP)

- **Bước 1 (Ưu tiên 1 - Backend Active Visit & Queue Support):**
  Thêm endpoint `GET /examinations/doctor/me/active` và cập nhật `findDoctorQueue` hỗ trợ trạng thái `DA_VAO_PHONG`. Khởi tạo nháp `HoSoKham` khi `enterRoom`.
- **Bước 2 (Ưu tiên 2 - Frontend Session Recovery & Local Draft Cache):**
  Cập nhật `TrangKhamBenh.tsx` để tự khôi phục phiên khám qua API active + `localStorage`, chống mất dữ liệu khi mất mạng hoặc F5. Thêm nút "Tiếp tục khám" trên `TrangHangDoiKham.tsx`.
- **Bước 3 (Ưu tiên 3 - Chuẩn hóa Toast & Validation 8 Chuyên khoa):**
  Chuẩn hóa toast (phân biệt có/không có đơn thuốc, thông báo chính xác các trường bắt buộc thiếu, không toast sai trường optional), thêm min/max cho `KhamChuyenKhoaTruong.tsx`.
- **Bước 4 (Ưu tiên 4 - Kiểm tra hồi quy toàn diện):**
  Build kiểm tra lint & build ở cả FE và BE. Chạy kiểm thử thủ công theo checklist.

---

## 7. CHECKLIST TEST TỪNG PHÒNG KHÁM VÀ NGHIỆP VỤ

### Form khám & Đơn thuốc:
- [x] **Bắt buộc:** Bỏ trống triệu chứng → Bấm hoàn tất → Có toast warning: `Vui lòng nhập triệu chứng lâm sàng trước khi hoàn tất`, focus vào ô triệu chứng.
- [x] **Bắt buộc:** Bỏ trống chẩn đoán → Bấm hoàn tất → Có toast warning: `Vui lòng nhập chẩn đoán trước khi hoàn tất`, focus vào ô chẩn đoán.
- [x] **Bắt buộc:** Bỏ trống kết luận → Bấm hoàn tất → Có toast warning: `Vui lòng nhập kết luận và dặn dò trước khi hoàn tất`, focus vào ô kết luận.
- [x] **Không bắt buộc:** Bỏ trống huyết áp, nhịp tim, nhiệt độ, ICD-10, ngày tái khám, ghi chú → Nhập đủ 3 trường bắt buộc → Hoàn tất khám thành công, KHÔNG có toast lỗi nào về các trường này.
- [x] **Không kê thuốc:** Để trống danh sách thuốc → Bấm hoàn tất → Hiện modal xác nhận "Bạn chưa kê thuốc. Bạn có chắc muốn hoàn tất lượt khám này?" → Bấm "Hoàn tất khám" → Hoàn tất thành công với toast: *"Đã hoàn tất khám bệnh thành công"* (không nhắc đến Dược sĩ).
- [x] **Có kê thuốc:** Thêm thuốc, nhập đủ liều dùng, cách dùng, số lượng → Hoàn tất khám → Toast: *"Đã hoàn tất khám bệnh và chuyển đơn sang Dược sĩ"*, Dược sĩ nhận đơn realtime.
- [x] **Kê thuốc thiếu liều/cách dùng:** Chọn thuốc nhưng bỏ trống liều dùng → Bấm hoàn tất → Toast warning: *"Vui lòng nhập đủ liều dùng và cách dùng cho các thuốc đã chọn"*.

### Mất mạng & F5:
- [x] **F5 khi đang trong phòng khám:** Bác sĩ bấm "Vào phòng khám", đang nhập dở triệu chứng và chẩn đoán → Bấm F5 trình duyệt → Trang tải lại đúng bệnh nhân đó, toàn bộ triệu chứng và chẩn đoán đã gõ được khôi phục nguyên vẹn.
- [x] **Đóng tab / Mở hàng đợi:** Đang khám dở, bác sĩ bấm quay lại Hàng đợi khám `/bac-si/hang-doi` → Bệnh nhân vẫn hiển thị ở đầu bảng với trạng thái "Đang khám" và nút "Tiếp tục khám" → Bấm nút "Tiếp tục khám" đưa thẳng lại vào phiên khám.
- [x] **Mất mạng (Offline):** Ngắt mạng khi đang gõ → Trình duyệt hiện cảnh báo nhẹ đang offline → Gõ thêm dữ liệu → Bật lại mạng → Dữ liệu tự động đồng bộ lên server mà không bị mất chữ nào.

### 8 Chuyên khoa:
- [x] **Phòng 101 - Nội tổng quát:** Nhập triệu chứng, chẩn đoán, kết luận, để trống chuyên khoa → Hoàn tất thành công. Nhập `mucDoDau` > 10 → Client chặn bằng min/max, nếu cố gửi sẽ báo lỗi trường cụ thể.
- [x] **Phòng 102 - Nhi khoa:** Để trống cân nặng, chiều cao, tiêm chủng → Hoàn tất thành công.
- [x] **Phòng 103 - Da liễu:** Để trống vị trí, mức độ ngứa → Hoàn tất thành công.
- [x] **Phòng 104 - Tim mạch:** Để trống SpO2, điện tim → Hoàn tất thành công.
- [x] **Phòng 105 - Tai Mũi Họng:** Để trống kết quả nội soi, thính lực → Hoàn tất thành công.
- [x] **Phòng 106 - Sản Phụ khoa:** Để trống ngày kinh, tuần thai → Hoàn tất thành công.
- [x] **Phòng 107 - Mắt:** Để trống thị lực, nhãn áp → Hoàn tất thành công.
- [x] **Phòng 108 - Cơ Xương Khớp:** Để trống vị trí đau, X-quang → Hoàn tất thành công.
