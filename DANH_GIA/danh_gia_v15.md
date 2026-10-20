# Đánh giá v15 — AI gợi ý thuốc + Khám chuyên khoa

**Ngày:** 13/08/2026
**Phạm vi:** Kế hoạch triển khai chi tiết cho Codex, không code.

---

## 1. Hiện trạng source hiện tại

### 1.1. Kiến trúc đang chạy

```text
FE (React/Vite) → Axios Client → BE (NestJS) → Prisma → PostgreSQL (Neon)
```

### 1.2. Prisma schema

- **41 model** với đầy đủ enum tiếng Việt.
- `HoSoKham` có field `noiDungChuyenKhoa Json?` — hiện lưu JSON tự do, chưa validate phía Backend theo từng chuyên khoa.
- `HoSoKham` có field `sinhHieu Json?` — sinh hiệu chung.
- `CanhBaoDonThuoc` — đã có 9 loại cảnh báo, 3 mức độ, 3 nguồn (`QUY_TAC_HE_THONG`, `DU_LIEU_THUOC`, `AI_GEMINI`).
- `DiUngBenhNhan` — link FK tới `Thuoc` và `HoatChat`.
- `HoatChat` + `ThuocHoatChat` — quan hệ nhiều-nhiều đã chuẩn hóa.
- `LoThuoc` — tồn kho theo lô, FEFO.
- **Chưa có**: bảng `goi_y_thuoc_thay_the`, bảng `chi_tiet_kham_chuyen_khoa`.

### 1.3. Module Backend hiện tại

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| `kham-benh` | ✅ Đang chạy | Controller/Service/Repository đầy đủ |
| `kham-benh/prescription-safety.service.ts` | ✅ Đang chạy | Rule-based: dị ứng, trùng hoạt chất, tồn kho, hết hạn, thiếu liều, thiếu hướng dẫn |
| `thuoc` | ✅ Đang chạy | CRUD thuốc, lô thuốc, hoạt chất |
| `chat-ai` | ✅ Đang chạy | Chatbox AI với tool calling, chưa liên quan kê đơn |
| `integrations/gemini` | ✅ Đang chạy | `GeminiService` có `chat()` và `chatWithTools()` |
| `thoi-gian-thuc` | ✅ Đang chạy | Socket.IO, event `prescription.warning_created` |
| `thong-bao` | ✅ Đang chạy | Push thông báo theo vai trò |
| `nhat-ky-he-thong` | ✅ Đang chạy | Audit log |
| `cap-thuoc` | ✅ Đang chạy | Dược sĩ cấp thuốc FEFO |
| `tiep-don` | ✅ Đang chạy | Lễ tân check-in, nhắc tái khám |

### 1.4. Chuyên khoa đã seed

8 chuyên khoa đúng yêu cầu:

| Mã | Tên chuyên khoa |
|----|----------------|
| 101 | Nội tổng quát |
| 102 | Nhi khoa |
| 103 | Da liễu |
| 104 | Tim mạch |
| 105 | Tai Mũi Họng |
| 106 | Sản Phụ khoa |
| 107 | Mắt |
| 108 | Cơ Xương Khớp |

### 1.5. Trang khám bệnh FE hiện tại

- `TrangKhamBenh.tsx` (~803 dòng) đã có:
  - Sinh hiệu chung (huyết áp, nhịp tim, nhiệt độ).
  - Mảng `SPECIALTY_FIELDS` hard-code 7 nhóm chuyên khoa (thiếu Nội tổng quát) — **nhưng đang bị disable** (`return false` tại dòng 203).
  - Kê đơn thuốc (tìm kiếm, thêm/xóa dòng).
  - Panel cảnh báo an toàn bên phải.
  - Auto-save nháp mỗi 4 giây.
  - Modal hoàn tất khi không kê thuốc.
- `specialtyContent` gửi lên Backend dạng `Record<string, string | number | null>` — **không validate theo chuyên khoa**.

---

## 2. Đối chiếu với `Huong_dan_Gemini_goi_y_thuoc.md`

| Yêu cầu trong hướng dẫn | Source hiện tại | Đánh giá |
|--------------------------|----------------|----------|
| Rule-based kiểm tra dị ứng | ✅ `PrescriptionSafetyService.refreshWarnings()` kiểm tra dị ứng theo tên thuốc + hoạt chất | GIU_NGUYEN |
| Rule-based kiểm tra trùng hoạt chất | ✅ Có kiểm tra `ingredientUsage` map | GIU_NGUYEN |
| Rule-based kiểm tra tồn kho | ✅ Kiểm tra `validLots` và `available < line.soLuong` | GIU_NGUYEN |
| Rule-based kiểm tra hết hạn | ✅ Kiểm tra `THUOC_HET_HAN` | GIU_NGUYEN |
| Rule-based kiểm tra thiếu liều/hướng dẫn | ✅ `THIEU_LIEU_DUNG`, `THIEU_HUONG_DAN` | GIU_NGUYEN |
| Bảng `goi_y_thuoc_thay_the` | ❌ Chưa có | CAN_THEM_MOI |
| Gemini diễn giải cảnh báo + thuốc thay thế | ❌ Chưa có (Gemini chỉ dùng cho Chatbox) | CAN_THEM_MOI |
| Nút "Xem giải thích AI" trên UI | ❌ Chưa có | CAN_THEM_MOI |
| Gemini lỗi → cảnh báo rule-based vẫn chạy | ✅ Rule-based hoạt động độc lập, không phụ thuộc Gemini | GIU_NGUYEN |
| Gemini không tự kê đơn/thay thuốc | ✅ Chưa có code cho Gemini kê đơn → cần đảm bảo khi thêm | GIU_NGUYEN nguyên tắc |
| `NguonCanhBao.AI_GEMINI` trong enum | ✅ Đã có trong schema | TAI_SU_DUNG |
| `LoaiTacVuAI.CANH_BAO_THUOC` | ✅ Đã có trong enum | TAI_SU_DUNG |
| Lưu `LanChayAI` cho mỗi lần gọi Gemini | ✅ Infrastructure sẵn có | TAI_SU_DUNG |

### Sự khác biệt cần lưu ý

