# SMARTCLINIC — ĐÁNH GIÁ THANH TOÁN SEPAY V24

Ngày khảo sát: 12/11/2026. Nhánh tại thời điểm đọc: `Tram`, HEAD `6b43c93`.

**Phạm vi:** kiểm tra tĩnh source FE, BE, Prisma schema/migration, cấu hình có/không có giá trị và test hiện có. Không gọi webhook thật, không tạo giao dịch, không truy vấn/ghi database, không chạy test, seed hoặc migration. Các kết luận về luồng code là **đã xác minh trong source**, không đồng nghĩa đã tái hiện bằng giao dịch thực tế. Cấu hình của tiến trình đang chạy, dashboard SePay, schema/dữ liệu thực tế trên Neon và log thực tế **chưa được kiểm chứng**.

Quy ước: **ĐÃ XÁC MINH** = có nhánh code/điều kiện cụ thể; **NGUY CƠ** = có thể xảy ra theo thiết kế hoặc phụ thuộc thứ tự đồng thời/cấu hình, chưa tái hiện trên PostgreSQL thực; **CHƯA XÁC MINH** = chưa đủ bằng chứng về môi trường, dữ liệu hoặc hành vi thực tế.

## 1. Kết luận nhanh

**Chưa thể coi luồng hiện tại là an toàn hoặc đối soát chính xác.** Khi webhook hợp lệ có mã hóa đơn được tìm thấy và giao dịch ghi thành công, backend không so số tiền nhận với số còn phải thu trước khi gán `DA_THANH_TOAN`. Webhook đồng thời và thu tiền mặt đồng thời có nguy cơ ghi trùng; xác thực webhook bị bỏ qua nếu token môi trường của tiến trình không được cấu hình. Ngoài ra controller đang ghi header Authorization vào log.

Trong source có **3 vấn đề P0 và 6 vấn đề P1**, được định nghĩa cụ thể tại mục 9; đây là số nhóm phát hiện của báo cáo, không phải số giao dịch thực tế bị ảnh hưởng. **Chưa xác minh được có giao dịch sai hay token lộ ra ngoài thực tế hay không.**

## 2. Sơ đồ luồng hiện tại

```text
Bác sĩ hoàn tất khám có đơn
  → Dược sĩ cấp thuốc: tồn kho + HoaDon + ChiTietHoaDon trong transaction
  → FE thu ngân GET danh sách hóa đơn → chọn hóa đơn → tính tiền còn lại
  → FE tạo URL ảnh VietQR chứa số tiền và mã hóa đơn
  → [giao dịch ngân hàng / SePay, không kiểm thử thật]
  → POST /api/v1/thanh-toan/sepay-webhook
  → kiểm tra header nếu có SEPAY_API_TOKEN → DTO → transferType = in
  → trích mã từ content → tìm hóa đơn → chỉ loại DA_THANH_TOAN
  → transaction tạo ThanhToan + đánh dấu DA_THANH_TOAN, không so đủ tiền
  → phát payment.success vào phòng RECEPTIONIST → FE tải lại / toast
```

Nhánh khác: thu ngân chọn tiền mặt hoặc xác nhận chuyển khoản thủ công → `collectPayment` cộng các lần thu thành công rồi tạo giao dịch và cập nhật trạng thái. Nhánh này **không tạo hóa đơn**.

Khám không có đơn → hoàn tất khám không tạo hóa đơn trong các nhánh source đã tìm thấy → không có hóa đơn mới cho thu ngân thu. Dữ liệu được tạo bằng seed hoặc hệ thống ngoài source là trường hợp khác, không thể loại trừ.

## 3. Danh sách file, hàm và trách nhiệm

