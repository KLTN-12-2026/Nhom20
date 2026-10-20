# Đánh giá V13 — Ưu tiên sửa lỗi sau V12

Ngày cập nhật: 10/08/2026

## 1. Phạm vi đã thực hiện

Theo yêu cầu, phiên bản này chỉ xử lý lỗi và các ưu tiên có mức cao/trung bình trong `danh_gia_v12.md` và `LICH_NGAY_MAI.md`:

- Đã rà và chuẩn bị script dọn có kiểm soát các giao dịch demo đúng tiền tố `HIS`/`TEST`; không đụng dữ liệu `REVIEW` đang phục vụ demo đánh giá bác sĩ.
- Có bổ sung seed chuẩn hóa hoạt chất, quan hệ thuốc–hoạt chất, dị ứng và tiền sử bệnh với cờ nguồn dữ liệu phát triển.
- Đã thay ba thuốc cũ chưa xác định rõ hoạt chất bằng ba thuốc hoạt chất đơn và đồng bộ lên Neon.
- Đã bỏ mô tả/gửi nhắc tái khám bằng SMS, Zalo hoặc email; Lễ tân xử lý gọi chăm sóc thủ công.
- Không triển khai phần cảnh báo y tế/AI Phase 4–6 và không đổi tên cột `thuoc.hoatChat`.

## 2. Những việc đã hoàn thành

| STT | Nội dung từ V12 / kế hoạch | Kết quả | Trạng thái |
|---:|---|---|---|
| 1 | FE thanh toán đọc sai nguồn chi tiết hóa đơn | API `GET /thanh-toan/hoa-don` đã trả relation `HoaDon.chiTiet`; FE đọc trực tiếp snapshot này để xem/in hóa đơn. | HOÀN THÀNH |
| 2 | Bảo toàn snapshot giá trên hóa đơn | FE không còn dựng thuốc từ `donThuoc.chiTiet`. Nếu một hóa đơn cũ chưa có detail, UI hiển thị một dòng cảnh báo trung tính thay vì tự bịa tên thuốc. | HOÀN THÀNH |
| 3 | Nhắc tái khám trên Dashboard Lễ tân | Thêm API chỉ đọc lấy `ho_so_kham` đã hoàn tất, có `ngay_tai_kham` là hôm nay/ngày mai; Dashboard hiển thị họ tên, mã BN, SĐT, khoa và bác sĩ. | HOÀN THÀNH |
| 4 | Ảnh thuốc và ảnh đại diện | Thêm fallback initials khi URL lỗi; upload/gán ảnh Cloudinary cho danh mục thuốc và avatar còn thiếu, không ghi đè ảnh thật. | HOÀN THÀNH |
| 5 | Bỏ luồng gửi nhắc tái khám bên ngoài | Đã bỏ hướng SMS/Zalo/email cho nhắc tái khám. Chuẩn bị migration xóa bảng/enum cũ đang trống; chưa áp dụng lên Neon vì đó là thao tác không thể hoàn tác. | ĐÃ CHUẨN BỊ — CHỜ XÁC NHẬN |
| 6 | Phân quyền lịch làm việc Dược/Lễ tân | Kiểm tra source xác nhận Dược sĩ và Lễ tân đã có controller riêng (`pharmacist-schedules`, `receptionist-schedules`). Không mở nhầm `work-schedules` của Bác sĩ cho các vai trò khác. | ĐÃ KIỂM TRA |
| 7 | Trigger thông báo | Rà source cho thấy các trigger chính đã tồn tại: lịch mới → Lễ tân; tiếp đón → Bác sĩ; hoàn tất khám → Dược sĩ; cấp thuốc → Lễ tân. | ĐÃ KIỂM TRA |

## 3. API đã thêm hoặc thay đổi

| API | Vai trò | Mục đích |
|---|---|---|
| `GET /api/v1/receptions/follow-ups` | `ADMIN`, `RECEPTIONIST` | Lấy danh sách hồ sơ hoàn tất có ngày tái khám hôm nay và ngày mai để Lễ tân gọi chăm sóc thủ công. |
| `GET /api/v1/thanh-toan/hoa-don` | Theo guard sẵn có của module thanh toán | Bổ sung dữ liệu `chiTiet` của hóa đơn (`id`, loại mục, tên mục, số lượng, đơn giá, thành tiền) để FE hiển thị đúng snapshot. |

## 4. Thay đổi Database

- Đã chuẩn bị migration loại bỏ `nhac_tai_kham`, `kenh_nhac_tai_kham` và `trang_thai_nhac`: không triển khai kênh gửi nhắc tái khám bên ngoài. Migration chưa áp dụng lên Neon vì dọn bảng là thao tác xóa; kiểm tra trước đó cho thấy bảng này có `0` bản ghi.
- Bổ sung dữ liệu hoạt chất và liên kết thuốc–hoạt chất; không đổi cấu trúc các bảng kho thuốc.
- API nhắc tái khám chỉ đọc từ các quan hệ đã có:
  `ho_so_kham` → `benh_nhan`, `bac_si`, `luot_kham` → `chuyen_khoa`.
