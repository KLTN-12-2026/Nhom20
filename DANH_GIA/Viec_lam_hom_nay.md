# KẾ HOẠCH CÔNG VIỆC — 05/09/2026

---

## MỤC TIÊU TỔNG QUAN

Thực hiện 4 nhóm thay đổi FE + BE liên quan đến:
1. **Đánh giá bác sĩ** — Xóa Sửa/Xóa, chỉ hiển thị read-only sau khi đánh giá.
2. **Table Lịch sử khám** — Redesign table bệnh nhân để không kéo ngang trên desktop 16:9.
3. **Quản lý lịch hẹn** — Đưa nút "Từ chối" ra ngoài cột Hành động.
4. **Modal Xác nhận/Cấp phiếu** — Loại bỏ "Hủy lịch" + "Không đến" khỏi modal, chuyển vào flow "Từ chối".

---

## 1. BỆNH NHÂN — LỊCH SỬ KHÁM & ĐÁNH GIÁ

### 1.1 Mục tiêu
- Bệnh nhân chỉ được phép **gửi đánh giá 1 lần** khi lượt khám đã hoàn tất + hóa đơn đã thanh toán.
- Sau khi đánh giá, **không được sửa hoặc xóa** — chỉ hiển thị nội dung + trạng thái đã đánh giá (read-only).
- Xóa hoàn toàn chức năng Sửa/Xóa đánh giá ở cả FE và BE.

### 1.2 Phân tích hiện trạng

#### FE hiện tại:
- **File**: `PatientMedicalHistorySection.tsx`
  - Dòng 54-55: State `reviewVisit` (mở modal sửa) + `deleteVisit` (mở modal xóa) — **CẦN XÓA deleteVisit**
  - Dòng 61-65: Hàm `openReview()` xử lý cả tạo mới lẫn sửa — **SỬA lại** chỉ cho tạo mới
  - Dòng 92-106: Hàm `submitReview()` dòng 97-98 gọi `updateReview()` — **XÓA** nhánh update
  - Dòng 108-119: Toàn bộ hàm `removeReview()` — **XÓA**
  - Dòng 140: Cell đánh giá có nút "Sửa" + "Xóa" trong `patient-history__review-actions` — **XÓA** cả div này
  - Dòng 150: Modal cập nhật đánh giá (title "Cập nhật đánh giá") — **XÓA** hoặc sửa chỉ còn tạo mới
  - Dòng 152: Modal xóa đánh giá `{deleteVisit && ...}` — **XÓA** toàn bộ block

- **File**: `patient-portal.api.ts`
  - Dòng 15-17: `updateReview()` — **XÓA**
  - Dòng 19-22: `removeReview()` — **XÓA**

#### BE hiện tại:
- **File**: `patient-portal.controller.ts`
  - Dòng 52-61: `@Patch('me/visits/:visitId/review')` updateReview endpoint — **XÓA**
  - Dòng 63-72: `@Delete('me/visits/:visitId/review')` removeReview endpoint — **XÓA**

- **File**: `patient-portal.service.ts`
  - Dòng 109-139: `updateReview()` — **XÓA**
  - Dòng 141-149: `removeReview()` — **XÓA**

### 1.3 Hướng giải quyết chi tiết

#### Bước 1: BE — Xóa endpoint Sửa/Xóa đánh giá

**`patient-portal.controller.ts`**:
- Xóa method `updateReview()` (dòng 52-61) — Xóa decorator `@Patch` + body hàm
- Xóa method `removeReview()` (dòng 63-72) — Xóa decorator `@Delete` + body hàm

**`patient-portal.service.ts`**:
- Xóa hàm `updateReview()` (dòng 109-139) — toàn bộ
- Xóa hàm `removeReview()` (dòng 141-149) — toàn bộ
- Giữ nguyên hàm `createReview()` (dòng 64-107) — logic tạo mới không đổi

> **Kiểm tra**: Import `Delete`, `Patch` trong controller — nếu không còn dùng ở đâu khác thì xóa khỏi import.

#### Bước 2: FE — Xóa chức năng Sửa/Xóa

