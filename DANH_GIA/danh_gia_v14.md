# Đánh giá v14 — Rà soát dữ liệu và chuẩn hóa mô hình

**Ngày:** 11/08/2026  
**Phạm vi thực hiện:** triển khai các việc trong `Viec_lam_hom_nay.md`, không sửa thư mục `docs`, không xóa bất kỳ file nào trong `seed-data`.

## 1. Kết luận ngắn

Đã chuẩn hóa các trường nghiệp vụ bị lặp giữa hồ sơ khám, đơn thuốc, thuốc và lô thuốc trong mã nguồn Prisma/Backend/Frontend. Các trường bị xem là dư không bị xóa dữ liệu thủ công; migration mới có bước chuyển dữ liệu cũ sang quan hệ chuẩn trước khi bỏ cột.

Đã áp dụng migration vào Neon thành công bằng Prisma Migrate sau khi đã tạo backup. `npx prisma migrate status` hiện báo database schema up to date; các cột trùng và bảng `nhac_tai_kham` rỗng đã được xử lý theo migration có kiểm soát.

## 2. Kiểm tra bảng và cột dữ liệu

### 2.1. Bảng không xóa

Đã rà soát 41 model Prisma. Không xóa toàn bộ bảng nào trong đợt này vì mỗi bảng vẫn có vai trò nghiệp vụ hoặc là nền tảng cho chức năng sắp triển khai.

| Nhóm | Bảng/model giữ lại | Lý do |
|---|---|---|
| Tài khoản và phân quyền | `NguoiDung`, `XacThucToken`, `VaiTro`, `Quyen`, các bảng liên kết | Đăng nhập, phân quyền và quên mật khẩu/xác thực sau này. |
| Nhân sự và lịch | `NhanVien`, `BacSi`, `ChuyenKhoa`, `DonViLamViec`, `QuanLyDonVi`, `CaLamViec`, `PhanCongCa`, `BanGiaoCa` | Phân ca theo chuyên khoa/bộ phận, trực đêm và bàn giao ca. |
| Khám chữa bệnh | `BenhNhan`, `LichHen`, `LuotKham`, `PhieuHangCho`, `HoSoKham`, `DonThuoc`, `ChiTietDonThuoc`, `DanhGiaBacSi` | Luồng đặt lịch → tiếp đón → khám → đánh giá. |
| Dược và thanh toán | `Thuoc`, `LoThuoc`, `HoatChat`, `ThuocHoatChat`, `ChiTietCapThuoc`, `GiaoDichKho`, `HoaDon`, `ThanhToan`, `DichVu`, `ChiTietHoaDon` | Quản lý lô, tồn kho, cấp thuốc và thanh toán. |
| AI và hỗ trợ | `PhienChat`, `TinNhanChat`, `LanChayAI`, `BanNhapDatLichChat`, `CanhBaoDonThuoc` | Chatbox, nhật ký AI, bản nháp đặt lịch và cảnh báo đơn. |

Các cột `NULL` ở thông tin tùy chọn (CCCD, BHYT, email phụ, ảnh, địa chỉ, ngày tái khám, ghi chú...) **không phải cột dư**. Chúng cần được giữ để không bắt buộc người dùng phải có dữ liệu mà thực tế có thể chưa cung cấp.

### 2.2. Cột đã chuẩn hóa trong source

| Dữ liệu lặp | Quyết định | Nguồn dữ liệu chuẩn sau thay đổi | Trạng thái |
|---|---|---|---|
| `HoSoKham.benhNhanId`, `HoSoKham.bacSiId` | Bỏ | `HoSoKham.luotKhamId` → `LuotKham.benhNhanId/bacSiId` | ✅ Source + migration đã chuẩn bị |
| `DonThuoc.benhNhanId`, `DonThuoc.bacSiId` | Bỏ | `DonThuoc.hoSoKhamId` → `HoSoKham.luotKhamId` | ✅ Source + migration đã chuẩn bị |
| `Thuoc.hanSuDung` | Bỏ | `LoThuoc.hanDung`; API trả hạn gần nhất còn hiệu lực/đang có lô | ✅ Source + migration đã chuẩn bị |
| `Thuoc.hoatChat` | Bỏ | `HoatChat` + `ThuocHoatChat` | ✅ Source + migration đã chuẩn bị |
| Bảng vật lý `nhac_tai_kham` cũ | Bỏ bằng migration | Nhắc tái khám đọc từ `HoSoKham.ngayTaiKham` | ✅ Đã áp dụng trên Neon |