- Hóa đơn tiếp tục dùng relation hiện có:
  `hoa_don` → `chi_tiet_hoa_don` (tên relation Prisma: `chiTiet`).

## 5. File đã chỉnh sửa và file mới

### Backend

- `BE/src/modules/thanh-toan/thanh-toan.service.ts`
- `BE/src/modules/tiep-don/receptions.controller.ts`
- `BE/src/modules/tiep-don/receptions.service.ts`
- `BE/src/modules/tiep-don/repositories/reception.repository.interface.ts`
- `BE/src/modules/tiep-don/repositories/prisma-reception.repository.ts`
- `BE/src/modules/ca-lam-viec/pharmacist-schedules.controller.ts`
- `BE/src/modules/ca-lam-viec/receptionist-schedules.controller.ts`
- `BE/src/modules/ca-lam-viec/work-schedules.service.ts`
- `BE/prisma/schema.prisma`
- `BE/package.json`
- `BE/prisma/cleanup-test-patients.mjs`
- `BE/prisma/seed-data/medicine-ingredient-data.mjs`
- `BE/prisma/seed-data/seed-medicines.mjs`
- `BE/prisma/seed-data/seed-medicine-ingredients.mjs`

### Frontend

- `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx`
- `FE/src/modules/tiep-don/api/reception.api.ts`
- `FE/src/modules/tiep-don/types/reception.types.ts`
- `FE/src/modules/tiep-don/pages/thu-ngan/TrangTongQuanThuNgan.tsx`
- `FE/src/modules/tiep-don/receptionist-workspace.css`
- `FE/src/modules/trang-chu/components/HomeDirectorySections.tsx`
- `FE/src/modules/bac-si/pages/TrangDoiNguBacSi.tsx`
- `FE/src/modules/trang-chu/components/ProcessGuide.tsx`
- `FE/src/services/axios-client.ts`
- `FE/src/routes/AppRouter.tsx`

### File mới

- `FE/src/modules/tiep-don/hooks/use-follow-up-reminders.ts`
- `BE/prisma/seed-data/seed-active-ingredients.mjs`
- `BE/prisma/seed-data/seed-medicine-ingredients.mjs`
- `BE/prisma/seed-data/seed-patient-clinical-fixtures.mjs`
- `BE/prisma/seed-data/assign-medicine-images.mjs`
- `BE/prisma/seed-data/assign-missing-avatar-fallbacks.mjs`
- `BE/prisma/seed-data/audit-demo-transactions.mjs`
- `BE/prisma/seed-data/audit-catalog-assets.mjs`
- `BE/prisma/seed-data/cleanup-demo-transactions.mjs`
- `BE/prisma/migrations/20260810120000_bo_nhac_tai_kham_kenh_ngoai/migration.sql`

## 6. Kiểm tra kỹ thuật

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `BE/npm run build` | PASS | Compile NestJS thành công. |
| `FE/npm run build` | PASS | Build Vite production thành công. |
| `FE/npm run lint` | PASS có 5 cảnh báo cũ | Cảnh báo hook dependency/unused catch ở các module Chatbox, Khám bệnh, Người dùng, Đánh giá bác sĩ; không phát sinh lỗi build. |
| ESLint phạm vi BE | CHƯA PASS | File tiếp đón cũ còn nhiều `any` và lỗi Prettier từ trước, không nằm trong phạm vi bug hiện tại. Các thay đổi mới vẫn build thành công. |
| Kiểm thử runtime với Neon | CHƯA KIỂM THỬ | Cần chạy BE/FE và đăng nhập Lễ tân để xác nhận dữ liệu thực tế theo ngày hiện tại. |
| Audit danh mục kho/ảnh trên Neon | PASS | `0` thuốc thiếu ảnh, `0` người dùng thiếu avatar, `0` thuốc thiếu liên kết hoạt chất. |

## 7. Các nội dung từ V12 chưa làm

### Tiến độ seed và dữ liệu phát triển

- ✅ Đã tạo `seed-active-ingredients.mjs`: chuẩn hóa 65 hoạt chất. Seed tái sử dụng bản ghi cũ cùng tên thay vì tạo trùng khi Neon đã có mã khác.
- ✅ Đã tạo `seed-medicine-ingredients.mjs`: lưu 68 liên kết `thuoc_hoat_chat`.
- ✅ Đã tạo `seed-patient-clinical-fixtures.mjs`: seed 4 dị ứng và 4 tiền sử bệnh để kiểm thử luồng cảnh báo.
  Tất cả bản ghi này bắt buộc có `nguonThongTin = SEED_DEVELOPMENT`, `trangThaiXacNhan = CHUA_XAC_NHAN` hoặc ghi chú `[SEED_DEVELOPMENT]`; không được dùng như thông tin lâm sàng đã xác nhận.