1. **Hướng dẫn nói `thuoc_can_tranh_id`** — trong Prisma hiện tại dùng `thuocId` (tên field). Codex nên dùng `thuocCanTranhId` theo đúng naming convention tiếng Việt.
2. **Hướng dẫn nói `nguoi_duyet_id`** — cần FK tới `NguoiDung`. Chỉ ADMIN hoặc DOCTOR có quyền cấu hình/duyệt.
3. **`noiDungChuyenKhoa Json?`** trong `HoSoKham` đang lưu dữ liệu chuyên khoa — user yêu cầu tách ra bảng riêng `chi_tiet_kham_chuyen_khoa`. Cần migration chuyển dữ liệu cũ nếu có.

---

## 3. Chức năng được giữ nguyên (GIU_NGUYEN)

Tuyệt đối không sửa:

| Chức năng | File chính | Lý do |
|-----------|-----------|-------|
| Kê đơn thuốc | `examinations.service.ts`, `prisma-examination.repository.ts` | Flow hoạt động, đã test |
| Rule-based cảnh báo | `prescription-safety.service.ts` | 6 loại cảnh báo đang chạy |
| Xử lý cảnh báo bác sĩ | Controller endpoint `PATCH prescription-warnings/:warningId` | Đang hoạt động |
| Realtime cảnh báo | `prescription.warning_created` event | Đang hoạt động |
| Dị ứng bệnh nhân | `DiUngBenhNhan` model + hiển thị trên TrangKhamBenh | Đang hoạt động |
| Hoạt chất | `HoatChat` + `ThuocHoatChat` | Đã chuẩn hóa v14 |
| Tồn kho/Lô thuốc | `LoThuoc`, `GiaoDichKho` | FEFO hoạt động |
| Dược sĩ cấp thuốc | Module `cap-thuoc` | Đang hoạt động |
| Hàng chờ realtime | Module `hang-cho`, Socket.IO | Đang hoạt động |
| Chatbox AI | Module `chat-ai` | Không liên quan kê đơn |
| Lễ tân check-in | Module `tiep-don` | Đang hoạt động |
| Thanh toán SePay | Module `thanh-toan` | Đang hoạt động |
| Auto-save nháp | `TrangKhamBenh.tsx` timer 4s | Đang hoạt động |
| Hoàn tất → chuyển Dược | `REALTIME_EVENTS.PRESCRIPTION_CREATED` | Đang hoạt động |

---

## 4. Chức năng cần bổ sung (CAN_THEM_MOI / CAN_DIEU_CHINH)

| # | Chức năng | Loại | Mô tả |
|---|----------|------|-------|
| 1 | Bảng `goi_y_thuoc_thay_the` | CAN_THEM_MOI | Prisma model + CRUD quản trị |
| 2 | Bảng `chi_tiet_kham_chuyen_khoa` | CAN_THEM_MOI | Prisma model + JSONB validate |
| 3 | 8 DTO khám chuyên khoa | CAN_THEM_MOI | Class Validator cho từng khoa |
| 4 | API khám chuyên khoa | CAN_THEM_MOI | Controller/Service/Repository |
| 5 | Gemini diễn giải cảnh báo | CAN_THEM_MOI | Service mới, dùng `GeminiService.chat()` |
| 6 | API "Xem giải thích AI" | CAN_THEM_MOI | Endpoint riêng |
| 7 | Rule lấy thuốc thay thế đã duyệt | CAN_THEM_MOI | Truy vấn `goi_y_thuoc_thay_the` |
| 8 | FE 8 form chuyên khoa | CAN_DIEU_CHINH | Thay `SPECIALTY_FIELDS` hard-code bằng component động |
| 9 | FE nút "Xem giải thích AI" | CAN_THEM_MOI | Button + panel trong cảnh báo |
| 10 | FE CRUD gợi ý thuốc thay thế | CAN_THEM_MOI | Trang Admin quản lý |
| 11 | API response bổ sung `chuyenKhoaId`/`tenChuyenKhoa` | CAN_DIEU_CHINH | Visit response trả thêm chuyên khoa |
| 12 | `SaveExaminationDto.specialtyContent` | CAN_DIEU_CHINH | Validate theo chuyên khoa thay vì `@IsObject()` |

---

## 5. Kiến trúc AI gợi ý thuốc

```text
Bác sĩ chọn thuốc
        ↓
FE gửi saveDraft / complete
        ↓
Backend ExaminationsService.save()
        ↓
PrescriptionSafetyService.refreshWarnings()
  → kiểm tra dị ứng (DiUngBenhNhan ↔ Thuoc/HoatChat)
  → kiểm tra trùng hoạt chất (ThuocHoatChat)
  → kiểm tra tồn kho (LoThuoc)
  → kiểm tra hết hạn (LoThuoc.hanDung)
  → kiểm tra thiếu liều/hướng dẫn
  → lưu CanhBaoDonThuoc (nguon: QUY_TAC_HE_THONG)
        ↓
Nếu có cảnh báo dị ứng/hết thuốc:
  → truy vấn GoiYThuocThayThe (đã duyệt, còn hiệu lực)
  → gắn danh sách gợi ý vào response
        ↓
FE hiển thị cảnh báo + danh sách thuốc thay thế
  → Nút "Xem giải thích AI" (tùy chọn)
        ↓
Bác sĩ bấm nút
  → FE gọi GET /examinations/visit/:visitId/ai-explain?warningId=X
  → Backend lấy dữ liệu đã kiểm tra:
    {
      canhBao, thuocDangChon, hoatChat,
      goiYDaDuyet, chanDoan, chuyenKhoa,
      duLieuChuyenKhoa (field cần thiết)
    }
  → GeminiService.chat() với prompt giới hạn
  → Trả text diễn giải
  → Lưu LanChayAI (tacVu: CANH_BAO_THUOC)
        ↓
FE hiển thị diễn giải ngắn
Gemini lỗi → hiển thị "Chưa thể tải diễn giải AI"
        ↓
Bác sĩ tự quyết định giữ/đổi/bỏ qua
```

### Nguyên tắc tuyệt đối