## 3. Công việc đã làm

### ✅ Đã làm

- [x] Tạo endpoint `GET /receptions/tickets/:queueNumber` để trang in phiếu tiếp đón lấy đúng phiếu từ CSDL khi mở trực tiếp hoặc tải lại trang; đã bỏ dữ liệu dự phòng `FALLBACK_TICKET`.
- [x] Chuyển việc tạo phương án trực đêm Lễ tân/Thu ngân từ Frontend sang Backend. Backend kiểm tra đủ **2 người trực đêm mỗi ngày** trước khi lưu/công bố.
- [x] Bổ sung API/hook Frontend dùng phương án phân lịch của Backend, tránh mỗi máy tự tính một lịch khác nhau.
- [x] Chuẩn hóa truy vấn khám bệnh, cấp thuốc, tiếp đón và cổng bệnh nhân theo quan hệ `LuotKham`/`HoSoKham` sau khi bỏ các khóa lặp.
- [x] Chuẩn hóa hoạt chất thuốc bằng `HoatChat` và `ThuocHoatChat`; API vẫn trả `hoatChat` để không làm hỏng giao diện cũ.
- [x] Chuẩn hóa hạn sử dụng theo `LoThuoc`; danh mục thuốc không còn là nơi ghi hạn dùng/tồn kho trực tiếp.
- [x] Sửa giao diện tạo/sửa thuốc: bỏ input **Tồn kho ban đầu** và **Hạn sử dụng**, thêm hướng dẫn nhập lô mới sau khi tạo thuốc.
- [x] Chuyển các script seed thuốc sang quan hệ `hoat_chat`, `thuoc_hoat_chat`, `lo_thuoc`; không xóa file seed nào. Nhờ đó seed lại sau migration không còn ghi vào cột cũ.
- [x] Thêm migration `20260811153000_chuan_hoa_du_lieu_lap`: sao chép hoạt chất cũ sang bảng quan hệ, tạo lô kế thừa khi có hạn dùng/tồn cũ, sau đó mới bỏ cột lặp.
- [x] Xóa `FE/src/modules/cap-thuoc/mock/pharmacy.mock.ts` không còn được dùng.
- [x] Bỏ mã vạch trang trí cố định `*SMARTCLINIC*` trong chi tiết thanh toán; thay bằng mã tra cứu hóa đơn thực.
- [x] Kiểm tra hằng số `DAYS` ở Bác sĩ: vẫn đang dùng nên giữ lại.
- [x] Kiểm tra preview `DANH_GIA/tong-quan-thu-ngan-hallmark.html`: file không tồn tại nên không có gì để xóa.
- [x] Chạy `npx prisma generate`, `npx prisma validate`, build BE và build FE đều thành công.

### ⏳ Chưa làm được / chờ điều kiện

- [ ] Kiểm thử E2E trực quan trên trình duyệt sau migration: khám bệnh, cấp thuốc, tiếp đón/in phiếu và cảnh báo đơn thuốc.
- [ ] Đối chiếu hậu migration trực tiếp trên Neon: số lượng liên kết hoạt chất và số lô kế thừa với snapshot backup.

## 4. File thay đổi

### File mới

- `BE/prisma/migrations/20260811153000_chuan_hoa_du_lieu_lap/migration.sql`
- `FE/src/modules/ca-lam-viec/api/receptionist-schedules.api.ts`
- `DANH_GIA/danh_gia_v14.md`