- ✅ Thay ba thuốc không đủ thông tin nhãn bằng thuốc có hoạt chất đơn và hàm lượng xác định: `MED-043` Thiamine hydrochloride 100 mg, `MED-045` Magnesium hydroxide 400 mg, `MED-062` Ketotifen 0,025%. Ba mã này đã có thể map vào `thuoc_hoat_chat`.

### Chưa làm hoặc đang thực hiện

- Dọn dữ liệu demo trong các bảng giao dịch: audit chỉ đọc xác định đúng `25` lịch hẹn, `25` lượt khám, `25` đơn thuốc và `25` hóa đơn có tiền tố `HIS`/`TEST`; dữ liệu `REVIEW` được giữ nguyên. Thao tác xóa Neon đang chờ xác nhận thực thi riêng vì không thể hoàn tác.
- Rút gọn hoặc tạo lại seeder nhân sự, thuốc, lịch hẹn nếu cần ở đợt dọn dữ liệu tiếp theo.
- ✅ Đã upload/gán Cloudinary: `0` thuốc thiếu ảnh, `0` người dùng thiếu avatar. Ảnh thuốc là minh họa kho thuốc có nhãn rõ ràng; avatar fallback chỉ dùng cho tài khoản chưa có ảnh và không ghi đè ảnh thật.
- ✅ Đã rà và Việt hóa các comment `//` tiếng Anh ở source; giữ nguyên tên kỹ thuật như JWT, API, Prisma và Gemini.
- Đổi tên `thuoc.hoatChat` thành tên phản ánh nhóm dược lý. Việc này cần migration nên được để sau.

### Chức năng còn thiếu

- Cảnh báo dị ứng, trùng hoạt chất, tương tác thuốc và Gemini cảnh báo đơn thuốc (Phase 4–6).
- Nhắc tái khám qua kênh nhắn tin ngoài hệ thống đã loại khỏi kế hoạch. Lễ tân sử dụng danh sách tái khám để gọi chăm sóc thủ công.
- Kiểm thử nghiệp vụ trực tiếp với dữ liệu Neon cho endpoint nhắc tái khám và snapshot hóa đơn.
- ✅ Controller lịch của Dược/Lễ tân đã thay body `dto: any` bằng DTO có `class-validator`; cần kiểm thử runtime bằng tài khoản trưởng bộ phận ở bước sau.

## 8. Lưu ý về lịch làm việc

- `work-schedules` là module nghiệp vụ của Bác sĩ và giữ `@Roles('DOCTOR')`.
- Dược sĩ đã có `/pharmacist-schedules/*`; Lễ tân/Thu ngân đã có `/receptionist-schedules/*`, cùng các hàm dịch vụ riêng.
- Vì vậy không mở rộng role một cách máy móc cho `work-schedules`: làm vậy có thể đưa Dược/Lễ tân vào logic đơn vị/khoa của Bác sĩ và gây lỗi phân quyền/ngữ cảnh.
- Bước kiểm thử tiếp theo: đăng nhập tài khoản trưởng bộ phận Dược và Lễ tân, gọi màn hình phân lịch, sửa nháp, công bố và xác nhận dữ liệu `phan_cong_ca` được cập nhật đúng đơn vị.

## 9. Hướng dẫn test thủ công

1. Đăng nhập vai trò Lễ tân/Thu ngân, vào Dashboard.
2. Tạo hoặc dùng một `ho_so_kham` có trạng thái hoàn tất và `ngay_tai_kham` là hôm nay hoặc ngày mai.
3. Kiểm tra widget **Nhắc tái khám** hiển thị đúng bệnh nhân, SĐT, khoa và bác sĩ để Lễ tân gọi chăm sóc thủ công; không có gửi SMS/Zalo/email.
4. Vào **Quản lý thanh toán**, mở hóa đơn được tạo sau khi Dược sĩ cấp thuốc. Danh sách khoản thu phải khớp `chi_tiet_hoa_don`, bao gồm cả phí khám và thuốc.
5. Mở trang chủ/đội ngũ bác sĩ với một avatar URL lỗi để kiểm tra card chuyển về initials, không còn ảnh vỡ.

## 10. Kết luận

Các ưu tiên số 4–7 của phần kết luận V12 đã được xử lý hoặc xác minh theo đúng phạm vi an toàn. Danh mục thuốc, hoạt chất và ảnh Cloudinary đã hoàn thiện; phần dọn dữ liệu demo và áp dụng migration xóa bảng cũ chỉ còn chờ xác nhận rõ ràng vì tác động trực tiếp tới Neon.