**`patient-portal.api.ts`**:
- Xóa hàm `updateReview()` (dòng 15-17)
- Xóa hàm `removeReview()` (dòng 19-22)
- Giữ `createReview()` (dòng 11-14)

**`PatientMedicalHistorySection.tsx`**:
- Xóa state `deleteVisit` (dòng 55)
- Sửa hàm `openReview()`: chỉ cho mở khi `visit.isReviewable === true` (chưa có review)
- Xóa toàn bộ hàm `removeReview()` (dòng 108-119)
- Sửa `submitReview()`: xóa nhánh `reviewVisit.review ? updateReview : createReview`, chỉ giữ `createReview`
- Sửa cell đánh giá (dòng 140):
  - **Nếu đã có review** (`visit.review`): hiển thị sao + nhận xét + trạng thái → **KHÔNG** có nút Sửa/Xóa
  - **Nếu chưa review + isReviewable**: hiển thị nút "Đánh giá"
  - **Nếu chưa review + không isReviewable**: hiển thị text "Chỉ mở sau khi đã thanh toán"
- Xóa modal xóa đánh giá (dòng 152)
- Sửa modal đánh giá (dòng 150): bỏ title "Cập nhật đánh giá", chỉ giữ "Đánh giá bác sĩ"

### 1.4 Các file dự kiến cần sửa

| Layer | File | Thao tác |
|-------|------|----------|
| FE | `FE/src/modules/benh-nhan/components/PatientMedicalHistorySection.tsx` | Xóa Sửa/Xóa, sửa cell + modal |
| FE | `FE/src/modules/benh-nhan/api/patient-portal.api.ts` | Xóa `updateReview`, `removeReview` |
| BE | `BE/src/modules/benh-nhan/patient-portal.controller.ts` | Xóa PATCH + DELETE endpoint |
| BE | `BE/src/modules/benh-nhan/patient-portal.service.ts` | Xóa `updateReview`, `removeReview` |

### 1.5 Điều kiện hoàn thành
- [ ] Không còn nút Sửa/Xóa trên UI bệnh nhân
- [ ] Không còn endpoint PATCH/DELETE review ở BE
- [ ] Bệnh nhân đã đánh giá → chỉ thấy trạng thái + sao + nhận xét (read-only)
- [ ] Bệnh nhân chưa đánh giá + đã thanh toán → thấy nút "Đánh giá"
- [ ] Gọi API cũ `PATCH /patient-portal/me/visits/:id/review` trả 404

---

## 2. TABLE LỊCH SỬ KHÁM & ĐÁNH GIÁ — REDESIGN

### 2.1 Mục tiêu
- Table hiện tại có **7 cột** (`Ngày khám` | `Bác sĩ / Chuyên khoa` | `Chẩn đoán` | `Đơn thuốc` | `Hóa đơn` | `Đánh giá` | `Thao tác`) → bị kéo ngang trên desktop 16:9.
- Rút gọn/gom cột hợp lý, ưu tiên thông tin chính, nút thao tác không bị cắt.

### 2.2 Phân tích hiện trạng

**File**: `PatientMedicalHistorySection.tsx` — dòng 132

Cấu trúc table hiện tại:
```
| Ngày khám        | Bác sĩ / CK    | Chẩn đoán    | Đơn thuốc   | Hóa đơn        | Đánh giá        | 👁 |
| (status dưới)    | (CK dưới tên)  | text          | nút "Xem"   | số tiền+status  | sao+status+nút  | icon |
```

**Vấn đề**: 7 cột chiếm >1400px, table-responsive bật scroll ngang trên 16:9 (1920px - sidebar ≈ 1200-1300px available).

### 2.3 Hướng giải quyết chi tiết

#### Phương án gom cột: Từ 7 cột → 5 cột

**Layout mới đề xuất**:

```
| Lượt khám                   | Chẩn đoán & Đơn thuốc      | Thanh toán       | Đánh giá        | Thao tác  |
| ─────────────────────────── | ─────────────────────────── | ──────────────── | ─────────────── | ───────── |
| 📅 25/08/2026               | Viêm họng cấp              | 350.000₫        | ★★★★★           | 👁 Xem đơn|
| BS. Nguyễn Văn A · Nội TH  | 🏷 Đơn thuốc: DT-001      | ✅ Đã thanh toán | Đã duyệt        |           |
| Trạng thái: Đã hoàn tất    |                             |                  |                  |           |
```