### File sửa

- `BE/prisma/schema.prisma`
- `BE/src/modules/tiep-don/repositories/reception.repository.interface.ts`
- `BE/src/modules/tiep-don/repositories/prisma-reception.repository.ts`
- `BE/src/modules/tiep-don/receptions.controller.ts`
- `BE/src/modules/tiep-don/receptions.service.ts`
- `BE/src/modules/ca-lam-viec/receptionist-schedules.controller.ts`
- `BE/src/modules/ca-lam-viec/work-schedules.service.ts`
- `BE/src/modules/kham-benh/repositories/examination.repository.interface.ts`
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`
- `BE/src/modules/kham-benh/examinations.service.ts`
- `BE/src/modules/cap-thuoc/repositories/dispensing.repository.interface.ts`
- `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts`
- `BE/src/modules/cap-thuoc/dispensing.service.ts`
- `BE/src/modules/benh-nhan/patient-portal.service.ts`
- `BE/src/modules/thuoc/repositories/medicine.repository.interface.ts`
- `BE/src/modules/thuoc/repositories/prisma-medicine.repository.ts`
- `BE/src/modules/thuoc/medicines.service.ts`
- `FE/src/modules/tiep-don/api/reception.api.ts`
- `FE/src/modules/tiep-don/pages/thu-ngan/TrangInPhieuTiepDon.tsx`
- `FE/src/modules/ca-lam-viec/hooks/use-receptionist-schedules.ts`
- `FE/src/modules/ca-lam-viec/pages/thu-ngan/TrangDuyetLichLamViecThuNgan.tsx`
- `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx`
- `FE/src/modules/thuoc/pages/admin/TrangQuanLyKhoThuoc.tsx`
- `BE/prisma/seed-data/seed-medicines.mjs`
- `BE/prisma/seed-data/seed-batches.mjs`
- `BE/prisma/seed-data/assign-medicine-images.mjs`
- `BE/prisma/seed-data/seed-patient-review-flow.mjs`

### File xóa

- `FE/src/modules/cap-thuoc/mock/pharmacy.mock.ts`

> Không xóa file nào trong `seed-data`. Không chỉnh sửa file nào trong `docs`.

## 5. Comment giải thích đã thêm

Các comment ngắn được đặt đúng cạnh logic nghiệp vụ để người đọc sau hiểu lý do, không chỉ mô tả cú pháp:

| File | Nội dung comment | Lý do |
|---|---|---|
| `TrangInPhieuTiepDon.tsx` | Luôn đọc API để mở trực tiếp/tải lại không hiện dữ liệu giả | Bảo vệ luồng in phiếu thật. |
| `work-schedules.service.ts` | Thuật toán phân trực nằm ở Backend | Tránh mỗi giao diện tự tạo lịch sai quy tắc. |
| `use-receptionist-schedules.ts` | Lưu nháp rồi mới công bố sau kiểm tra Backend | Làm rõ quy trình an toàn. |
| `examination.repository.interface.ts` | Bệnh nhân/bác sĩ chỉ lấy qua lượt khám | Giải thích chuẩn hóa khóa ngoại. |
| `dispensing.repository.interface.ts` | Đơn cấp thuốc theo hồ sơ → lượt khám | Giải thích quan hệ dữ liệu. |
| `medicines.service.ts` | API giữ trường phản hồi cũ nhưng lấy từ quan hệ chuẩn | Không làm FE hiện hữu bị vỡ. |
| `TrangQuanLyKhoThuoc.tsx` | Tồn kho chỉ thay đổi qua lô thuốc | Ngăn sửa chéo tồn kho. |
| Các script seed thuốc | Hoạt chất/hạn dùng seed qua quan hệ chuẩn | Seed lại vẫn tương thích sau migration. |
| Migration mới | Chuyển dữ liệu trước khi bỏ cột | Giảm nguy cơ mất dữ liệu khi deploy. |

## 6. Kết quả kiểm thử kỹ thuật

| Kiểm tra | Kết quả |
|---|---|
| `BE: npm run build` | ✅ PASS |
| `BE: npx prisma generate --schema prisma/schema.prisma` | ✅ PASS |
| `BE: npx prisma validate --schema prisma/schema.prisma` | ✅ PASS |
| `FE: npm run build` | ✅ PASS |
| `BE: node --check` cho 4 script seed vừa cập nhật | ✅ PASS |
| `BE: npx prisma migrate deploy/status --schema prisma/schema.prisma` | ✅ PASS — 3 migration đã áp dụng, database schema up to date |

## 7. Bước tiếp theo sau khi migration đã áp dụng

1. Kiểm tra lại Neon và ba luồng: khám bệnh, cấp thuốc, tiếp đón/in phiếu.
2. Đối chiếu dữ liệu với backup vừa tạo; không chạy SQL `DROP TABLE` hoặc `ALTER TABLE` thủ công.
3. Chỉ sau khi xác minh dữ liệu mới cân nhắc dọn các file `seed-data` theo yêu cầu ở đợt riêng.

---

## 8. Bổ sung — Chatbox AI Phase 4, 5, 6 và backup dữ liệu

### 8.1. Phase 4 — Cảnh báo an toàn đơn thuốc

- [x] Bổ sung và áp dụng bốn loại cảnh báo nghiệp vụ vào enum `loai_canh_bao_don_thuoc`:
  `THUOC_HET_HAN`, `TON_KHO_KHONG_DU`, `THIEU_LIEU_DUNG`, `THIEU_HUONG_DAN`.
- [x] Tạo `PrescriptionSafetyService`: sau mỗi lần bác sĩ lưu nháp/hoàn tất, hệ thống đọc dữ liệu thật từ `don_thuoc`, `chi_tiet_don_thuoc`, `thuoc`, `lo_thuoc`, `thuoc_hoat_chat`, `hoat_chat` và `di_ung_benh_nhan` để kiểm tra:
  1. dị ứng thuốc/hoạt chất;
  2. trùng hoạt chất;
  3. không có lô còn hạn;
  4. tồn kho còn hạn không đủ;
  5. thiếu liều dùng;
  6. thiếu hướng dẫn sử dụng.
- [x] Cảnh báo được lưu thật vào `canh_bao_don_thuoc`; không dùng Gemini để tự sửa, xóa hoặc tự kê đơn.
- [x] Bác sĩ thấy danh sách cảnh báo ngay tại trang khám. Có thể “Đã xem” hoặc “Bỏ qua”; cảnh báo nghiêm trọng bắt buộc nhập lý do khi bỏ qua.
- [x] Không thể hoàn tất phiếu khám nếu còn cảnh báo nghiêm trọng ở trạng thái chờ xử lý. Hồ sơ/đơn vẫn được lưu nháp để bác sĩ quay lại sửa sau mất điện hoặc reload.

### 8.2. Phase 5 — Realtime, thông báo, nhật ký

- [x] Tái sử dụng Socket.IO hiện có, thêm event `prescription.warning_created`; không tạo socket/server thứ hai.
- [x] Khi có cảnh báo nghiêm trọng, Backend gửi `thong_bao` và event realtime đúng room của bác sĩ. Màn hình kê đơn đang mở tự tải lại cảnh báo.
- [x] Khi bác sĩ xử lý/bỏ qua cảnh báo, hệ thống ghi `nhat_ky_he_thong` qua `AuditLogsService`.
- [x] Luồng đặt lịch từ Chatbox vốn đã tái sử dụng `AppointmentsService`: tạo lịch nguồn `AI_HO_TRO`, phát event lịch hẹn và thông báo cho vai trò Lễ tân/Thu ngân.
- [x] `lan_chay_ai` vẫn là nơi lưu kết quả/lỗi của lần gọi Gemini; không thay đổi cấu trúc Chatbox ở đợt này.

### 8.3. Phase 6 — Regression/E2E

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Build Backend | ✅ PASS | `npm run build` |
| Prisma schema | ✅ PASS | `npx prisma validate --schema prisma/schema.prisma` |
| Migration Neon | ✅ PASS | `npx prisma migrate deploy` và `migrate status` báo database up to date |
| Jest Backend | ✅ PASS | 2/2 test pass sau khi bổ sung mock dependency cho test thanh toán cũ |
| Build Frontend | ✅ PASS | `npm run build` |
| Backup dữ liệu | ✅ PASS | Đã tạo JSON cục bộ sau migration |
| Guest/Patient Chat → tra cứu → đặt lịch | ⏳ Cần test tay | Cần chạy đồng thời FE, BE, Gemini và Socket để xác nhận UI/end-to-end |
| Bác sĩ lưu đơn có cảnh báo → xử lý → hoàn tất | ⏳ Cần test tay | Luồng đã build và migration đã có; cần thao tác dữ liệu thật trên trình duyệt |
| Realtime đến Lễ tân/Bác sĩ không F5 | ⏳ Cần test tay | Cần hai phiên đăng nhập song song để quan sát Socket |

### 8.4. Backup dữ liệu local

- [x] Thêm lệnh `npm run db:backup` trong `BE/package.json`.
- [x] Thêm script `BE/prisma/backup-data.mjs`.
- [x] Đã tạo file local `BE/backups/smart-clinic-2026-08-11.json` sau khi migration hoàn tất.
- [x] `BE/backups/.gitignore` chặn mọi JSON backup khỏi Git.

Backup gồm dữ liệu nghiệp vụ: chuyên khoa, bác sĩ, bệnh nhân, lịch/ca, khám, thuốc/lô/hoạt chất, dị ứng-tiền sử, đơn/cấp thuốc, hóa đơn-thanh toán và đánh giá. Backup **không bao gồm** mật khẩu, refresh token, guest token, nội dung chat hoặc lịch sử chạy AI.

### 8.5. Sự cố migration đã xử lý

Lần chạy đầu của migration chuẩn hóa dừng tại `hoat_chat.updated_at` vì raw SQL chuyển dữ liệu không truyền timestamp bắt buộc. Không có dữ liệu của migration thứ hai bị xóa. Đã:

1. bổ sung `created_at`, `updated_at` bằng `NOW()` cho các insert raw sang `hoat_chat`, `thuoc_hoat_chat`, `lo_thuoc`;
2. dùng Prisma đánh dấu migration lỗi là rolled back;
3. chạy lại `prisma migrate deploy` thành công.

### 8.6. File thêm/sửa trong phần bổ sung này

**File mới**

- `BE/src/modules/kham-benh/dto/resolve-prescription-warning.dto.ts`
- `BE/src/modules/kham-benh/prescription-safety.service.ts`
- `BE/prisma/migrations/20260811170000_mo_rong_canh_bao_don_thuoc/migration.sql`
- `BE/prisma/backup-data.mjs`
- `BE/backups/.gitignore`

**File sửa**

- `BE/prisma/schema.prisma`
- `BE/prisma/migrations/20260811153000_chuan_hoa_du_lieu_lap/migration.sql`
- `BE/src/modules/kham-benh/examinations.module.ts`
- `BE/src/modules/kham-benh/examinations.controller.ts`
- `BE/src/modules/kham-benh/examinations.service.ts`
- `BE/src/modules/kham-benh/repositories/examination.repository.interface.ts`
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`
- `BE/src/modules/thoi-gian-thuc/realtime.events.ts`
- `BE/package.json`
- `FE/src/modules/kham-benh/api/examination.api.ts`
- `FE/src/modules/kham-benh/types/examination.types.ts`
- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`
- `BE/src/modules/thanh-toan/thanh-toan.controller.spec.ts`
- `BE/src/modules/thanh-toan/thanh-toan.service.spec.ts`