- Gemini **không** tự kê đơn, không tự thêm thuốc vào đơn.
- Gemini **không** tự đưa liều dùng.
- Gemini **không** tự tìm thuốc ngoài Database.
- Gemini **không** truy cập Prisma trực tiếp.
- Gemini **chỉ** diễn giải dữ liệu Backend đã kiểm tra.
- Gemini lỗi → Rule-based vẫn hoạt động bình thường, UI hiển thị cảnh báo rule-based đầy đủ.

---

## 6. Thiết kế `goi_y_thuoc_thay_the`

### 6.1. Prisma model

```prisma
model GoiYThuocThayThe {
  id                  Int            @id @default(autoincrement())
  thuocCanTranhId     Int?           @map("thuoc_can_tranh_id")
  hoatChatCanTranhId  Int?           @map("hoat_chat_can_tranh_id")
  thuocThayTheId      Int            @map("thuoc_thay_the_id")
  ghiChuChuyenMon     String?        @map("ghi_chu_chuyen_mon") @db.Text
  trangThai           TrangThaiChung @default(DANG_HOAT_DONG) @map("trang_thai")
  nguoiDuyetId        Int            @map("nguoi_duyet_id")
  ngayHieuLuc         DateTime       @map("ngay_hieu_luc") @db.Date
  createdAt           DateTime       @default(now()) @map("created_at")
  updatedAt           DateTime       @updatedAt @map("updated_at")

  thuocCanTranh       Thuoc?         @relation("ThuocCanTranh", fields: [thuocCanTranhId], references: [id], onDelete: Restrict)
  hoatChatCanTranh    HoatChat?      @relation("HoatChatCanTranh", fields: [hoatChatCanTranhId], references: [id], onDelete: Restrict)
  thuocThayThe        Thuoc          @relation("ThuocThayThe", fields: [thuocThayTheId], references: [id], onDelete: Restrict)
  nguoiDuyet          NguoiDung      @relation("NguoiDuyetGoiY", fields: [nguoiDuyetId], references: [id], onDelete: Restrict)

  @@index([thuocCanTranhId])
  @@index([hoatChatCanTranhId])
  @@index([thuocThayTheId])
  @@index([trangThai, ngayHieuLuc])
  @@map("goi_y_thuoc_thay_the")
}
```

### 6.2. Constraint

- Ít nhất một trong `thuocCanTranhId` hoặc `hoatChatCanTranhId` phải có giá trị — validate ở DTO, không dùng DB constraint.
- `thuocThayTheId` khác `thuocCanTranhId`.
- Không lưu liều dùng, số ngày dùng hoặc chỉ định bắt buộc.

### 6.3. Quan hệ Prisma bổ sung

Thêm relation vào model `Thuoc`:

```prisma
goiYCanTranh   GoiYThuocThayThe[] @relation("ThuocCanTranh")
goiYThayThe    GoiYThuocThayThe[] @relation("ThuocThayThe")
```

Thêm relation vào model `HoatChat`:

```prisma
goiYCanTranh   GoiYThuocThayThe[] @relation("HoatChatCanTranh")
```

Thêm relation vào model `NguoiDung`:

```prisma
goiYThuocDaDuyet GoiYThuocThayThe[] @relation("NguoiDuyetGoiY")
```

### 6.4. Quyền cấu hình/duyệt

- ADMIN: toàn quyền CRUD.
- DOCTOR: có thể xem và đề xuất, ADMIN duyệt.
- Vai trò khác: không truy cập.

---

## 7. Thiết kế `chi_tiet_kham_chuyen_khoa`

### 7.1. Prisma model

```prisma
model ChiTietKhamChuyenKhoa {
  id           Int        @id @default(autoincrement())
  hoSoKhamId   Int        @unique @map("ho_so_kham_id")
  chuyenKhoaId Int        @map("chuyen_khoa_id")
  duLieu       Json       @map("du_lieu")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  hoSoKham     HoSoKham   @relation(fields: [hoSoKhamId], references: [id], onDelete: Cascade)
  chuyenKhoa   ChuyenKhoa @relation(fields: [chuyenKhoaId], references: [id], onDelete: Restrict)

  @@index([chuyenKhoaId])
  @@map("chi_tiet_kham_chuyen_khoa")
}
```

### 7.2. Quan hệ bổ sung

Thêm vào `HoSoKham`:

```prisma
chiTietChuyenKhoa ChiTietKhamChuyenKhoa?
```

Thêm vào `ChuyenKhoa`:

```prisma
chiTietKham ChiTietKhamChuyenKhoa[]
```

### 7.3. `hoSoKhamId` là `@unique`

Mỗi hồ sơ khám chỉ có một bản ghi chuyên khoa. Quan hệ 1-1.

### 7.4. Xử lý `noiDungChuyenKhoa` cũ

- Migration mới sẽ tạo bảng `chi_tiet_kham_chuyen_khoa`.
- **Không** xóa ngay cột `noi_dung_chuyen_khoa` trong `ho_so_kham` — giữ lại để backward compatible.
- Backend mới ưu tiên đọc/ghi từ `chi_tiet_kham_chuyen_khoa`; fallback đọc `noiDungChuyenKhoa` cũ cho hồ sơ chưa chuyển.
- Đợt sau mới migration drop cột cũ khi đã chắc chắn không còn cần.

---

## 8. Cấu trúc JSONB của 8 khoa

Mỗi khoa 6–10 field đặc thù. Không lưu trùng sinh hiệu, lý do khám, chẩn đoán, ICD-10, dị ứng.

### 8.1. Nội tổng quát (`NOI_TONG_QUAT`)

```json
{
  "tinhTrangChung": "string",
  "trieuChungChinh": "string",
  "trieuChungPhu": "string",
  "viTriDau": "string",
  "mucDoDau": "number (0-10)",
  "tienSuDungThuoc": "string",
  "khamBungNguc": "string",
  "ketQuaXetNghiem": "string"
}
```

### 8.2. Nhi khoa (`NHI_KHOA`)

```json
{
  "canNang": "number (kg)",
  "chieuCao": "number (cm)",
  "chuViVong": "number (cm)",
  "tinhTrangDinhDuong": "string",
  "tiemChung": "string",
  "phatTrienVanDong": "string",
  "trieuChungTre": "string",
  "loaiSua": "string"
}
```

### 8.3. Cơ Xương Khớp (`CO_XUONG_KHOP`)