**Chi tiết gom**:
1. **Cột "Lượt khám"** = gom `Ngày khám` + `Bác sĩ/Chuyên khoa` + `Trạng thái lượt khám`
   - Dòng 1: Ngày khám (bold)
   - Dòng 2: Bác sĩ · Chuyên khoa (small, secondary)
   - Dòng 3: Trạng thái (small badge)
2. **Cột "Chẩn đoán & Đơn thuốc"** = gom `Chẩn đoán` + `Đơn thuốc`
   - Dòng 1: Text chẩn đoán (truncate nếu dài)
   - Dòng 2: Có đơn thuốc → nút "Xem đơn" nhỏ | Không → text "Không kê"
3. **Cột "Thanh toán"** = nguyên cột `Hóa đơn`
   - Số tiền + trạng thái thanh toán
4. **Cột "Đánh giá"** = nguyên cột `Đánh giá` (đã sửa ở mục 1 — chỉ read-only hoặc nút tạo)
5. **Cột "Thao tác"** = icon xem chi tiết + nút in đơn (nếu có)

#### Bước thực hiện:

**`PatientMedicalHistorySection.tsx`**:
- Sửa `<thead>` dòng 132: đổi từ 7 th → 5 th
- Sửa `<tbody>` dòng 133-143: gom cell theo layout mới
- Thao tác column: gom nút "Xem đơn" (hiện ở cột Đơn thuốc) + icon "Xem chi tiết" vào 1 cột cuối

**CSS** — cần kiểm tra:
- `patients.css` — hiện không có class `.patient-history__table`, style nằm trong `index.css` hoặc inline.
- Cần kiểm tra `index.css` để xác nhận có style cho `.patient-history__table` không.
- Có thể cần thêm CSS cho layout mới (min-width cột, truncate text, v.v.)

### 2.4 Các file dự kiến cần sửa

| Layer | File | Thao tác |
|-------|------|----------|
| FE | `FE/src/modules/benh-nhan/components/PatientMedicalHistorySection.tsx` | Gom cột table |
| FE | `FE/src/index.css` hoặc `FE/src/modules/benh-nhan/patients.css` | Thêm/sửa CSS cho table mới |

### 2.5 Điều kiện hoàn thành
- [ ] Table vừa khung 16:9 desktop (≈1200-1300px available) không scroll ngang
- [ ] Thông tin chính vẫn đọc được rõ ràng
- [ ] Nút thao tác không bị cắt/ẩn
- [ ] Mobile vẫn responsive được (table-responsive sẽ scroll khi cần)

---

## 3. QUẢN LÝ LỊCH HẸN — NÚT "TỪ CHỐI" RA NGOÀI TABLE

### 3.1 Mục tiêu
- Đưa nút "Từ chối" ra ngoài cột **Hành động** của table, đặt cạnh nút "Xác nhận".
- Không cần mở modal chi tiết chỉ để từ chối.

### 3.2 Phân tích hiện trạng

**File**: `TrangLichHenThuNgan.tsx`

Dòng 232 — cột Hành động trong table hiện tại:
```tsx
<div className="reception-row-actions">
  <button ... onClick={() => openAppointment(appointment)}>👁</button>                    // Xem chi tiết
  {status === 'CHO_XAC_NHAN' && <button onClick={() => openAppointment(...)}>Xác nhận</button>}  // Mở modal
  {status === 'DA_XAC_NHAN' && <button onClick={() => openAppointment(...)}>Cấp phiếu</button>}  // Mở modal
  {appointment.ticket && <button onClick={() => printTicket(...)}>🖨</button>}             // In
</div>
```

Hiện tại "Từ chối" **chỉ nằm trong modal** (dòng 263, modal-footer):
```tsx
{!cancelAction && selected.status === 'CHO_XAC_NHAN' && <button onClick={() => setCancelAction('DA_TU_CHOI')}>Từ chối</button>}
```

→ User phải mở modal → mới thấy nút Từ chối → click → nhập lý do → submit.