| File | Hàm/thành phần | Vai trò |
|---|---|---|
| `BE/src/modules/thanh-toan/thanh-toan.controller.ts:29` | `handleWebhook` | Nhận webhook, kiểm tra token có điều kiện, ghi log. |
| `BE/src/modules/thanh-toan/thanh-toan.service.ts:25` | `handleSePayWebhook` | Nhận tiền vào, tìm hóa đơn, tạo `ThanhToan`, cập nhật `HoaDon`, phát sự kiện. |
| `BE/src/modules/thanh-toan/thanh-toan.service.ts:123` | `getInvoices` | Lấy hóa đơn, bệnh nhân, các giao dịch và snapshot chi tiết. |
| `BE/src/modules/thanh-toan/thanh-toan.service.ts:153` | `collectCash`, `collectTransfer`, `collectPayment` | Ghi tiền mặt/chuyển khoản thủ công. |
| `BE/src/modules/thanh-toan/dto/sepay-webhook.dto.ts:9` | `SePayWebhookDto` | Khai báo/kiểm tra các trường webhook, gồm `transferAmount`. |
| `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts:181` | `dispense` | Trừ tồn, tạo/cập nhật hóa đơn và các dòng phí. |
| `BE/src/modules/cap-thuoc/dispensing.service.ts:161` | `dispense` | Kiểm tra đơn, phân bổ lô, phát sự kiện sau cấp. |
| `BE/src/modules/kham-benh/examinations.service.ts:94` và `:314` | `completeByVisit`, `saveByVisit` | Hoàn tất khám; không thấy tạo hóa đơn. |
| `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts:62` và `:174` | `save`, `markComplete` | Lưu hồ sơ/đơn, hoàn tất lượt và hàng chờ. |
| `BE/prisma/schema.prisma:1016`, `:1045`, `:1262` | `HoaDon`, `ThanhToan`, `ChiTietHoaDon` | Cấu trúc, số tiền, quan hệ, index. |
| `BE/prisma/migrations/20260726232733_them_rang_buoc_toan_ven_du_lieu/migration.sql:65` | CHECK hóa đơn/thanh toán | Ràng buộc tổng và số tiền dương **theo migration trong repo**. |
| `BE/prisma/seed-data/seed-patient-review-flow.mjs:65` | `hoaDon.upsert` | Ngoại lệ: script seed có tạo/cập nhật hóa đơn; không phải luồng API thông thường. **Không chạy script.** |
| `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx:78` | `fetchInvoices`, QR, `recordPayment` | Hiển thị, tạo URL QR, gọi tiền mặt/thủ công, nhận socket. |
| `FE/src/modules/thanh-toan/api/payment.api.ts:4` | `paymentApi` | Gọi các endpoint thu ngân. |
| `BE/src/modules/thoi-gian-thuc/realtime.events.ts:13`, `realtime.service.ts`, `realtime.gateway.ts` | `payment.success`, room theo vai trò | Hệ thống phát/định tuyến socket; không phải sổ giao dịch. |
| `FE/src/hooks/use-realtime-event.ts` | `useRealtimeEvent` | Đăng ký/hủy listener socket. |
| `BE/src/modules/benh-nhan/patient-portal.service.ts:47` | `getMyVisits` | Phụ thuộc trạng thái hóa đơn đã thanh toán. |
| `BE/src/modules/ca-lam-viec/work-schedules.service.ts:942`, `BE/src/modules/bao-cao-thong-ke/admin-reports.repository.ts:34` | Thu ca/báo cáo | Consumer của giao dịch/hóa đơn, cần test hồi quy. |
| `BE/src/modules/thanh-toan/*.spec.ts` | Hai test `should be defined` | Chỉ kiểm tra khởi tạo service/controller; không xác minh nghiệp vụ thanh toán. |
| `BE/src/main.ts:18`, `BE/src/common/interceptors/api-response.interceptor.ts` | ValidationPipe, response wrapper | API có prefix `/api/v1`; whitelist và từ chối thuộc tính không khai báo. |

## 4. Kiểm chứng chuyển thiếu 50.000/500.000 đồng

**ĐÃ XÁC MINH THEO SOURCE**, với giả định webhook JSON đi qua validation, xác thực, mã khớp hóa đơn chưa ở `DA_THANH_TOAN`, DB cho ghi và transaction commit:

1. Theo [tài liệu webhook SePay](https://docs.sepay.vn/tich-hop-webhooks.html), `transferAmount` là số tiền giao dịch gửi trong JSON; với giao dịch thực tế vào 50.000 đồng thì payload tương ứng chứa số tiền đó. **Chưa xem payload giao dịch thật của dự án.**
2. DTO nhận `transferAmount`: `BE/src/modules/thanh-toan/dto/sepay-webhook.dto.ts:46`. Service lấy `dto.transferAmount` và lưu `ThanhToan.soTien` tại `thanh-toan.service.ts:85-91`.
3. Không có phép so `transferAmount` với `hoaDon.tongTien`, không đọc/tổng hợp các giao dịch thành công trước đó trong nhánh webhook (`thanh-toan.service.ts:56-103`).
4. Tạo giao dịch 50.000 ở `THANH_CONG`, sau đó đặt hóa đơn 500.000 thành `DA_THANH_TOAN` trong cùng transaction (`:83-103`). Hai thao tác cùng commit hoặc rollback, nhưng điều kiện **đủ tiền** là sai.
5. Khi FE lấy lại dữ liệu, tổng đã thu được cộng từ giao dịch thành công nhưng nhãn ưu tiên `DA_THANH_TOAN`, nên có thể hiện **“Đã thanh toán”**, đã thu 50.000 và còn 450.000 cùng lúc (`TrangQuanLyThanhToan.tsx:87-89, 213, 700+`). Cửa sổ chi tiết vẫn dựa vào `remaining > 0` để cho thu ngân có quyền thao tác; không kết luận rằng mọi nút bị khóa.
6. Sau commit, BE phát `payment.success` chứa số tiền nhận (`thanh-toan.service.ts:108-115`); FE tải lại, hiện toast thành công và hiệu ứng (`TrangQuanLyThanhToan.tsx:146-162`). Số 50.000 trong sự kiện là tiền đã nhận theo payload, nhưng tên sự kiện/trạng thái có thể gây hiểu rằng hóa đơn đã đủ.

**CHƯA XÁC MINH:** giao dịch thực nào đã bị ảnh hưởng; số dư thực tế hoặc xác thực/cấu hình của SePay dashboard.

## 5. Kết quả 12 tình huống

Số dòng dưới đây quy về `BE/src/modules/thanh-toan/thanh-toan.service.ts` trừ khi nêu khác. Khuyến nghị chỉ là đề xuất, **chưa triển khai**.

| # | Tình huống | Kết quả hiện tại và đánh giá | Hướng xử lý / ưu tiên |
|---|---|---|---|
| 1 | Chuyển đúng tổng, chưa thu trước | **ĐÃ XÁC MINH CODE:** ghi đúng payload và đánh dấu đã trả (`:83-103`) nếu mã/token hợp lệ; **CHƯA XÁC MINH** với ngân hàng thật. Không chứng minh an toàn cho các trường hợp khác. | Đối chiếu số còn lại trong transaction, test đầy đủ / P0-1. |
| 2 | Chuyển thiếu | **ĐÃ XÁC MINH CODE:** vẫn ghi thành công và đánh dấu đủ dù thiếu (`:85-103`). Sai trạng thái, có nguy cơ thất thu. | Ghi nhận đúng sự kiện và trạng thái chưa đủ theo chính sách / P0-1. |
| 3 | Chuyển dư | **ĐÃ XÁC MINH CODE:** lưu toàn bộ `transferAmount`, đánh dấu đã trả; không thấy quy tắc xử lý khoản dư. FE có thể hiện số còn lại âm. **CHƯA XÁC MINH** chính sách hoàn tiền. | Giữ nguyên số thực nhận, ghi khoản dư để đối soát; chốt chính sách / P2. |
| 4 | Cùng webhook gửi lại tuần tự | **ĐÃ XÁC MINH CODE:** sau lần đầu đánh dấu `DA_THANH_TOAN`, lần sau thường bị bỏ qua (`:78-80`); đây là chặn theo hóa đơn, **không** kiểm tra mã giao dịch. Nếu mã đã chuẩn hóa, nhánh tìm ứng viên loại hóa đơn đã trả và trả “không tìm thấy”. | Kiểm tra và unique mã sự kiện theo nguồn trong DB; trả kết quả idempotent / P1-1. |
| 5 | Hai webhook cùng giao dịch đồng thời | **NGUY CƠ:** cả hai có thể đọc trạng thái chưa trả trước transaction; không có unique `maGiaoDich`, update không có điều kiện (`:56-103`; `schema.prisma:1050-1062`). Có thể tạo hai bản ghi, cần test đồng thời trên DB test. | Unique theo nguồn + khóa/transaction và xử lý xung đột / P1-1. |
| 6 | Không có mã hóa đơn | **ĐÃ XÁC MINH CODE:** trả success và không tạo `ThanhToan` (`:39-49`); tiền thực nếu có không được hệ thống tự gắn/ghi đối soát. | Lưu sự kiện chưa khớp có kiểm soát và cho đối soát / P1-3. |
| 7 | Mã không tồn tại | **ĐÃ XÁC MINH CODE:** trả success, không tạo thanh toán (`:56-75`), không có hàng chờ đối soát trong nhánh này. | Ghi sự kiện chưa khớp, không tự gán nhầm / P1-3. |
| 8 | Hóa đơn đã trả, sau đó nhận chuyển khoản | **ĐÃ XÁC MINH CODE:** mã khớp chính xác → trả đã thanh toán, không ghi giao dịch mới; mã không dấu có thể được báo không tìm thấy do bộ lọc (`:60-80`). Đây có thể là tiền nhận thật khác, không nên lặng lẽ bỏ. | Phân biệt event trùng với event mới, lưu chờ đối soát / P1-3. |
| 9 | Thanh toán nhiều lần | **ĐÃ XÁC MINH CODE:** lần webhook thiếu đầu tiên đánh dấu đã trả; lần sau bị bỏ qua/không tìm thấy. Tiền mặt thủ công có cộng giao dịch cũ nhưng trả trạng thái `BAN_NHAP` nếu chưa đủ (`:194-225`). | Chốt chính sách thu từng phần; theo dõi đủ/thiếu theo tổng thực nhận / P0-1, P2. |
| 10 | Thu tiền mặt trong khi webhook xử lý | **NGUY CƠ:** cả hai đọc số dư/trạng thái trước transaction riêng; có thể ghi vượt, trạng thái phụ thuộc thứ tự; `collectPayment` không khóa và không kiểm tra `DA_HUY`. Chưa test DB đồng thời. | Một cơ chế khóa và tính lại số dư chung cho mọi kênh / P1-2. |
| 11 | Tiền ra | **ĐÃ XÁC MINH CODE:** `transferType !== 'in'` trả bỏ qua trước khi ghi (`:29-34`), không cố ý ghi tiền ra thành tiền vào. **CHƯA XÁC MINH** payload và cấu hình SePay thật. | Giữ kiểm tra hướng; test payload hợp lệ/không hợp lệ / P3. |
| 12 | Giả mạo/không xác thực | **ĐÃ XÁC MINH CODE:** có token → header sai bị từ chối; token rỗng/không có → điều kiện không kiểm tra và service được gọi (`controller.ts:34-48`). **NGUY CƠ** với token bị lộ hoặc môi trường thiếu token; không khẳng định đã bị tấn công. | Fail-closed, không ghi token log, đối chiếu cấu hình SePay / P0-2, P0-3. |

## 6. Xác thực và bảo mật webhook

- **ĐÃ XÁC MINH:** `controller.ts:37-46` so header với token môi trường theo dạng `Apikey` hoặc `Bearer` khi token có giá trị. [Tài liệu SePay](https://docs.sepay.vn/tich-hop-webhooks.html) nêu API Key là một phương thức; cũng có HMAC, OAuth hoặc không xác thực. Source dự án không thấy kiểm tra chữ ký HMAC, OAuth hay IP allowlist tại endpoint này.
- **ĐÃ XÁC MINH:** nếu `SEPAY_API_TOKEN` rỗng/không tồn tại, code bỏ qua kiểm tra. Kiểm tra giá trị tồn tại trong **file cấu hình local** cho thấy khóa này có giá trị; **không đọc/in giá trị**. Điều đó không chứng minh tiến trình đang chạy có đúng token, token trùng cấu hình SePay hay API không bị truy cập qua môi trường khác. SePay dashboard/proxy **chưa kiểm tra**.
- **ĐÃ XÁC MINH:** controller ghi nguyên header Authorization và body trước khi xác thực, kể cả request bị từ chối; log cảnh báo còn có một phần token kỳ vọng (`controller.ts:34-44`). Service cũng log body (`service.ts:26`). **NGUY CƠ:** lộ bí mật và thông tin giao dịch nếu log được truy cập; không khẳng định đã bị lộ. Cần kiểm tra quyền truy cập log, loại bỏ/che thông tin và đánh giá xoay token theo quy trình quản trị.
- **ĐÃ XÁC MINH:** DTO có `accountNumber`/`subAccount`, nhưng service không đối chiếu tài khoản nhận; chọn hóa đơn bằng regex từ `content`, không dùng khóa gắn riêng giao dịch với nghĩa vụ thanh toán (`service.ts:39-75`). **NGUY CƠ:** một giao dịch được xác thực nhưng chứa mã hóa đơn khác hoặc thuộc tài khoản nhận không mong muốn có thể bị gắn nhầm; thực tế còn phụ thuộc cấu hình SePay.
- `dto.transferAmount` dùng `@IsNumber`, không có `@Min`; `transactionDate` là chuỗi. Migration trong repo có CHECK `so_tien > 0`, nhưng **chưa xác minh đã áp dụng trên DB đang chạy**.

## 7. Transaction, chống trùng và đối soát

- Nhánh webhook tạo giao dịch và cập nhật hóa đơn chung `$transaction` (`service.ts:83-103`): giảm nguy cơ chỉ ghi một trong hai nếu rollback; **không** có nghĩa đã khóa số dư hoặc idempotent.
- `ThanhToan.maGiaoDich` chỉ có `@@index`, không có `@unique` trong schema (`schema.prisma:1050-1062`); migration khởi tạo cũng chỉ tạo index thường. Source không tìm giao dịch đã tồn tại trước khi ghi webhook. **CHƯA XÁC MINH** constraint bổ sung trực tiếp trên Neon.
- Webhook lưu `String(dto.id || dto.referenceCode)`, nhưng payload sự kiện gửi `referenceCode` (`service.ts:90,114`); cần xác định namespace và mã định danh ổn định của nhà cung cấp để đối soát, không tự coi hai giá trị là tương đương.
- Nhánh thủ công tính `paid`, `remaining` trước transaction, sau đó `Math.min(soTien, remaining)`; nếu thu dư đầu vào thì chỉ ghi tối đa số còn thiếu, chưa thấy nơi ghi phần dư (`:187-225`). Không có idempotency key. FE còn có nút “Xác nhận thủ công” cho chuyển khoản và tạo reference phía FE (`TrangQuanLyThanhToan.tsx:330-355, 825-833`); ghi chú thủ công không tự ghép giao dịch với webhook.
- Nhánh webhook trả success cho mã không có/không khớp/hóa đơn đã trả và không tạo bản ghi giao dịch ở các nhánh đó. Không thấy nơi tiếp nhận giao dịch mồ côi trong code thanh toán này. Cần thiết kế hộp đối soát theo chính sách, không âm thầm xóa/làm mất giao dịch thực.
- `DA_HUY` không bị nhánh webhook loại trừ trực tiếp; nhánh tìm theo mã chính xác và nhánh fallback chỉ đặc biệt loại `DA_THANH_TOAN`. **NGUY CƠ** cập nhật hóa đơn hủy nếu request khớp và các điều kiện khác thành công; cần test trên DB tách biệt.

## 8. Tạo hóa đơn, số tiền và QR

- **ĐÃ XÁC MINH trong `BE/src`:** điểm gọi `hoaDon.create` tìm thấy ở `PrismaDispensingRepository.dispense`, dòng 275. Cùng transaction có nhánh cập nhật hóa đơn đã tồn tại (`:256-288`). Ngoài runtime có script seed `seed-patient-review-flow.mjs:65` dùng `upsert`; không được nói “chỉ có một nơi trong toàn repo”. Không thấy luồng cọc/lịch hẹn/thu tiền mặt tạo hóa đơn trong các module đã rà.
- **Không kê thuốc:** `ExaminationsService.saveByVisit` dùng mảng rỗng nếu không kê, repository không tạo đơn nếu không có dòng, `markComplete` không tạo hóa đơn; vì vậy luồng runtime thông thường không tự có hóa đơn mới để thu phí khám. Đây là kết luận từ source, không phải kiểm kê dữ liệu thật.
- **Tiền khám:** đọc `visit.chuyenKhoa.phiKham` tại lúc cấp. **Tiền thuốc:** tổng `thanhTien` trên các dòng đơn, không tính trực tiếp từ `ChiTietCapThuoc`; **phí dịch vụ:** hai nhánh create/update tại `prisma-dispensing.repository.ts:250-283` đặt 0. Không thể suy ra mọi bản ghi cũ trong DB đều có `phiDichVu = 0`.
- `DispensingService.dispense:173-198` kiểm tra số lượng theo từng phần tử payload, nhưng không thấy kiểm tra payload bao phủ chính xác **mọi** dòng đơn hoặc không lặp dòng; **NGUY CƠ** tổng từ toàn đơn không phản ánh chính xác phần cấp nếu payload bỏ sót/lặp. Cần kiểm thử an toàn, không khẳng định đã phát sinh.
- Migration trong repo yêu cầu `tong_tien = tien_kham + tien_thuoc + phi_dich_vu - so_tien_giam`, nhưng **chưa xác minh migration có trên DB đang chạy**. Không thấy constraint so tổng với tổng các dòng `ChiTietHoaDon`; không thể khẳng định mọi dữ liệu lịch sử đều đúng. Nhánh cập nhật phí không đặt lại `soTienGiam`, vì vậy cần xét dữ liệu giảm giá trước khi thay đổi.
- **Hóa đơn đã trả:** nhánh cấp thuốc chặn `DA_THANH_TOAN` (`:260`), nhưng không có bằng chứng về bất biến toàn hệ thống/DB. Hóa đơn chưa trả hoặc trả một phần có thể bị cập nhật lại và `deleteMany` chi tiết (`:264-292`); phải bảo vệ lịch sử và khoản đã thu.
- **QR:** FE khởi tạo `amount = total - paid`, chuyển khoản đặt lại số còn lại, URL gồm `Math.trunc(paymentAmount)` và mã hóa đơn (`TrangQuanLyThanhToan.tsx:213-238, 710+`). **NGUY CƠ:** trạng thái FE có thể cũ khi dữ liệu thay đổi ở phiên khác, số tiền có thể bị sửa khi chuyển, hoặc phần thập phân bị cắt. Không thể bảo đảm số tiền thực nhận luôn bằng QR. FE cần tải lại/đối chiếu server; BE vẫn phải kiểm tra thực nhận.
- Mỗi `HoaDon.luotKhamId` là unique (`schema.prisma:1019`); webhook khớp một mã hóa đơn từ nội dung. Hai lượt có thể có hai hóa đơn riêng; source không thấy cơ chế một QR phân bổ vào nhiều hóa đơn. Không triển khai gộp trong nhiệm vụ này.

## 9. Danh sách phát hiện và độ ưu tiên

**3 P0:**

1. **P0-1 — Thanh toán thiếu vẫn đủ:** `handleSePayWebhook` bỏ qua kiểm tra số tiền/số đã thu → sai quyết toán (`thanh-toan.service.ts:83-103`).
2. **P0-2 — Xác thực fail-open:** token môi trường thiếu/rỗng thì endpoint nhận request không kiểm tra header (`thanh-toan.controller.ts:37-48`). Cấu hình local có token, runtime/dashboard chưa xác minh.
3. **P0-3 — Log lộ bí mật:** ghi đầy đủ Authorization trước xác thực và ghi body (`thanh-toan.controller.ts:34-44`; `thanh-toan.service.ts:26`). Nguy cơ phụ thuộc ai có quyền đọc log.

**6 P1:**

1. **P1-1 — Chống trùng giao dịch không đủ:** không unique/check event theo nguồn; webhook đồng thời có nguy cơ ghi lặp (`schema.prisma:1050-1062`; `service.ts:56-103`).
2. **P1-2 — Race giữa các kênh thu:** số dư/trạng thái đọc trước transaction; không khóa/conditional update chung cho cash/webhook (`service.ts:56-103,187-225`).
3. **P1-3 — Bỏ qua sự kiện cần đối soát:** mã lạ, không mã, hóa đơn đã trả không tạo bản ghi thu; một sự kiện mới có tiền thực có thể không được đối soát (`service.ts:39-80`).
4. **P1-4 — Không có hóa đơn cho khám không kê thuốc:** luồng khám không tạo, runtime tạo ở cấp thuốc (`examinations.service.ts:341-402`; `prisma-dispensing.repository.ts:250-283`).
5. **P1-5 — Ghi lại hóa đơn chưa trả và chênh số cấp thực tế:** cập nhật tổng, xóa/tạo lại dòng; tổng thuốc theo đơn thay vì trực tiếp theo bản ghi thực cấp, cần xác minh đầy đủ payload (`prisma-dispensing.repository.ts:250-315`; `dispensing.service.ts:173-198`).
6. **P1-6 — Thiếu đối chiếu tài khoản nhận/mã:** không kiểm tra `accountNumber`, mã tìm từ nội dung do người chuyển nhập; nguy cơ gắn sai hóa đơn (`sepay-webhook.dto.ts:22`; `service.ts:39-75`).

**P2:** thiếu quy tắc thanh toán một phần/chuyển dư/hủy và xác thực số tiền thủ công ở backend; FE có thể hiển thị nhãn đã trả kèm số còn thiếu hoặc số còn âm; thông tin đối chiếu `id` và `referenceCode` chưa thống nhất.

**P3:** hạn chế log, mã hóa/ẩn thông tin nhạy cảm, giám sát sự kiện thất bại/chưa khớp, tối ưu tìm mã chuẩn hóa thay vì tải nhiều hóa đơn, bổ sung trạng thái tải lại khi socket reconnect.

## 10. Đề xuất sửa cụ thể — CHƯA TRIỂN KHAI

| Nhóm/file dự kiến | Thay đổi dự kiến | Migration? | Ảnh hưởng và kiểm tra |
|---|---|---|---|
| P0: `BE/src/modules/thanh-toan/thanh-toan.controller.ts`, DTO | Fail-closed nếu thiếu cấu hình; dùng cơ chế xác thực tương thích cấu hình SePay đã xác nhận; bỏ/che Authorization và body nhạy cảm; validate loại, số tiền, thời gian. | Không bắt buộc chỉ để sửa controller/DTO. | Test token thiếu/sai/đúng bằng mock; không gửi secret/log; không thay cách thu tiền mặt. |
| P0/P1: `thanh-toan.service.ts:handleSePayWebhook` và `collectPayment` | Lưu sự kiện chính xác, đối chiếu tài khoản/mã, tính đã thu/còn thiếu lại **bên trong** cơ chế đồng thời chung; chỉ đánh dấu đủ khi thỏa chính sách; chống trùng, bảo vệ `DA_HUY`/đã trả. Giữ tiền mặt và webhook nhất quán. | **Đề xuất cần** migration additive cho khóa idempotency theo nhà cung cấp và lưu sự kiện chưa khớp; thiết kế cụ thể phụ thuộc kiểm tra dữ liệu cũ và chính sách. | Ảnh hưởng SePay, thu ngân, tiền mặt, báo cáo/đối soát; phải test retry, đồng thời và dữ liệu cũ bằng DB test riêng. |
| P1: `schema.prisma`, migration additive | Cân nhắc bảng sự kiện nhận tiền riêng, unique theo nguồn + external ID, trạng thái chưa khớp, tách phần nhận/phân bổ, index. Không unique mù quáng `maGiaoDich` vì có null/dữ liệu cũ/đa nguồn. | Có nếu chọn thiết kế durable/unique ở DB. Chỉ soạn sau khi kiểm tra dữ liệu, backup, backfill và được duyệt DB đích. | Đảm bảo tương thích hóa đơn/giao dịch cũ và rollback; không chạy migration trong khảo sát. |
| P1: `examinations.service.ts`, repository khám, repository cấp thuốc | Thiết kế tạo phí khám độc lập khỏi cấp thuốc, giữ snapshot, không tính lặp/ghi lại hóa đơn đã chốt; xác nhận cách xử lý phí phát sinh sau khi đã thu. | Có thể cần additive; **chưa kết luận thiết kế/migration cụ thể**. | Ảnh hưởng bác sĩ, dược sĩ, thu ngân, tiền mặt; phải chốt nghiệp vụ trước và test toàn luồng. |
| P2: `TrangQuanLyThanhToan.tsx`, `payment.api.ts` | Hiển thị trạng thái và còn thiếu/dư theo server, không báo đủ khi mới nhận thiếu; tải lại khi reconnect, xử lý thao tác thủ công và QR cũ. | Không riêng cho giao diện. | Kiểm tra socket, refresh, in hóa đơn, tiền mặt và phân quyền; FE không thay thế xác thực/đối soát BE. |
| P3: `realtime`, báo cáo thu ca, patient portal | Rà consumer dựa trên `DA_THANH_TOAN`; thông báo sau commit, hỗ trợ đồng bộ lại từ API và cảnh báo sự kiện chờ xử lý. | Tùy thiết kế inbox/sự kiện. | Hồi quy báo cáo, bệnh nhân xem lịch sử và thu ca; không gửi socket chứa dữ liệu nhạy cảm quá mức. |

Chính sách cần chủ dự án chốt: có nhận thanh toán từng phần không; dư tiền giữ/hoàn/đối soát ra sao; hóa đơn đã thu rồi phát sinh phí thì lập khoản bổ sung thế nào; xử lý khi không khớp mã; không tự thay đổi thứ tự cấp thuốc/thu tiền.

## 11. Kịch bản test cho bản sửa

**CHƯA CHẠY trong khảo sát này.** Chỉ chạy trên DB phát triển riêng đã backup, dữ liệu giả và cấu hình SePay test được chấp thuận; không dùng tiền, webhook hoặc hồ sơ thật.

1. 500.000/500.000, 50.000/500.000, 600.000/500.000; nhiều lần thanh toán; có giao dịch đã thu trước; kiểm tra tổng, trạng thái, từng khoản, QR và FE.
2. Cùng ID lặp tuần tự, hai request trùng đồng thời, hai ID khác nhau cùng hóa đơn, cùng ID khác nội dung; kiểm tra chỉ một sự kiện, không mất khoản cần đối soát.
3. Thiếu/sai/đúng token; token cấu hình thiếu; payload sai, tài khoản nhận sai, mã hóa đơn không có/không tồn tại/nhầm; bảo đảm 401/403 hoặc trạng thái đối soát theo thiết kế và không lộ bí mật trong log.
4. Hóa đơn đã trả/đã hủy; chuyển khoản đến sau; thu ngân tiền mặt và webhook đồng thời; chuyển khoản thủ công và webhook; mất kết nối sau commit; kiểm tra retry/idempotency và không sửa lịch sử.
5. Khám có thuốc/không thuốc; cấp lại, hai lần cấp đồng thời, thiếu/bỏ sót dòng cấp, tồn kho thay đổi; không nhân đôi phí khám hoặc trừ kho sai.
6. QR trạng thái cũ, reconnect socket, tải lại trang, in hóa đơn, báo cáo và bàn giao ca; kiểm tra quyền các role và lịch sử dữ liệu cũ.
7. Kiểm tra migration, unique, backfill, rollback trên DB test có dữ liệu mô phỏng và các mã cũ trùng/null; không chạy lên Neon dùng chung khi chưa có chấp thuận.

## 12. Kết luận và ranh giới bàn giao

Có thể ưu tiên sửa an toàn **riêng nhánh SePay và đối soát** trước chức năng X-quang/đa chuyên khoa, nhưng phải rà tương tác tiền mặt, thu ngân, báo cáo và luồng hóa đơn; việc bảo đảm idempotency bền vững khuyến nghị migration additive sau khi thiết kế và kiểm tra dữ liệu. Việc tạo hóa đơn cho khám không kê thuốc là một thay đổi nghiệp vụ liên quan, có thể lập kế hoạch riêng hoặc cùng giai đoạn sau khi chốt chính sách; không thể coi là đã được xử lý chỉ vì sửa webhook.

**ĐÃ LÀM:** đọc source, schema/migration/test, kiểm tra sự tồn tại của cấu hình mà không công bố giá trị, đối chiếu tài liệu công khai của SePay.  
**CHƯA LÀM:** sửa code, chạy test/build, gọi webhook, truy cập/giao dịch database, kiểm tra cấu hình server/dashboard hoặc thay đổi Git.  
**File tạo mới duy nhất:** `danh_gia_sepay_v24.md`. Trước khi tạo báo cáo, `git status --short` trống. Không chạy Git mutation.