```json
{
  "viTriDau": "string",
  "mucDoDau": "number (0-10)",
  "khaNangVanDong": "string",
  "suLienKhop": "string",
  "testDacBiet": "string",
  "tienSuChanThuong": "string",
  "ketQuaXQuang": "string"
}
```

### 8.4. Mắt (`MAT`)

```json
{
  "thiLucMatTrai": "string",
  "thiLucMatPhai": "string",
  "nhanAp": "string",
  "khamDayMat": "string",
  "khamKhucXa": "string",
  "testSacGiac": "string",
  "ghiChuKham": "string"
}
```

### 8.5. Da liễu (`DA_LIEU`)

```json
{
  "viTriTonThuong": "string",
  "dacDiemTonThuong": "string",
  "kichThuoc": "string",
  "mucDoNgua": "number (0-10)",
  "thoiGianXuatHien": "string",
  "yeuToKhoiPhat": "string",
  "tienSuDiUngDa": "string"
}
```

### 8.6. Tim mạch (`TIM_MACH`)

```json
{
  "spO2": "number (%)",
  "dacDiemDauNguc": "string",
  "ketQuaDienTim": "string",
  "tiengTimBatThuong": "string",
  "phuNgoaiVi": "string",
  "yeuToNguyCo": "string",
  "tienSuTimMach": "string",
  "ketQuaSieuAm": "string"
}
```

### 8.7. Sản Phụ khoa (`SAN_PHU_KHOA`)

```json
{
  "ngayDauKyKinhCuoi": "string (dd/mm/yyyy)",
  "tuanThai": "number",
  "tienSuSanKhoa": "string",
  "soLanMangThai": "number",
  "soLanSinhCon": "number",
  "ketQuaSieuAm": "string",
  "trieuChungSanPhu": "string",
  "ghiChuSanKhoa": "string"
}
```

### 8.8. Tai Mũi Họng (`TAI_MUI_HONG`)

```json
{
  "viTriTrieuChung": "string",
  "ketQuaNoiSoi": "string",
  "mucDoNghe": "string",
  "testThinhLuc": "string",
  "tinhTrangAmigdal": "string",
  "tinhTrangXoangMui": "string",
  "ghiChuKham": "string"
}
```

---

## 9. DTO + Class Validator cho từng khoa

Tạo file DTO trong `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/`:

### 9.1. Ví dụ `du-lieu-kham-mat.dto.ts`

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DuLieuKhamMatDto {
  @IsOptional() @IsString() @MaxLength(50) thiLucMatTrai?: string;
  @IsOptional() @IsString() @MaxLength(50) thiLucMatPhai?: string;
  @IsOptional() @IsString() @MaxLength(50) nhanAp?: string;
  @IsOptional() @IsString() @MaxLength(200) khamDayMat?: string;
  @IsOptional() @IsString() @MaxLength(200) khamKhucXa?: string;
  @IsOptional() @IsString() @MaxLength(200) testSacGiac?: string;
  @IsOptional() @IsString() @MaxLength(500) ghiChuKham?: string;
}
```

### 9.2. Danh sách DTO

| File | Class |
|------|-------|
| `du-lieu-kham-noi-tong-quat.dto.ts` | `DuLieuKhamNoiTongQuatDto` |
| `du-lieu-kham-nhi-khoa.dto.ts` | `DuLieuKhamNhiKhoaDto` |
| `du-lieu-kham-co-xuong-khop.dto.ts` | `DuLieuKhamCoXuongKhopDto` |
| `du-lieu-kham-mat.dto.ts` | `DuLieuKhamMatDto` |
| `du-lieu-kham-da-lieu.dto.ts` | `DuLieuKhamDaLieuDto` |
| `du-lieu-kham-tim-mach.dto.ts` | `DuLieuKhamTimMachDto` |
| `du-lieu-kham-san-phu-khoa.dto.ts` | `DuLieuKhamSanPhuKhoaDto` |
| `du-lieu-kham-tai-mui-hong.dto.ts` | `DuLieuKhamTaiMuiHongDto` |

### 9.3. DTO tổng cho API chuyên khoa

```typescript
// save-specialty-exam.dto.ts
import { IsInt, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveSpecialtyExamDto {
  @IsInt() hoSoKhamId: number;
  @IsObject() duLieu: Record<string, unknown>; // Backend sẽ validate theo chuyên khoa thật
}
```

Backend **không** tin `chuyenKhoaId` do FE gửi — xem mục 10.

---

## 10. Cách xác định chuyên khoa an toàn từ Backend

```text
1. FE gửi { hoSoKhamId, duLieu } (KHÔNG gửi chuyenKhoaId)
2. Backend đọc:
   hoSoKham → luotKham → chuyenKhoaId
3. Backend lấy maChuyenKhoa từ ChuyenKhoa.id
4. Backend map maChuyenKhoa → DTO class tương ứng:
   101 → DuLieuKhamNoiTongQuatDto
   102 → DuLieuKhamNhiKhoaDto
   103 → DuLieuKhamDaLieuDto
   104 → DuLieuKhamTimMachDto
   105 → DuLieuKhamTaiMuiHongDto
   106 → DuLieuKhamSanPhuKhoaDto
   107 → DuLieuKhamMatDto
   108 → DuLieuKhamCoXuongKhopDto
5. Validate duLieu bằng class-transformer + class-validator
6. Nếu pass → lưu vào chi_tiet_kham_chuyen_khoa.du_lieu
7. Nếu fail → trả 400 với chi tiết lỗi
```

Triển khai bằng một map:

```typescript
const SPECIALTY_DTO_MAP: Record<string, new () => object> = {
  '101': DuLieuKhamNoiTongQuatDto,
  '102': DuLieuKhamNhiKhoaDto,
  '103': DuLieuKhamDaLieuDto,
  '104': DuLieuKhamTimMachDto,
  '105': DuLieuKhamTaiMuiHongDto,
  '106': DuLieuKhamSanPhuKhoaDto,
  '107': DuLieuKhamMatDto,
  '108': DuLieuKhamCoXuongKhopDto,
};
```

Backend dùng `plainToInstance()` + `validateSync()` / `validateOrReject()` để kiểm tra.

---

## 11. Cách lấy dữ liệu chuyên khoa làm context cho Gemini

```text
Khi bác sĩ bấm "Xem giải thích AI" cho một cảnh báo:

1. Lấy warningId
2. Từ CanhBaoDonThuoc → donThuocId → hoSoKhamId → luotKhamId
3. Từ luotKham → chuyenKhoaId → chuyenKhoa.tenChuyenKhoa
4. Từ hoSoKham → chiTietChuyenKhoa.duLieu (nếu có)
5. Lọc chỉ các field chuyên khoa liên quan:
   - Nếu MAT: chỉ lấy thiLucMatTrai, thiLucMatPhai
   - Nếu TIM_MACH: chỉ lấy spO2, dacDiemDauNguc
   - Không gửi toàn bộ JSONB cho Gemini
6. Kết hợp với:
   - canhBao.tieuDe + canhBao.noiDung
   - thuocDangChon (tenThuoc, hoatChat)
   - goiYDaDuyet (từ GoiYThuocThayThe)
   - chanDoan + ICD-10
   - dị ứng bệnh nhân
7. Tạo prompt Gemini với giới hạn:
   - Giải thích ngắn lý do cảnh báo bằng tiếng Việt
   - Chỉ nhắc thuốc trong goiYDaDuyet
   - Luôn ghi "thông tin tham khảo cho bác sĩ"
   - KHÔNG tạo thêm tên thuốc, liều dùng
8. Gọi GeminiService.chat()
9. Lưu LanChayAI (tacVu: CANH_BAO_THUOC)
10. Trả response text cho FE
```

---

## 12. Frontend cần tạo/sửa gì

### 12.1. Module `kham-chuyen-khoa` (mới)

```text
FE/src/modules/kham-benh/components/kham-chuyen-khoa/
├── KhamChuyenKhoa.tsx          (container chính, chọn form theo khoa)
├── KhamNoiTongQuat.tsx
├── KhamNhiKhoa.tsx
├── KhamCoXuongKhop.tsx
├── KhamMat.tsx
├── KhamDaLieu.tsx
├── KhamTimMach.tsx
├── KhamSanPhuKhoa.tsx
├── KhamTaiMuiHong.tsx
└── specialty-exam.types.ts     (interface cho 8 khoa)
```

### 12.2. Trang Admin gợi ý thuốc thay thế (mới)

```text
FE/src/modules/thuoc/pages/admin/TrangGoiYThuocThayThe.tsx
FE/src/modules/thuoc/api/goi-y-thuoc.api.ts
FE/src/modules/thuoc/types/goi-y-thuoc.types.ts
```

### 12.3. File sửa

| File | Sửa gì |
|------|--------|
| `TrangKhamBenh.tsx` | Thay `SPECIALTY_FIELDS` hard-code bằng `<KhamChuyenKhoa />` component; enable hiển thị theo chuyên khoa thật từ visit response |
| `examination.api.ts` | Thêm endpoint `getAiExplanation(visitId, warningId)` |
| `examination.types.ts` | Thêm type cho AI explanation response |
| `AppRouter.tsx` | Thêm route Admin gợi ý thuốc thay thế |
| Sidebar Admin | Thêm menu "Gợi ý thuốc thay thế" |

---

## 13. Backend cần tạo/sửa gì

### 13.1. Module `goi-y-thuoc` (mới)

```text
BE/src/modules/goi-y-thuoc/
├── dto/
│   ├── create-goi-y-thuoc.dto.ts
│   └── update-goi-y-thuoc.dto.ts
├── repositories/
│   ├── goi-y-thuoc.repository.interface.ts
│   └── prisma-goi-y-thuoc.repository.ts
├── goi-y-thuoc.controller.ts
├── goi-y-thuoc.service.ts
└── goi-y-thuoc.module.ts
```

### 13.2. DTO khám chuyên khoa (mới)

```text
BE/src/modules/kham-benh/dto/kham-chuyen-khoa/
├── du-lieu-kham-noi-tong-quat.dto.ts
├── du-lieu-kham-nhi-khoa.dto.ts
├── du-lieu-kham-co-xuong-khop.dto.ts
├── du-lieu-kham-mat.dto.ts
├── du-lieu-kham-da-lieu.dto.ts
├── du-lieu-kham-tim-mach.dto.ts
├── du-lieu-kham-san-phu-khoa.dto.ts
├── du-lieu-kham-tai-mui-hong.dto.ts
└── specialty-dto-map.ts   (map mã khoa → DTO class)
```

### 13.3. Service diễn giải AI (mới)

```text
BE/src/modules/kham-benh/prescription-ai-explain.service.ts
```

Sử dụng `GeminiService.chat()` từ `integrations/gemini`. Không tạo Gemini service mới.

### 13.4. File sửa Backend

| File | Sửa gì |
|------|--------|
| `schema.prisma` | Thêm 2 model mới + relation |
| `examinations.controller.ts` | Thêm endpoint AI explain + specialty exam |
| `examinations.service.ts` | Thêm logic validate/lưu chuyên khoa; bổ sung `chuyenKhoa` vào visit response |
| `examination.repository.interface.ts` | Thêm method cho specialty exam |
| `prisma-examination.repository.ts` | Implement specialty exam persistence |
| `prescription-safety.service.ts` | Thêm truy vấn `GoiYThuocThayThe` sau khi phát hiện cảnh báo |
| `examinations.module.ts` | Import GeminiModule, GoiYThuocModule |
| `app.module.ts` | Đăng ký GoiYThuocModule |

---

## 14. Prisma/Database/Migration cần gì

### 14.1. Migration mới

Tên: `20260814_them_kham_chuyen_khoa_va_goi_y_thuoc`

Nội dung:

```sql
-- 1. Tạo bảng chi_tiet_kham_chuyen_khoa
CREATE TABLE "chi_tiet_kham_chuyen_khoa" (
  "id" SERIAL PRIMARY KEY,
  "ho_so_kham_id" INTEGER NOT NULL UNIQUE,
  "chuyen_khoa_id" INTEGER NOT NULL,
  "du_lieu" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chi_tiet_kham_chuyen_khoa_ho_so_kham_id_fkey"
    FOREIGN KEY ("ho_so_kham_id") REFERENCES "ho_so_kham"("id") ON DELETE CASCADE,
  CONSTRAINT "chi_tiet_kham_chuyen_khoa_chuyen_khoa_id_fkey"
    FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT
);
CREATE INDEX "chi_tiet_kham_chuyen_khoa_chuyen_khoa_id_idx"
  ON "chi_tiet_kham_chuyen_khoa"("chuyen_khoa_id");

-- 2. Tạo bảng goi_y_thuoc_thay_the
CREATE TABLE "goi_y_thuoc_thay_the" (
  "id" SERIAL PRIMARY KEY,
  "thuoc_can_tranh_id" INTEGER,
  "hoat_chat_can_tranh_id" INTEGER,
  "thuoc_thay_the_id" INTEGER NOT NULL,
  "ghi_chu_chuyen_mon" TEXT,
  "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
  "nguoi_duyet_id" INTEGER NOT NULL,
  "ngay_hieu_luc" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "goi_y_thuoc_thay_the_thuoc_can_tranh_id_fkey"
    FOREIGN KEY ("thuoc_can_tranh_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT,
  CONSTRAINT "goi_y_thuoc_thay_the_hoat_chat_can_tranh_id_fkey"
    FOREIGN KEY ("hoat_chat_can_tranh_id") REFERENCES "hoat_chat"("id") ON DELETE RESTRICT,
  CONSTRAINT "goi_y_thuoc_thay_the_thuoc_thay_the_id_fkey"
    FOREIGN KEY ("thuoc_thay_the_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT,
  CONSTRAINT "goi_y_thuoc_thay_the_nguoi_duyet_id_fkey"
    FOREIGN KEY ("nguoi_duyet_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT
);
CREATE INDEX "goi_y_thuoc_thay_the_thuoc_can_tranh_id_idx"
  ON "goi_y_thuoc_thay_the"("thuoc_can_tranh_id");
CREATE INDEX "goi_y_thuoc_thay_the_hoat_chat_can_tranh_id_idx"
  ON "goi_y_thuoc_thay_the"("hoat_chat_can_tranh_id");
CREATE INDEX "goi_y_thuoc_thay_the_thuoc_thay_the_id_idx"
  ON "goi_y_thuoc_thay_the"("thuoc_thay_the_id");
CREATE INDEX "goi_y_thuoc_thay_the_trang_thai_ngay_hieu_luc_idx"
  ON "goi_y_thuoc_thay_the"("trang_thai", "ngay_hieu_luc");
```

### 14.2. Tổng table mới: 2

- `chi_tiet_kham_chuyen_khoa`
- `goi_y_thuoc_thay_the`

### 14.3. Migration: 1

Một migration duy nhất tạo cả 2 bảng.

---

## 15. Service/Repository hiện tại được tái sử dụng

| Service/Module | Tái sử dụng cho | Cách dùng |
|---------------|-----------------|-----------|
| `GeminiService` (`integrations/gemini`) | Diễn giải AI cảnh báo | `chat()` với prompt giới hạn |
| `PrescriptionSafetyService` | Gắn gợi ý thuốc thay thế | Mở rộng `refreshWarnings()` để truy vấn `GoiYThuocThayThe` |
| `RealtimeService` | Thông báo realtime | Không cần thêm event mới |
| `ThongBaoService` | Push thông báo | Giữ nguyên |
| `AuditLogsService` | Log xử lý cảnh báo AI | Giữ nguyên |
| `ExaminationsService` | Validate + lưu chuyên khoa | Mở rộng `save()` / `saveByVisit()` |
| `PrismaExaminationRepository` | Đọc/ghi `chi_tiet_kham_chuyen_khoa` | Thêm method mới |
| `LanChayAI` model | Lưu nhật ký gọi Gemini | Tái sử dụng `tacVu: CANH_BAO_THUOC` |

---

## 16. Danh sách file Codex phải tạo/sửa

### File tạo mới

| File | Chức năng | Lý do |
|------|----------|-------|
| `BE/prisma/migrations/2026XXXX_them_kham_chuyen_khoa_va_goi_y_thuoc/migration.sql` | Migration tạo 2 bảng | Database chưa có |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-noi-tong-quat.dto.ts` | DTO Nội tổng quát | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-nhi-khoa.dto.ts` | DTO Nhi khoa | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-co-xuong-khop.dto.ts` | DTO Cơ xương khớp | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-mat.dto.ts` | DTO Mắt | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-da-lieu.dto.ts` | DTO Da liễu | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-tim-mach.dto.ts` | DTO Tim mạch | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-san-phu-khoa.dto.ts` | DTO Sản phụ khoa | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/du-lieu-kham-tai-mui-hong.dto.ts` | DTO Tai mũi họng | Validate JSONB |
| `BE/src/modules/kham-benh/dto/kham-chuyen-khoa/specialty-dto-map.ts` | Map mã khoa → DTO | Xác định chuyên khoa an toàn |
| `BE/src/modules/kham-benh/prescription-ai-explain.service.ts` | Gemini diễn giải cảnh báo | AI gợi ý thuốc |
| `BE/src/modules/goi-y-thuoc/dto/create-goi-y-thuoc.dto.ts` | DTO tạo gợi ý | CRUD gợi ý thuốc |
| `BE/src/modules/goi-y-thuoc/dto/update-goi-y-thuoc.dto.ts` | DTO sửa gợi ý | CRUD gợi ý thuốc |
| `BE/src/modules/goi-y-thuoc/repositories/goi-y-thuoc.repository.interface.ts` | Repository interface | Kiến trúc chuẩn |
| `BE/src/modules/goi-y-thuoc/repositories/prisma-goi-y-thuoc.repository.ts` | Repository Prisma | Persistence |
| `BE/src/modules/goi-y-thuoc/goi-y-thuoc.controller.ts` | Controller CRUD | API quản trị |
| `BE/src/modules/goi-y-thuoc/goi-y-thuoc.service.ts` | Service nghiệp vụ | Logic duyệt |
| `BE/src/modules/goi-y-thuoc/goi-y-thuoc.module.ts` | NestJS module | Đăng ký DI |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamChuyenKhoa.tsx` | Container chọn form khoa | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamNoiTongQuat.tsx` | Form Nội tổng quát | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamNhiKhoa.tsx` | Form Nhi khoa | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamCoXuongKhop.tsx` | Form Cơ xương khớp | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamMat.tsx` | Form Mắt | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamDaLieu.tsx` | Form Da liễu | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamTimMach.tsx` | Form Tim mạch | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamSanPhuKhoa.tsx` | Form Sản phụ khoa | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/KhamTaiMuiHong.tsx` | Form Tai mũi họng | FE component |
| `FE/src/modules/kham-benh/components/kham-chuyen-khoa/specialty-exam.types.ts` | Type definition | FE type |
| `FE/src/modules/thuoc/pages/admin/TrangGoiYThuocThayThe.tsx` | Trang Admin CRUD gợi ý | FE page |
| `FE/src/modules/thuoc/api/goi-y-thuoc.api.ts` | API client gợi ý | FE API |
| `FE/src/modules/thuoc/types/goi-y-thuoc.types.ts` | Type gợi ý | FE type |

### File sửa

| File | Sửa gì | Lý do |
|------|--------|-------|
| `BE/prisma/schema.prisma` | Thêm 2 model + relation mới | Database |
| `BE/src/modules/kham-benh/examinations.controller.ts` | Thêm endpoint AI explain | API mới |
| `BE/src/modules/kham-benh/examinations.service.ts` | Validate chuyên khoa + bổ sung chuyên khoa vào visit response | Kiến trúc |
| `BE/src/modules/kham-benh/examinations.module.ts` | Import GeminiModule, GoiYThuocModule | DI |
| `BE/src/modules/kham-benh/repositories/examination.repository.interface.ts` | Thêm method specialty exam | Interface |
| `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts` | Implement đọc/ghi chi_tiet_kham_chuyen_khoa | Persistence |
| `BE/src/modules/kham-benh/prescription-safety.service.ts` | Truy vấn gợi ý thuốc thay thế khi có cảnh báo | Rule-based mở rộng |
| `BE/src/modules/kham-benh/dto/save-examination.dto.ts` | Không cần sửa `specialtyContent` ở đây — vẫn nhận `@IsObject()` | Backward compat |
| `BE/src/app.module.ts` | Đăng ký GoiYThuocModule | DI |
| `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx` | Thay SPECIALTY_FIELDS bằng KhamChuyenKhoa; thêm nút AI explain | UI refactor |
| `FE/src/modules/kham-benh/api/examination.api.ts` | Thêm `getAiExplanation()` | API mới |
| `FE/src/modules/kham-benh/types/examination.types.ts` | Thêm type AI explanation | Type mới |
| `FE/src/routes/AppRouter.tsx` | Thêm route TrangGoiYThuocThayThe | Routing |

---

## 17. Thứ tự Codex triển khai

### Bước 1: Database + Prisma

- Thêm 2 model Prisma (`GoiYThuocThayThe`, `ChiTietKhamChuyenKhoa`) + relation.
- Tạo migration.
- `npx prisma generate`.
- `npx prisma validate`.
- **Chưa chạy `migrate deploy`** — chờ sau khi code Backend xong.

### Bước 2: Backend DTO khám chuyên khoa

- Tạo 8 DTO class + `specialty-dto-map.ts`.
- Tạo function validate JSONB theo chuyên khoa.
- Unit test: validate đúng khoa / sai khoa / field lạ.

### Bước 3: Backend khám chuyên khoa service + repository

- Mở rộng `ExaminationsService` để ghi/đọc `chi_tiet_kham_chuyen_khoa`.
- Mở rộng repository interface + Prisma implementation.
- Bổ sung `chuyenKhoaId` + `tenChuyenKhoa` vào visit response.
- Backward compatible: nếu chưa có `chi_tiet_kham_chuyen_khoa`, đọc `noiDungChuyenKhoa`.

### Bước 4: Backend module `goi-y-thuoc`

- CRUD đầy đủ: Controller, Service, Repository.
- DTO validate: phải có `thuocCanTranhId` HOẶC `hoatChatCanTranhId`.
- Quyền: ADMIN.

### Bước 5: Backend Rule-based + gợi ý thuốc thay thế

- Mở rộng `PrescriptionSafetyService.refreshWarnings()`:
  - Khi phát hiện cảnh báo dị ứng hoặc hết thuốc → query `GoiYThuocThayThe`.
  - Gắn danh sách gợi ý vào response `CanhBaoDonThuoc`.
- Thêm field `suggestions` vào response cảnh báo.

### Bước 6: Backend Gemini diễn giải

- Tạo `PrescriptionAiExplainService`.
- Endpoint: `GET /examinations/visit/:visitId/ai-explain?warningId=X`.
- Prompt giới hạn theo hướng dẫn.
- Lưu `LanChayAI`.
- Fallback khi Gemini lỗi.

### Bước 7: FE 8 form chuyên khoa

- Tạo 8 component + container `KhamChuyenKhoa`.
- Sửa `TrangKhamBenh.tsx`: thay `SPECIALTY_FIELDS` bằng `<KhamChuyenKhoa />`.
- Hiển thị form theo `chuyenKhoaId` từ visit response.

### Bước 8: FE gợi ý thuốc thay thế + AI explain

- Trang Admin CRUD gợi ý thuốc: `TrangGoiYThuocThayThe.tsx`.
- Thêm nút "Xem giải thích AI" vào panel cảnh báo trong `TrangKhamBenh.tsx`.
- Hiển thị thuốc thay thế khi có cảnh báo.
- Xử lý Gemini lỗi: hiển thị "Chưa thể tải diễn giải AI. Cảnh báo an toàn vẫn có hiệu lực."

### Bước 9: Migration + Test + Regression

- Chạy `npx prisma migrate deploy`.
- Build BE + FE.
- Test regression toàn bộ flow cũ.

---

## 18. Test bắt buộc

### 18.1. Khám chuyên khoa

| Test | Mô tả |
|------|-------|
| Lưu JSONB đúng khoa | Bác sĩ Mắt gửi `DuLieuKhamMatDto` → lưu thành công |
| Validate sai chuyên khoa | Bác sĩ Mắt gửi field của Tim mạch → reject field lạ |
| Field lạ | Gửi field không có trong DTO → bị loại bỏ |
| Quyền bác sĩ | Bác sĩ A không sửa được hồ sơ bác sĩ B |
| Đọc lại JSONB | Tải lại trang → form chuyên khoa hiển thị đúng dữ liệu đã lưu |
| Backward compat | Hồ sơ cũ có `noiDungChuyenKhoa` → vẫn hiển thị được |
| Empty state | Khoa Nội tổng quát nhưng không nhập field chuyên khoa → lưu được |

### 18.2. Gợi ý thuốc thay thế

| Test | Mô tả |
|------|-------|
| CRUD gợi ý | Admin tạo/sửa/xóa gợi ý → DB đúng |
| Gợi ý hiện khi dị ứng | Bệnh nhân dị ứng Amoxicillin → hiện Azithromycin đã duyệt |
| Gợi ý theo hoạt chất | Cảnh báo hoạt chất → hiện thuốc thay thế theo hoạt chất |
| Chưa có gợi ý | Cảnh báo dị ứng nhưng chưa cấu hình thay thế → cảnh báo vẫn hiện, không có gợi ý |
| Gợi ý hết hạn | `ngayHieuLuc` tương lai → chưa hiện |
| Gợi ý ngừng hoạt động | `trangThai = NGUNG_HOAT_DONG` → không hiện |

### 18.3. Gemini diễn giải

| Test | Mô tả |
|------|-------|
| Gemini trả lời hợp lệ | Hiển thị diễn giải ngắn, có ghi "thông tin tham khảo" |
| Gemini lỗi/timeout | Hiển thị "Chưa thể tải diễn giải AI. Cảnh báo an toàn vẫn có hiệu lực." |
| Gemini không tự tạo thuốc | Response chỉ nhắc thuốc trong `goiYDaDuyet` |
| LanChayAI được lưu | Sau mỗi lần gọi → có bản ghi trong `lan_chay_ai` |
| Không có Gemini key | Nút AI bị disable hoặc ẩn; rule-based vẫn hoạt động |

### 18.4. Regression flow cũ

| Test | Mô tả |
|------|-------|
| Kê đơn bình thường | Bác sĩ kê đơn không dị ứng → hoàn tất → chuyển Dược |
| Cảnh báo dị ứng cũ | Bệnh nhân dị ứng → cảnh báo NGHIEM_TRONG → phải xử lý trước hoàn tất |
| Auto-save nháp | Vẫn tự lưu sau 4 giây |
| Dược sĩ cấp thuốc | Đơn chuyển sang → Dược sĩ cấp FEFO → tồn kho giảm |
| Lễ tân check-in | Flow check-in → hàng chờ → vào phòng |
| Thanh toán | Hóa đơn tạo đúng → thanh toán |
| Realtime | Event đơn thuốc mới → Dược sĩ nhận |

---

## 19. Rủi ro cần tránh

| # | Rủi ro | Cách phòng |
|---|--------|-----------|
| 1 | Regression kê đơn | Không sửa logic `save()` / `saveByVisit()` hiện tại; chỉ mở rộng |
| 2 | FE gửi `chuyenKhoaId` giả | Backend luôn đọc từ `luotKham.chuyenKhoaId` |
| 3 | JSONB không validate | Validate bằng DTO trước khi lưu |
| 4 | Gemini tự kê thuốc | Prompt cứng; response chỉ text; không có endpoint tự thêm thuốc |
| 5 | Gemini truy cập Prisma | `PrescriptionAiExplainService` chỉ gửi dữ liệu đã lọc cho `GeminiService.chat()` |
| 6 | Migration lỗi | Không drop cột cũ `noiDungChuyenKhoa` trong migration này |
| 7 | Thiếu seed gợi ý thuốc | Tạo script seed ít nhất 3–5 bản ghi mẫu |
| 8 | `specialtyContent` cũ mất dữ liệu | Backward compat: đọc `noiDungChuyenKhoa` nếu chưa có `chi_tiet_kham_chuyen_khoa` |
| 9 | Performance Gemini | Timeout 30s; nút AI chỉ gọi khi bác sĩ bấm; không auto-call |
| 10 | Gợi ý thuốc trùng thuốc dị ứng | Rule-based phải loại thuốc thay thế nếu bệnh nhân cũng dị ứng thuốc đó |

---

## 20. Kết luận và checklist cho Codex

### Checklist trước khi code

- [ ] Đọc `RULE.md` → tuân thủ kiến trúc Controller → Service → Repository → Prisma
- [ ] Đọc `Huong_dan_Gemini_goi_y_thuoc.md` → Gemini chỉ diễn giải, không kê đơn
- [ ] Xác nhận 8 chuyên khoa đã seed trong DB
- [ ] Xác nhận `GeminiService` + `LanChayAI` + `NguonCanhBao.AI_GEMINI` sẵn có

### Checklist sau mỗi bước

- [ ] `npx prisma validate` PASS
- [ ] `npm run build` (BE) PASS
- [ ] `npm run build` (FE) PASS
- [ ] Flow cũ (kê đơn → cảnh báo → hoàn tất → Dược sĩ) không bị ảnh hưởng
- [ ] Quy tắc đặt tên tiếng Việt không dấu cho module/component nghiệp vụ

### Tổng kết số liệu

| Hạng mục | Số lượng |
|----------|---------|
| Table mới | 2 (`chi_tiet_kham_chuyen_khoa`, `goi_y_thuoc_thay_the`) |
| Migration | 1 |
| Phần source tái sử dụng | 8 (GeminiService, PrescriptionSafetyService, RealtimeService, ThongBaoService, AuditLogsService, ExaminationsService, LanChayAI, CanhBaoDonThuoc) |
| Component khám chuyên khoa mới | 9 (8 form + 1 container) |
| File Codex tạo mới | ~32 |
| File Codex sửa | ~13 |
| Tổng file | ~45 |
| Bước triển khai Codex | 9 |

### Blocker trước khi code

**Không có blocker nghiêm trọng.** Tất cả infrastructure cần thiết (Gemini, cảnh báo, thuốc, hoạt chất, dị ứng, chuyên khoa) đã sẵn có trong source. Chỉ cần thêm 2 bảng mới và mở rộng logic.
