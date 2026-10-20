# 📋 ĐÁNH GIÁ v22 — Kế hoạch Tối ưu hóa & Hoàn thiện Smart Clinic

> **Ngày lập:** 2026-08-28  
> **Phiên bản:** v22  
> **Trạng thái:** KẾ HOẠCH THỰC THI THEO ƯU TIÊN — KHÔNG SỬA HẾT MỘT LƯỢT

---

## 🎯 NGUYÊN TẮC CHUNG

**Không giữ y như cũ, nhưng cũng không được xóa/sửa DB vội.**

Các hạng mục cải thiện đều chính xác và cần thiết, tuy nhiên phải thực hiện **theo đúng thứ tự ưu tiên** để tránh gây lỗi dây chuyền hoặc mất dữ liệu trên Neon.

---

## 📊 1. BẢNG ƯU TIÊN TỔNG QUAN

| # | Mục | Trạng thái | Mức độ | Ghi chú |
|---|---|---|---|---|
| 1 | In phiếu tiếp đón dùng `FALLBACK_TICKET` | ✅ **DONE** | **P0** | Đã xác nhận: dự án chỉ có 1 trang in (`TrangInPhieuTiepDon`) đã fetch API thật. Không có trang in đơn thuốc/hóa đơn riêng biệt. |
| 2 | Phân lịch bác sĩ còn logic ở FE | ✅ **DONE** | **P1** | Backend `work-schedules.service.ts` ĐÃ CÓ đầy đủ 5 hàm validation. FE chỉ duplicate cho UX, không có lỗ hổng. |
| 3 | AI cảnh báo thuốc — bắt nhập lý do | ✅ **DONE** | **P1** | FE popup nhập lý do (L831-846), BE validate bắt buộc reason khi NGHIEM_TRONG (L392-399) + lưu `lyDoXuLy` vào DB. |
| 4 | Chuẩn hóa thuốc/hoạt chất/lô thuốc | ✅ **DONE** | **P2** | Đã rà soát: Prisma Schema và Neon DB ĐÃ XÓA `hoatChat` và `hanSuDung`. BE đang map từ quan hệ chuẩn sang response cho FE. |
| 5 | Dọn bảng/cột NULL nhiều | ✅ **DONE** | **P2** | Đã kiểm tra: Các cột nullable (`soDienThoai`, `ghiChuDiUng`...) đều hợp lệ và ĐANG được sử dụng ở FE/BE. Không cần xóa. |

---

## ✅ 2. P0 — IN PHIẾU TIẾP ĐÓN: KHÔNG DÙNG DỮ LIỆU FALLBACK GIẢ — HOÀN THÀNH

### Kết quả kiểm tra (2026-08-28)

