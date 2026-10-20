# 🔍 ĐÁNH GIÁ V19 — Phân tích lỗi Lịch trực đêm & Hồ sơ bệnh nhân

> **Ngày phân tích**: 16/08/2026
> **Phạm vi**: Phân lịch trực đêm (Bác sĩ / Dược sĩ / Thu ngân) + Hồ sơ bệnh nhân Trưởng khoa

---

## 📋 Tóm tắt 4 vấn đề

| # | Vấn đề | Mức độ | Nguyên nhân gốc |
|---|--------|--------|-----------------|
| 1 | "Tự động xếp lịch" không random, báo lỗi "đã xếp" | 🟡 Logic FE | Pattern cố định khi ≥5 BS, không clear data cũ trước khi xếp |
| 2 | Trưởng khoa không đổi được lịch cho toàn bộ nhân viên | 🟡 Logic BE | `saveDraft` → `publish` yêu cầu gửi **tất cả** BS mỗi lần, không hỗ trợ sửa từng người |
| 3 | Tuần trước / Tuần sau không hiển thị đúng + lịch cố định | 🟠 Logic FE + BE | Nút "Tuần trước" bị disable khi `weekStart === getCurrentMonday()`, BE kiểm tra `from.getUTCDay() !== 1` |
| 4 | Trưởng khoa Mắt xem được bệnh nhân khoa Tim mạch | 🔴 Lỗi bảo mật | API `searchAllPatients` + `findPatientRecord` **không filter theo chuyên khoa** |

---

## 🐛 VẤN ĐỀ 1: "Tự động xếp lịch" không random + báo lỗi

### Mô tả
Khi bấm nút **"Tự động xếp lịch"**, hệ thống không phân ca random mà dùng pattern cố định. Nếu lịch đã được công bố, bấm lại sẽ thấy toast báo thành công nhưng khi lưu sẽ ghi đè lịch cũ.