### 3.3 Hướng giải quyết chi tiết

#### Phương án: Thêm nút "Từ chối" trực tiếp vào cột Hành động trên table

**`TrangLichHenThuNgan.tsx`** — dòng 232:

Sửa block trong `reception-row-actions`:
```tsx
<div className="reception-row-actions">
  <button ... title="Xem chi tiết" onClick={() => openAppointment(appointment)}>
    <span className="material-symbols-outlined">visibility</span>
  </button>
  {appointment.status === 'CHO_XAC_NHAN' && <>
    <button className="btn btn-sm btn-outline-danger" onClick={() => openRejectModal(appointment)}>Từ chối</button>
    <button className="btn btn-sm btn-primary" onClick={() => openAppointment(appointment)}>Xác nhận</button>
  </>}
  {appointment.status === 'DA_XAC_NHAN' && 
    <button className="btn btn-sm btn-outline-primary" onClick={() => openAppointment(appointment)}>Cấp phiếu</button>}
  {appointment.ticket && 
    <button ... onClick={() => printTicket(appointment)}>🖨</button>}
</div>
```

**Cần thêm**:
- Hàm `openRejectModal(appointment)` — set selected + mở trực tiếp ở chế độ từ chối:
  ```tsx
  const openRejectModal = (appointment: Appointment) => {
    setSelectedId(appointment.id);
    setCancelAction('DA_TU_CHOI');
  };
  ```
- Khi click "Từ chối" ở table → mở modal với `cancelAction` đã = `'DA_TU_CHOI'` → user chỉ cần nhập lý do + submit.
- **KHÔNG cần load danh sách bác sĩ** khi mở ở chế độ từ chối (tối ưu: chỉ gọi `loadAvailableDoctors` khi mở modal để xác nhận/cấp phiếu).

#### Cũng áp dụng cho trang Admin nếu có

**File**: `TrangQuanLyLichHen.tsx` — dòng 267-273

Hiện tại trang Admin cột Thao tác **chỉ có icon "Xem chi tiết"** → mở modal view-only (không có xác nhận/từ chối).

→ **Kết luận**: Chỉ cần sửa ở trang **thu ngân** (`TrangLichHenThuNgan.tsx`). Trang admin là view-only, không cần thêm.

### 3.4 Các file dự kiến cần sửa

| Layer | File | Thao tác |
|-------|------|----------|
| FE | `FE/src/modules/lich-hen/pages/thu-ngan/TrangLichHenThuNgan.tsx` | Thêm nút Từ chối vào table + hàm openRejectModal |
| FE | `FE/src/modules/tiep-don/receptionist-workspace.css` (cần kiểm tra) | Có thể cần sửa CSS cho `.reception-row-actions` |

### 3.5 Điều kiện hoàn thành
- [ ] Nút "Từ chối" hiển thị trực tiếp ở cột Hành động, cạnh "Xác nhận" khi status = `CHO_XAC_NHAN`
- [ ] Click "Từ chối" → mở modal nhập lý do → submit → cập nhật status `DA_TU_CHOI`
- [ ] Không cần mở modal chi tiết → tìm nút Từ chối nữa
- [ ] Flow xác nhận/cấp phiếu vẫn hoạt động bình thường

---

## 4. MODAL XÁC NHẬN/CẤP PHIẾU — LOẠI BỎ "HỦY LỊCH" + "KHÔNG ĐẾN"

### 4.1 Mục tiêu
- Trong modal tiếp nhận lịch hẹn, khi trạng thái `DA_XAC_NHAN`:
  - **KHÔNG hiển thị** nút "Hủy lịch" và "Không đến".
  - Hai trạng thái này phải được xử lý bên trong chức năng "Từ chối" (mục 3).

### 4.2 Phân tích hiện trạng

**File**: `TrangLichHenThuNgan.tsx` — dòng 263

Modal footer hiện tại khi `selected.status === 'DA_XAC_NHAN'`:
```tsx
{!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-danger" onClick={() => setCancelAction('DA_HUY')}>Hủy lịch</button>}
{!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-warning" onClick={() => setCancelAction('KHONG_DEN')}>Không đến</button>}
{!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-primary" ...>Cấp phiếu tiếp đón</button>}
```