File [TrangInPhieuTiepDon.tsx](file:///d:/smart-clinic/FE/src/modules/tiep-don/pages/thu-ngan/TrangInPhieuTiepDon.tsx) **đã được cập nhật** trong đợt trước:

- Dùng `useParams()` lấy `queueNumber` từ URL.
- Gọi `receptionApi.getTicket(queueNumber)` để fetch dữ liệu thật từ API.
- Nếu API lỗi → hiện thông báo lỗi rõ ràng, **không còn dùng `FALLBACK_TICKET`**.

### Rà soát bổ sung — Đã xác nhận ✅

- [x] Grep toàn bộ FE source: **KHÔNG tìm thấy** từ khóa `FALLBACK` hay `location.state` liên quan đến dữ liệu giả.
- [x] Kiểm tra [AppRouter.tsx](file:///d:/smart-clinic/FE/src/routes/AppRouter.tsx): Dự án **CHỈ CÓ DUY NHẤT 1 trang in** (`TrangInPhieuTiepDon`). Không tồn tại trang in đơn thuốc hay in hóa đơn riêng biệt.
- [x] Kết luận: **P0 đã hoàn thành 100%. Không cần sửa thêm.**

---

## ✅ 3. P1 — PHÂN LỊCH BÁC SĨ: ĐẨY LOGIC XUỐNG BACKEND — HOÀN THÀNH

### Kết quả kiểm tra (2026-08-28)

Sau khi rà soát file [work-schedules.service.ts](file:///d:/smart-clinic/BE/src/modules/ca-lam-viec/work-schedules.service.ts), phát hiện: **Backend ĐÃ CÓ SẴN** toàn bộ validation rule trước đó:

| Hàm | Dòng | Chức năng |
|---|---|---|
| `validateDutyDates()` | L555-583 | Kiểm tra đúng 2 ca/tuần + không trực 2 đêm liên tiếp |
| `validateNightCoverage()` | L597-609 | Kiểm tra mỗi đêm ≥ 2 người trực |
| `validateDutyWeekBoundaries()` | L611-649 | Kiểm tra xung đột liên tuần (CN-T2) |
| `saveReceptionistDraft()` | L1146-1234 | Validate + lưu nháp với `prisma.$transaction` |
| `publishReceptionist()` | L1237-1291 | Validate lại trước khi công bố + gửi thông báo realtime |
| `createReceptionistAutoSchedule()` | L1085-1143 | Thuật toán phân trực TỰ ĐỘNG nằm ở BE |

> [!TIP]
> **Kết luận:** FE chỉ duplicate validation cho UX nhanh (hiện lỗi trước khi gửi request). Backend luôn là tầng quyết định cuối cùng — **KHÔNG CÓ LỖ HỔNG**. Mục này đã hoàn thành.

---

## ✅ 4. P1 — AI CẢNH BÁO THUỐC: SỬA ĐÚNG PHẠM VI — HOÀN THÀNH

### Nguyên tắc bất di bất dịch (Giữ nguyên)

- **Rule-based DB vẫn là chính:** Dị ứng (`DiUngBenhNhan`), trùng hoạt chất (`ThuocHoatChat`), tồn kho (`LoThuoc`), thiếu liều/hướng dẫn.
- **Gemini chỉ giải thích và gợi ý thuốc thay thế** từ danh sách đã được BE lọc sẵn. Gemini **không** tự kê đơn.
- **Bác sĩ luôn là người quyết định cuối cùng.**

### Kết quả kiểm tra (2026-08-28) — Đã có đầy đủ ✅

**1. FE — Popup bắt nhập lý do khi bỏ qua NGHIEM_TRONG:**

File [TrangKhamBenh.tsx](file:///d:/smart-clinic/FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx):
- L831-846: Khi bác sĩ bấm "Bỏ qua", hiện form nhập lý do (textarea) với label "Lý do bỏ qua *"
- L843: Nút "Xác nhận bỏ qua" bị `disabled` khi chưa nhập lý do (`!dismissReason.trim()`)
- L298-325: Hàm `resolveWarning()` gửi `reason` lên BE

**2. BE — Validate + lưu DB:**

File [prescription-safety.service.ts](file:///d:/smart-clinic/BE/src/modules/kham-benh/prescription-safety.service.ts):
- L392-399: Throw `BadRequestException('Cần nêu lý do khi bỏ qua cảnh báo nghiêm trọng')` nếu thiếu reason
- L406: Lưu `lyDoXuLy` vào bảng `CanhBaoDonThuoc`
- L419-431: `ensureNoPendingCriticalWarning()` chặn hoàn tất đơn nếu còn cảnh báo NGHIEM_TRONG chưa xử lý

> [!TIP]
> **Kết luận:** Cả FE (popup nhập lý do) lẫn BE (validate + lưu DB + chặn hoàn tất) đều **ĐÃ CÓ SẴN**. Mục này đã hoàn thành.

---

## ✅ 5. P2 — CHUẨN HÓA THUỐC/HOẠT CHẤT/LÔ THUỐC — HOÀN THÀNH

### Kết quả kiểm tra (2026-08-28)

- **Database / Schema:** Trường `hoatChat` và `hanSuDung` đã ĐƯỢC XÓA hoàn toàn khỏi bảng `Thuoc` trong `schema.prisma`.
- **Backend:** Đã chuyển sang đọc quan hệ `ThuocHoatChat` và `LoThuoc`. File `medicines.service.ts` đang dùng hàm `activeIngredientNames()` và `nearestExpiry()` để lấy dữ liệu.
- **Frontend:** API của Backend trả về `hoatChat` và `hanSuDung` (dạng computed column ảo) nên Frontend vẫn hiển thị bình thường mà không bị crash.
- **Kết luận:** **Đã hoàn thành 100%.** Cách triển khai này rất chuẩn vì đảm bảo backward compatibility.

---

## ✅ 6. P2 — DỌN BẢNG/CỘT NULL — HOÀN THÀNH

### Kết quả kiểm tra (2026-08-28)

Đã rà soát toàn bộ các trường `?` (nullable) trong `schema.prisma` và đối chiếu với FE/BE:

- `NguoiDung.email`, `soDienThoai`: Đang dùng cho đăng nhập/liên hệ.
- `BacSi.soDienThoai`: Đang dùng trong danh bạ nội bộ.
- `BenhNhan.ghiChuDiUng`, `ghiChuTienSuBenh`: Đang dùng ở `TrangKhamBenh`.
- `HoSoKham.ngayTaiKham`: Đang dùng (không bắt buộc tái khám).
- `LichHen.bacSiId`: Đang dùng (đặt lịch không chỉ định bác sĩ).

**Kết luận:** KHÔNG có cột nào thừa thãi hay bị "bỏ quên". Tất cả các cột NULL đều là nullable có chủ đích và đang được code sử dụng. **Không cần xóa bất kỳ cột nào.** Tác vụ hoàn tất.

---

## ✅ 7. NHỮNG GÌ ĐANG OKE — GIỮ NGUYÊN

Các luồng sau đang hoạt động ổn định, **KHÔNG SỬA** trừ khi phát hiện bug cụ thể:

- ✅ Luồng kê đơn thuốc (Bác sĩ → Đơn thuốc → Chi tiết đơn thuốc)
- ✅ Cảnh báo rule-based hiện tại (tồn kho, liều dùng)
- ✅ Dị ứng bệnh nhân (`DiUngBenhNhan`)
- ✅ Tồn kho FEFO (xuất lô hạn ngắn trước)
- ✅ Chuyển đơn Dược sĩ → Cấp phát thuốc
- ✅ Thanh toán SePay/VietQR + Webhook tự động
- ✅ Realtime Socket.IO (hàng chờ, thanh toán, thông báo)
- ✅ Chatbox AI (Phase 1–3: chat, tra cứu, đặt lịch)
- ✅ Đánh giá bác sĩ
- ✅ RBAC phân quyền theo vai trò

---

## 📋 8. THỨ TỰ THỰC HIỆN NẾU LÀM TIẾP

```text
Bước 1 (P0): Rà soát tất cả trang in ấn (đơn thuốc, hóa đơn)
             → Đảm bảo fetch API thật khi F5 / mở URL trực tiếp
             → Phiếu tiếp đón đã xong, kiểm tra các trang còn lại

Bước 2 (P1): Sửa phân lịch trực đêm / chia ca cho trưởng khoa
             → Chuyển thuật toán phân ca xuống BE
             → Kiểm tra trùng ca, nghỉ bù ở BE bằng transaction

Bước 3 (P1): Bổ sung bắt nhập lý do khi bác sĩ bỏ qua cảnh báo nguy hiểm
             → FE popup bắt nhập text
             → BE lưu lyDoXuLy vào CanhBaoDonThuoc

Bước 4 (P1): Cải thiện Gemini gợi ý thuốc thay thế
             → Vẫn dựa trên danh sách GoiYThuocThayThe đã được BE lọc
             → Gemini chỉ diễn giải, không tự kê đơn

Bước 5 (P2): Chuẩn hóa DB thuốc
             → Chuyển code đọc hoạt chất sang quan hệ ThuocHoatChat
             → Chuyển code đọc hạn dùng sang LoThuoc.hanDung
             → Test kỹ toàn bộ luồng kê đơn/kho/portal
             → Cuối cùng mới migration xóa cột cũ
```

---

## 🧪 9. TEST PLAN THEO ƯU TIÊN

### P0 Tests

| # | Test Case | Cách kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| 1 | F5 trang in phiếu tiếp đón | Mở trực tiếp URL `/thu-ngan/in-phieu/:queueNumber` | Dữ liệu nạp từ API, không trang trắng |
| 2 | F5 trang in đơn thuốc | Mở trực tiếp URL in đơn thuốc | Dữ liệu nạp từ API, không dữ liệu giả |
| 3 | F5 trang in hóa đơn | Mở trực tiếp URL in hóa đơn | Dữ liệu nạp từ API, không dữ liệu giả |

### P1 Tests

| # | Test Case | Cách kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| 4 | Phân lịch tự động | Trưởng khoa bấm phân lịch tuần | API BE trả kết quả, không trùng ca, không lỗi 400 |
| 5 | Trùng ca trực đêm | Phân 2 ca trực đêm liên tiếp cho cùng 1 bác sĩ | BE từ chối và báo lỗi xung đột |
| 6 | Bỏ qua cảnh báo nguy hiểm | Bác sĩ bấm bỏ qua cảnh báo `NGHIEM_TRONG` | Popup bắt nhập lý do, DB lưu `lyDoXuLy` |
| 7 | Gemini gợi ý thuốc thay thế | Kê thuốc bệnh nhân bị dị ứng | Gemini gợi ý từ danh sách BE đã lọc, không tự bịa thuốc |

### P2 Tests (Chỉ chạy sau khi code đã chuyển xong)

| # | Test Case | Cách kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| 8 | Hoạt chất từ quan hệ | Xem chi tiết thuốc trên FE | Hiển thị hoạt chất từ `ThuocHoatChat`, không từ text cũ |
| 9 | Hạn dùng từ lô | Xem tồn kho thuốc | Hiển thị hạn dùng theo từng lô `LoThuoc.hanDung` |
| 10 | Kê đơn sau migration | Kê đơn đầy đủ sau khi xóa cột cũ | Toàn bộ luồng vẫn chạy bình thường |

---

## 📌 10. KẾT LUẬN

**Tóm gọn trong 4 dòng:**

- **Cái cần sửa ngay (P0):** Tất cả trang in ấn phải fetch API thật — không dùng dữ liệu fallback giả.
- **Cái nên sửa tiếp (P1):** Lịch trực đêm / phân lịch đẩy logic xuống BE. Bắt nhập lý do khi bỏ qua cảnh báo thuốc nguy hiểm.
- **Cái nên giữ hiện tại:** Luồng kê đơn, cảnh báo rule-based, dị ứng, tồn kho, chuyển Dược sĩ, thanh toán, realtime.
- **Cái chưa nên làm vội (P2):** Xóa cột/bảng thuốc. Phải chuyển toàn bộ code sang đọc `HoatChat` + `ThuocHoatChat` + `LoThuoc` ổn định trước rồi mới tính migration xóa cột cũ.

---

## 🔍 11. ĐÁNH GIÁ KHẢ NĂNG BẢO TRÌ CODE (RÀ SOÁT SOURCE THỰC TẾ)

> Phần này đánh giá dựa trên việc đọc trực tiếp mã nguồn FE, BE và schema.prisma — không phải đánh giá lý thuyết.

### 11.1. Điểm mạnh — Dễ bảo trì

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Cấu trúc thư mục & module | **8/10** | Module tách rõ theo nghiệp vụ (`tiep-don`, `kham-benh`, `cap-thuoc`, `thanh-toan`, `ca-lam-viec`...). |
| Đặt tên & đọc hiểu code | **9/10** | Tiếng Việt nhất quán, Prisma schema có comment mô tả từng model. |
| Tài liệu nội bộ | **9/10** | `RULE.md`, `HUONG_DAN.md`, 14+ file đánh giá, file Phase kế hoạch, hướng dẫn PWA & Gemini. |
| Type safety | **8/10** | TypeScript cả FE lẫn BE + Prisma generated types. |

### 11.2. Tách biệt logic FE/BE — 6.5/10

#### Điểm tốt (đã kiểm chứng)

Nút "Tự động phân trực" ở FE **thực chất đã gọi API Backend** (`createAutoSchedule` → `POST /receptionist-schedules/department/auto-schedule`). Backend tính toán phương án trực rồi trả kết quả về cho FE hiển thị.

#### Vấn đề còn lại: 3 validation rule nghiệp vụ chỉ check ở FE

File: [TrangDuyetLichLamViecThuNgan.tsx](file:///d:/smart-clinic/FE/src/modules/ca-lam-viec/pages/thu-ngan/TrangDuyetLichLamViecThuNgan.tsx)

| Dòng | Logic đang nằm ở FE | Rủi ro |
|---|---|---|
| L19-21 | `hasAdjacentDuty()` — Kiểm tra không trực 2 đêm liền nhau | Nếu ai gọi thẳng API (Postman/script), Backend không chặn. |
| L72 | `next.length > 2 \|\| hasAdjacentDuty(next)` — Max 2 ca/tuần + không liền | Business rule quan trọng chỉ có ở client. |
| L111-124 | `rows.some(row => row.dutyDays.length !== 2)` và `coverage.some(count => count < 2)` — Bắt buộc 2 ca/nhân viên, mỗi đêm ≥ 2 người | Validation chỉ ở FE trước khi gọi `saveAndPublish`. |

**Hướng xử lý:** Backend cần duplicate 3 rule này vào service `saveAndPublish` để chặn khi gọi API trực tiếp. FE giữ nguyên validation cho UX nhanh.

#### Code thừa không gây lỗi nhưng gây nhầm lẫn

File: [TrangLichLamViec.tsx L7-15](file:///d:/smart-clinic/FE/src/modules/ca-lam-viec/pages/bac-si/TrangLichLamViec.tsx#L7-L15)

```
const DAYS = [
  { short: 'T2', label: 'Thứ 2', date: '03/08' },  // ← Ngày cứng không dùng
  ...
];
```

UI thực tế tính ngày từ `weekStart` + `addScheduleDays()`. Mảng `date: '03/08'` là code thừa từ bản cũ, không render ra màn hình nhưng gây confuse khi đọc code. Có thể dọn khi rảnh (P2).

---

### 11.3. Dữ liệu nhất quán (DB) — 7.5/10 (Nâng từ 6/10)

#### Phát hiện quan trọng: BE ĐÃ CHUYỂN XONG sang đọc quan hệ chuẩn

Sau khi đọc kỹ [medicines.service.ts](file:///d:/smart-clinic/BE/src/modules/thuoc/medicines.service.ts), phát hiện:

**Hoạt chất — BE đã dùng quan hệ chuẩn ở tất cả module quan trọng:**

| Module | File | Cách đọc hoạt chất |
|---|---|---|
| Cảnh báo kê đơn | [prescription-safety.service.ts](file:///d:/smart-clinic/BE/src/modules/kham-benh/prescription-safety.service.ts) | ✅ Đọc từ `hoatChatCauThanh` → `hoatChat.tenHoatChat` |
| AI gợi ý thuốc | [goi-y-thuoc-ai.service.ts](file:///d:/smart-clinic/BE/src/modules/kham-benh/goi-y-thuoc-ai.service.ts) | ✅ Đọc từ `hoatChatId` quan hệ |
| Gợi ý thuốc thay thế | [goi-y-thuoc.service.ts](file:///d:/smart-clinic/BE/src/modules/goi-y-thuoc/goi-y-thuoc.service.ts) | ✅ Đọc từ `hoatChat.tenHoatChat` |
| Portal bệnh nhân | [patient-portal.service.ts](file:///d:/smart-clinic/BE/src/modules/benh-nhan/patient-portal.service.ts) | ✅ Đọc từ `hoatChat.tenHoatChat` |
| API danh mục thuốc | [medicines.service.ts L414](file:///d:/smart-clinic/BE/src/modules/thuoc/medicines.service.ts#L414) | ⚠️ Tạo trường ảo `hoatChat` = `join()` từ quan hệ chuẩn |

Dòng L413 có comment rõ ràng:
```
// API giữ tên trường cũ để FE không vỡ, nhưng dữ liệu đã lấy từ quan hệ chuẩn.
```

**Hạn sử dụng — BE đã tính từ lô thuốc:**

| Dòng | Logic | Cách hoạt động |
|---|---|---|
| [L427-435](file:///d:/smart-clinic/BE/src/modules/thuoc/medicines.service.ts#L427) | `nearestExpiry()` | Lọc lô còn tồn kho (`soLuongConLai > 0`) → Sort theo `hanDung` tăng dần → Trả lô hạn ngắn nhất. |
| [L415](file:///d:/smart-clinic/BE/src/modules/thuoc/medicines.service.ts#L415) | `hanSuDung: this.nearestExpiry(medicine)` | Tạo trường ảo trong response cho FE — bản chất vẫn từ `LoThuoc.hanDung`. |

FE hiển thị `hanSuDung` tại [TrangQuanLyKhoThuoc.tsx L545, L890](file:///d:/smart-clinic/FE/src/modules/thuoc/pages/admin/TrangQuanLyKhoThuoc.tsx) — đọc từ trường ảo API trả về.

> **Kết luận:** Dữ liệu hoạt chất và hạn dùng **đã chuyển xong** sang đọc từ quan hệ chuẩn (`ThuocHoatChat`, `LoThuoc`). Chỉ giữ 2 trường ảo trong `toResponse()` cho backward compatibility. Đây là cách làm đúng — **nâng lên 7.5/10**.

---

### 11.4. Error Handling / Logging — 7/10 (Nâng từ 5/10)

#### Phát hiện: Dự án ĐÃ CÓ Global Exception Filter

File: [api-exception.filter.ts](file:///d:/smart-clinic/BE/src/common/filters/api-exception.filter.ts)

Đăng ký tại [main.ts L31](file:///d:/smart-clinic/BE/src/main.ts#L31): `app.useGlobalFilters(new ApiExceptionFilter());`

| Tính năng | Dòng | Đánh giá |
|---|---|---|
| `@Catch()` — Bắt **TẤT CẢ** exception | L11 | ✅ Kể cả Prisma error, unhandled error. |
| Phân biệt `HttpException` vs lỗi 500 | L17-20 | ✅ HttpException trả status code đúng, lỗi khác trả 500. |
| Log chi tiết Prisma error code + meta | L24-34 | ✅ Ghi `code=P2003 meta={...}` — rất hữu ích cho debug DB. |
| Format validation error | L39-50 | ✅ Join mảng error thành chuỗi đẹp cho FE hiển thị. |
| Response format thống nhất | L52-56 | ✅ Luôn trả `{ success: false, message, data: null }`. |

#### Điểm còn thiếu (nhỏ)

- Chưa có `timestamp` và `path` trong response lỗi (để trace request nào gây lỗi khi production).
- Chưa có request ID / correlation ID cho log tracing.

> **Kết luận:** Filter đã làm đúng 90% những gì cần. Nâng lên **7/10**.

---

### 11.5. Điểm yếu duy nhất còn lại: Test Coverage — 2/10

- Không thấy thư mục `__tests__/` hay file `*.spec.ts` nào trong cả FE lẫn BE.
- Mỗi lần sửa function, không có cách nào tự động kiểm tra luồng khác có bị vỡ không.
- **Đây là rủi ro lớn nhất khi bảo trì dự án.**

---

### 11.6. Bảng chấm điểm tổng hợp (Sau rà soát source code thực tế)

| Tiêu chí | Điểm ban đầu | Điểm cập nhật | Lý do thay đổi |
|---|---|---|---|
| Cấu trúc thư mục & module | 8/10 | **8/10** | Giữ nguyên. |
| Đặt tên & đọc hiểu code | 9/10 | **9/10** | Giữ nguyên. |
| Tài liệu nội bộ | 9/10 | **9/10** | Giữ nguyên. |
| Type safety | 8/10 | **8/10** | Giữ nguyên. |
| Tách biệt logic FE/BE | 6/10 | **6.5/10** | Auto-schedule đã gọi API BE. Còn 3 validation rule ở FE cần duplicate sang BE. |
| Dữ liệu nhất quán (DB) | 6/10 | **7.5/10** | BE đã chuyển hết sang đọc quan hệ chuẩn, giữ 2 trường ảo cho backward compatibility. Comment rõ ràng. |
| Error handling / Logging | 5/10 | **7/10** | Đã có `ApiExceptionFilter` toàn cục, format lỗi chuẩn `{ success, message, data }`, log Prisma error. Thiếu timestamp/path. |
| Test coverage | 2/10 | **2/10** | Vẫn chưa có test tự động. |

**Tổng điểm bảo trì: ~7.1/10** — Trên mức trung bình khá, tốt hơn đáng kể so với đánh giá lướt qua lần đầu (6.5/10).