### File liên quan
- **FE**: [TrangDuyetLichLamViec.tsx](file:///d:/smart-clinic/FE/src/modules/ca-lam-viec/pages/bac-si/TrangDuyetLichLamViec.tsx#L100-L140)

### Nguyên nhân chi tiết

```typescript
// Dòng 103-109: Khi có ≥ 5 bác sĩ → dùng pattern CỐ ĐỊNH, không random
const patterns = [[0, 2], [1, 5], [3, 5], [4, 6], [4, 6]];
if (newRows.length >= 5) {
  newRows.forEach((row, index) => {
    row.assignedDutyDays = [...patterns[index % patterns.length]];
  });
  // → Bác sĩ thứ 6 trở đi lặp lại pattern[0], dẫn tới trùng ngày trực
}
```

**Vấn đề cụ thể:**
1. Khi có **≥ 5 bác sĩ** (thực tế khoa Mắt có 5 BS), thuật toán **KHÔNG random** mà dùng mảng `patterns` cố định → mỗi lần bấm đều ra cùng kết quả.
2. Khi có **> 5 bác sĩ** (ví dụ 6-10 BS), `index % 5` sẽ lặp lại pattern → **nhiều bác sĩ cùng trực 1 ngày**, vi phạm quy tắc coverage.
3. Nhánh `else` (< 5 BS) có random thật nhưng **không kiểm tra coverage tổng thể** → có thể thiếu người trực cuối tuần.

### Cách sửa đề xuất

```text
Viết lại handleAutoSchedule:
1. Dùng thuật toán greedy + shuffle:
   - Shuffle danh sách bác sĩ
   - Duyệt từng BS, chọn pair (ngày1, ngày2) có coverage thấp nhất
   - Đảm bảo không liền kề + min 2 người/ngày cuối tuần
2. Hoặc gọi API BE /auto-schedule (đã có cho Thu ngân → reuse)
   Backend đã có logic xếp lịch tự động tại:
   createReceptionistAutoSchedule() dòng 1014-1073
   → Sử dụng nightDutyPairs() + coverage-aware sort
```

---

## 🐛 VẤN ĐỀ 2: Không đổi được lịch trực từ Trưởng khoa

### Mô tả
Nếu trưởng khoa muốn **đổi ngày trực cho 1 bác sĩ** (ví dụ: đổi BS A từ T3 sang T5), phải **gửi lại toàn bộ lịch của tất cả bác sĩ trong khoa**, không thể sửa riêng từng người.

### File liên quan
- **BE**: [work-schedules.service.ts](file:///d:/smart-clinic/BE/src/modules/ca-lam-viec/work-schedules.service.ts#L124-L187) → `saveDraft()`

### Nguyên nhân chi tiết

```typescript
// Dòng 152-156: Bắt buộc gửi đủ TẤT CẢ bác sĩ
if (seenDoctors.size !== doctors.length) {
  throw new BadRequestException(
    'Phải phân đủ hai ca trực cho tất cả bác sĩ trong khoa',
  );
}
```

**Luồng hiện tại:**
```text
Trưởng khoa muốn đổi 1 BS
→ FE phải gửi lại assignments[] cho TẤT CẢ BS
→ BE xóa toàn bộ draft cũ rồi tạo lại từ đầu
→ Nếu thiếu 1 BS → lỗi "Phải phân đủ hai ca trực cho tất cả bác sĩ"
```

### Đánh giá
- Đây là **thiết kế có chủ đích** (atomic save) — đảm bảo tính toàn vẹn coverage.
- **Không phải bug**, nhưng UX không tốt khi chỉ muốn sửa 1 người.
- FE hiện tại đã hỗ trợ: click vào nút ngày → toggle on/off → save toàn bộ. Luồng này hoạt động **đúng**.

### Cách sửa đề xuất (UX)
```text
Không cần sửa BE logic.
Chỉ cần cải thiện FE:
- Khi lịch đã công bố → Load data cũ → Cho sửa từng người
- Nút "Lưu thay đổi" gửi lại toàn bộ assignments (bao gồm cả BS không đổi)
→ Hiện tại FE đã làm đúng việc này (useEffect load từ departmentSchedule)
```

---

## 🐛 VẤN ĐỀ 3: Nút Tuần trước / Tuần này / Tuần sau

### Mô tả
- Nút **"Tuần trước"** bị **disabled** khi đang ở tuần hiện tại → không xem được lịch tuần trước.
- Khi bấm **"Tuần sau"** liên tục (sang tháng sau, năm sau), chỉ hiển thị ngày tháng thay đổi nhưng **lịch trống** vì chưa có data trong DB cho tuần đó.
- Logic hiện tại: mỗi tuần có lịch **riêng biệt**, không tự copy từ tuần trước.

### File liên quan
- **FE**: [TrangDuyetLichLamViec.tsx](file:///d:/smart-clinic/FE/src/modules/ca-lam-viec/pages/bac-si/TrangDuyetLichLamViec.tsx#L193-L197)

### Nguyên nhân chi tiết

```tsx
// Dòng 194: Nút "Tuần trước" bị disabled khi weekStart === tuần hiện tại
<button
  disabled={weekStart === getCurrentMonday()}  // ← BUG: Chặn xem lịch quá khứ
  onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}
>Tuần trước</button>
```

**Vấn đề chi tiết:**
1. `disabled={weekStart === getCurrentMonday()}` → Khi đang ở tuần hiện tại, không thể quay lại tuần trước để xem lịch đã công bố.
2. Khi xem tuần tương lai → API trả về **danh sách bác sĩ nhưng không có assignments** → giao diện hiển thị bảng trống với tất cả `assignedDutyDays: []`.
3. Đây là **đúng logic nghiệp vụ** (tuần chưa xếp lịch thì trống), nhưng UX gây nhầm lẫn.

### Cách sửa đề xuất

```diff
// 1. Bỏ disabled trên nút "Tuần trước" để xem lịch quá khứ
- disabled={weekStart === getCurrentMonday()}
+ (không disable nữa, luôn cho xem)

// 2. Thêm thông báo khi tuần chưa có lịch
+ {!departmentSchedule?.published && !isLoading && (
+   <div className="alert alert-info">
+     Tuần này chưa có lịch trực. Bấm "Tự động xếp lịch" hoặc chọn ca thủ công.
+   </div>
+ )}
```

---

## 🔴 VẤN ĐỀ 4: Trưởng khoa Mắt xem được bệnh nhân khoa Tim mạch

### Mô tả
Trưởng khoa Mắt đăng nhập vào menu **"Hồ sơ bệnh nhân"** → thấy **toàn bộ bệnh nhân của tất cả khoa** (bao gồm Tim mạch, Nội khoa, v.v.). Đây là **lỗi bảo mật phân quyền**.

### File liên quan
- **FE**: [TrangHoSoBenhNhanTruongKhoa.tsx](file:///d:/smart-clinic/FE/src/modules/benh-nhan/pages/bac-si/TrangHoSoBenhNhanTruongKhoa.tsx) → Re-export từ Admin
- **FE**: [TrangQuanLyBenhNhan.tsx](file:///d:/smart-clinic/FE/src/modules/benh-nhan/pages/admin/TrangQuanLyBenhNhan.tsx#L51) → Gọi `/receptions/admin-patients`
- **BE Controller**: [receptions.controller.ts](file:///d:/smart-clinic/BE/src/modules/tiep-don/receptions.controller.ts#L36-L43)
- **BE Service**: [receptions.service.ts](file:///d:/smart-clinic/BE/src/modules/tiep-don/receptions.service.ts#L63-L79)
- **BE Repository**: [prisma-reception.repository.ts](file:///d:/smart-clinic/BE/src/modules/tiep-don/repositories/prisma-reception.repository.ts#L88-L123)

### Nguyên nhân chi tiết

```typescript
// receptions.service.ts dòng 63-79
async searchAllPatients(search: string, currentUser?: AuthenticatedUser) {
  // Chỉ kiểm tra "có phải trưởng khoa không" → OK
  if (
    currentUser?.roles.includes('DOCTOR') &&
    !(await this.receptionRepository.isDepartmentHead(currentUser.id))
  ) {
    throw new BadRequestException('Chỉ trưởng khoa được xem...');
  }

  // ❌ BUG: Gọi searchAllPatients KHÔNG filter theo chuyên khoa
  const patients = await this.receptionRepository.searchAllPatients(
    search?.trim() ?? '',
  );
  // → Trả về TẤT CẢ bệnh nhân trong hệ thống
}
```

```typescript
// prisma-reception.repository.ts dòng 88-123
searchAllPatients(search: string) {
  return this.prisma.benhNhan.findMany({
    // ❌ Không có WHERE filter theo chuyenKhoaId
    where: search ? {
      OR: [
        { hoTen: { contains: search, mode: 'insensitive' } },
        { maBenhNhan: { contains: search, mode: 'insensitive' } },
        { soDienThoai: { contains: search } },
      ],
    } : undefined,
    // → Trả về toàn bộ bệnh nhân không phân biệt khoa
  });
}
```

**Cùng vấn đề ở `findPatientRecord`** — dòng 81-89 chỉ kiểm tra `isDepartmentHead` nhưng **không kiểm tra bệnh nhân có thuộc khoa của trưởng khoa đó không**.

### Cách sửa đề xuất

```text
Luồng sửa:
1. isDepartmentHead(userId) → trả thêm chuyenKhoaId của khoa mà user quản lý
2. searchAllPatients(search, chuyenKhoaId):
   - Filter bệnh nhân có luotKham liên kết với chuyenKhoaId
3. findPatientRecord(id, chuyenKhoaId):
   - Kiểm tra bệnh nhân id có ít nhất 1 lượt khám thuộc chuyenKhoaId
   - Filter visits chỉ hiển thị lượt khám của khoa đó
```

**Cụ thể trong Repository:**

```typescript
// isDepartmentHead trả thêm chuyenKhoaId
async getDepartmentHeadSpecialty(userId: number): Promise<number | null> {
  const manager = await this.prisma.quanLyDonVi.findFirst({
    where: {
      nguoiDungId: userId,
      chucVu: ChucVuQuanLyDonVi.TRUONG_DON_VI,
      trangThai: TrangThaiChung.DANG_HOAT_DONG,
    },
    include: { donViLamViec: { select: { chuyenKhoaId: true } } },
  });
  return manager?.donViLamViec.chuyenKhoaId ?? null;
}

// searchAllPatients filter theo khoa
searchAllPatients(search: string, specialtyId?: number) {
  return this.prisma.benhNhan.findMany({
    where: {
      ...(search ? {
        OR: [
          { hoTen: { contains: search, mode: 'insensitive' } },
          { soDienThoai: { contains: search } },
        ],
      } : {}),
      // ✅ Chỉ lấy bệnh nhân có lượt khám thuộc khoa
      ...(specialtyId ? {
        luotKham: { some: { chuyenKhoaId: specialtyId } },
      } : {}),
    },
    // ...
  });
}
```

---

## 📊 Tổng kết ưu tiên sửa

| Ưu tiên | Vấn đề | Lý do |
|---------|--------|-------|
| 🔴 **P0** | #4 — Hồ sơ bệnh nhân không filter theo khoa | Lỗi bảo mật — Trưởng khoa A xem được dữ liệu khoa B |
| 🟠 **P1** | #3 — Nút Tuần trước bị disabled | UX — Không xem được lịch đã công bố tuần trước |
| 🟡 **P2** | #1 — Auto-schedule pattern cố định | UX — Không random, mỗi lần bấm ra kết quả giống nhau |
| 🟢 **P3** | #2 — Đổi lịch phải gửi toàn bộ | Design choice — Hoạt động đúng nhưng UX có thể cải thiện |