→ 3 nút: **Hủy lịch** (btn-danger) + **Không đến** (btn-warning) + **Cấp phiếu** (btn-primary)

### 4.3 Hướng giải quyết chi tiết

#### Bước 1: Xóa nút "Hủy lịch" + "Không đến" khỏi modal khi `DA_XAC_NHAN`

**`TrangLichHenThuNgan.tsx`** — dòng 263:

Xóa 2 đoạn JSX trong modal-footer:
```diff
- {!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-danger" onClick={() => setCancelAction('DA_HUY')}>Hủy lịch</button>}
- {!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-warning" onClick={() => setCancelAction('KHONG_DEN')}>Không đến</button>}
```

Giữ lại:
```tsx
{!cancelAction && selected.status === 'DA_XAC_NHAN' && <button className="btn btn-primary" ...>Cấp phiếu tiếp đón</button>}
```

→ Modal khi `DA_XAC_NHAN` chỉ còn: **Đóng** + **Cấp phiếu tiếp đón**.

#### Bước 2: Chuyển "Hủy lịch" + "Không đến" vào flow "Từ chối"

Hiện tại state `cancelAction` nhận giá trị: `'DA_TU_CHOI' | 'DA_HUY' | 'KHONG_DEN' | null`

**Phương án**: Thêm nút "Từ chối" vào cột Hành động của table cho cả status `DA_XAC_NHAN` (ngoài `CHO_XAC_NHAN`):

```tsx
{appointment.status === 'DA_XAC_NHAN' && <>
  <button className="btn btn-sm btn-outline-danger" onClick={() => openRejectModal(appointment)}>Từ chối</button>
  <button className="btn btn-sm btn-outline-primary" onClick={() => openAppointment(appointment)}>Cấp phiếu</button>
</>}
```

Khi click "Từ chối" ở trạng thái `DA_XAC_NHAN` → mở modal với dropdown chọn lý do:
- Mở modal reject → user chọn 1 trong:
  - `DA_HUY` — Hủy lịch (cần nhập lý do)
  - `KHONG_DEN` — Không đến (không bắt buộc lý do)

**Sửa modal reject**:
- Khi `cancelAction` đã set → hiển thị form nhập lý do
- Nếu mở từ `DA_XAC_NHAN`, cần cho user chọn hành động cụ thể (Hủy lịch hay Không đến)
- Thêm dropdown/radio trong modal khi `selected.status === 'DA_XAC_NHAN'`:
  ```tsx
  {cancelAction && selected.status === 'DA_XAC_NHAN' && (
    <select value={cancelAction} onChange={(e) => setCancelAction(e.target.value)}>
      <option value="DA_HUY">Hủy lịch</option>
      <option value="KHONG_DEN">Không đến</option>
    </select>
  )}
  ```

> **Lưu ý**: Hàm `handleCancelAppointment()` (dòng 146-163) vẫn giữ nguyên — nó đã xử lý cả 3 status (`DA_TU_CHOI`, `DA_HUY`, `KHONG_DEN`) rồi. Chỉ cần thay đổi cách user trigger.

### 4.4 Các file dự kiến cần sửa

| Layer | File | Thao tác |
|-------|------|----------|
| FE | `FE/src/modules/lich-hen/pages/thu-ngan/TrangLichHenThuNgan.tsx` | Xóa 2 nút trong modal, thêm nút Từ chối ở table cho `DA_XAC_NHAN` |

### 4.5 Điều kiện hoàn thành
- [ ] Modal khi `DA_XAC_NHAN` chỉ có: Đóng + Cấp phiếu tiếp đón (không còn Hủy lịch/Không đến)
- [ ] Nút "Từ chối" hiện trên table cho cả `CHO_XAC_NHAN` và `DA_XAC_NHAN`
- [ ] Khi từ chối ở `DA_XAC_NHAN` → user chọn được hành động: Hủy lịch / Không đến
- [ ] API `PATCH /appointments/:id` vẫn nhận status `DA_HUY`, `KHONG_DEN` bình thường (BE không cần sửa)

---

## 5. TỔNG HỢP — API/DTO/SERVICE LIÊN QUAN CẦN KIỂM TRA

| Thành phần | File | Mô tả |
|------------|------|-------|
| **DTO** | `BE/src/modules/benh-nhan/dto/create-doctor-review.dto.ts` | Giữ nguyên — chỉ dùng cho `createReview` |
| **DTO** | `BE/src/modules/lich-hen/dto/update-appointment.dto.ts` | Giữ nguyên — đã có `status` + `rejectionOrCancellationReason` |
| **Service** | `BE/src/modules/benh-nhan/patient-portal.service.ts` | Xóa `updateReview` + `removeReview` |
| **Service** | `BE/src/modules/lich-hen/appointments.service.ts` | Giữ nguyên — hàm `update()` đã xử lý mọi status transition |
| **Controller** | `BE/src/modules/benh-nhan/patient-portal.controller.ts` | Xóa `@Patch` + `@Delete` endpoint |
| **Controller** | `BE/src/modules/lich-hen/appointments.controller.ts` | Giữ nguyên |
| **Type FE** | `FE/src/modules/benh-nhan/types/patient-portal.types.ts` | Giữ nguyên — struct response không đổi |
| **Type FE** | `FE/src/modules/lich-hen/types/appointment.types.ts` | Giữ nguyên |
| **API FE** | `FE/src/modules/lich-hen/api/appointment.api.ts` | Giữ nguyên — `update()` đã nhận status |
| **Hook** | Cần kiểm tra: `FE/src/modules/benh-nhan/hooks/use-patient-portal.ts` | Giữ nguyên nếu chỉ gọi `getMyVisits` |
| **Hook** | Cần kiểm tra: `FE/src/modules/lich-hen/hooks/use-appointments.ts` | Giữ nguyên |

---

## 6. THỨ TỰ THỰC HIỆN

```
┌─────────────────────────────────────────────────────────────────┐
│  Bước 1: BE — Xóa endpoint Sửa/Xóa đánh giá                  │
│  ├── patient-portal.controller.ts: xóa PATCH + DELETE          │
│  └── patient-portal.service.ts: xóa updateReview + removeReview│
├─────────────────────────────────────────────────────────────────┤
│  Bước 2: FE — Xóa Sửa/Xóa đánh giá + sửa hiển thị read-only │
│  ├── patient-portal.api.ts: xóa updateReview + removeReview    │
│  └── PatientMedicalHistorySection.tsx: xóa nút + modal + state │
├─────────────────────────────────────────────────────────────────┤
│  Bước 3: FE — Redesign table lịch sử khám (gom 7→5 cột)      │
│  ├── PatientMedicalHistorySection.tsx: sửa thead + tbody       │
│  └── patients.css hoặc index.css: thêm CSS cho layout mới     │
├─────────────────────────────────────────────────────────────────┤
│  Bước 4: FE — Thêm nút "Từ chối" vào table lịch hẹn          │
│  └── TrangLichHenThuNgan.tsx: thêm nút + hàm openRejectModal  │
├─────────────────────────────────────────────────────────────────┤
│  Bước 5: FE — Xóa "Hủy lịch" + "Không đến" khỏi modal       │
│  └── TrangLichHenThuNgan.tsx: xóa 2 nút + thêm select action  │
├─────────────────────────────────────────────────────────────────┤
│  Bước 6: Kiểm thử tổng hợp                                    │
│  ├── Build FE + BE thành công                                  │
│  ├── Test flow đánh giá: tạo mới → chỉ read-only              │
│  ├── Test table không kéo ngang trên 16:9                      │
│  └── Test flow từ chối: từ table → modal → submit              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. RỦI RO CẦN TRÁNH

| # | Rủi ro | Biện pháp |
|---|--------|-----------|
| 1 | Xóa endpoint BE nhưng FE còn gọi → crash | Xóa FE API trước hoặc đồng thời. Grep toàn bộ `updateReview` / `removeReview` trong FE |
| 2 | Bệnh nhân đã có review cũ mà data response thay đổi → lỗi render | Struct response không đổi, chỉ xóa action → an toàn |
| 3 | Gom cột table → mất thông tin quan trọng | Mọi thông tin vẫn giữ, chỉ gom visual. Chi tiết đầy đủ vẫn ở modal "Xem chi tiết" |
| 4 | Nút "Từ chối" ra ngoài table → cột Hành động quá rộng | Thiết kế button nhỏ (btn-sm), text ngắn gọn |
| 5 | Xóa "Hủy lịch"/"Không đến" khỏi modal → user mất khả năng hủy | **KHÔNG mất** — chuyển vào flow "Từ chối" ở table, user chọn hành động trong modal reject |
| 6 | State `cancelAction` phức tạp thêm khi mở reject cho `DA_XAC_NHAN` | Tách rõ: `CHO_XAC_NHAN` → mặc định `DA_TU_CHOI`; `DA_XAC_NHAN` → cho chọn `DA_HUY` / `KHONG_DEN` |
| 7 | Không test trên mobile → layout mới bể | Giữ `table-responsive`, test cả mobile lẫn desktop |
| 8 | Thay đổi DB schema không cần thiết | **KHÔNG thay đổi DB** — chỉ sửa FE/BE code logic |

---

## 8. CHECKLIST CÔNG VIỆC HÔM NAY

### BE
- [ ] Xóa `updateReview()` trong `patient-portal.service.ts`
- [ ] Xóa `removeReview()` trong `patient-portal.service.ts`
- [ ] Xóa `@Patch('me/visits/:visitId/review')` endpoint trong `patient-portal.controller.ts`
- [ ] Xóa `@Delete('me/visits/:visitId/review')` endpoint trong `patient-portal.controller.ts`
- [ ] Dọn import không dùng (`Patch`, `Delete` nếu không còn dùng)
- [ ] Build BE thành công

### FE — Đánh giá
- [ ] Xóa `updateReview()` trong `patient-portal.api.ts`
- [ ] Xóa `removeReview()` trong `patient-portal.api.ts`
- [ ] Xóa state `deleteVisit` trong `PatientMedicalHistorySection.tsx`
- [ ] Xóa hàm `removeReview()` trong `PatientMedicalHistorySection.tsx`
- [ ] Sửa `submitReview()` — chỉ giữ nhánh `createReview`
- [ ] Xóa nút Sửa/Xóa khỏi cell đánh giá → thay bằng hiển thị read-only
- [ ] Xóa modal xóa đánh giá
- [ ] Sửa modal đánh giá — chỉ cho tạo mới

### FE — Table lịch sử khám
- [ ] Gom 7 cột → 5 cột trong `PatientMedicalHistorySection.tsx`
- [ ] Thêm/sửa CSS cho layout table mới
- [ ] Kiểm tra không scroll ngang trên desktop 16:9

### FE — Lịch hẹn
- [ ] Thêm nút "Từ chối" vào cột Hành động cho `CHO_XAC_NHAN` trong `TrangLichHenThuNgan.tsx`
- [ ] Thêm nút "Từ chối" vào cột Hành động cho `DA_XAC_NHAN` trong `TrangLichHenThuNgan.tsx`
- [ ] Thêm hàm `openRejectModal()`
- [ ] Xóa nút "Hủy lịch" khỏi modal footer khi `DA_XAC_NHAN`
- [ ] Xóa nút "Không đến" khỏi modal footer khi `DA_XAC_NHAN`
- [ ] Thêm select chọn hành động (Hủy lịch / Không đến) trong modal reject khi mở từ `DA_XAC_NHAN`
- [ ] Build FE thành công

### Kiểm thử
- [ ] Flow đánh giá: Tạo mới → hiển thị read-only → không có nút Sửa/Xóa
- [ ] Table lịch sử: Không scroll ngang trên desktop 16:9
- [ ] Từ chối từ table: Click → modal → nhập lý do → submit thành công
- [ ] Cấp phiếu: Modal `DA_XAC_NHAN` chỉ có Đóng + Cấp phiếu
- [ ] Hủy lịch/Không đến: Phải qua flow "Từ chối" ở table

---

> **LƯU Ý**: File này chỉ là kế hoạch. Chưa thay đổi bất kỳ file source nào.