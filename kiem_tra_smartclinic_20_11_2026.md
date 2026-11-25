# Rà soát mã nguồn SmartClinic — 20/11/2026

**Đối tượng:** `Nhom20.zip` do người dùng cung cấp. **Phương pháp:** giải nén có chọn lọc và đọc tĩnh mã nguồn React/NestJS/Prisma, migration, một số script seed và báo cáo dự án. Không sửa source, không kết nối Neon/SePay, không chạy migration hoặc test/build trong phiên rà soát này. File `.env` và `.git` không được giải nén vào thư mục phân tích.

## Tổng quan

V24.2 **đã có code** cho `ChiDinhDichVu`, danh mục cận lâm sàng, nhập kết quả mô phỏng, `CHO_KET_QUA`, quay lại theo lượt khám, phí khám không thuốc, liên kết dòng phí dịch vụ và bảo vệ dòng phí khi dược sĩ cấp thuốc. Bản ZIP chứa hai migration `20261117000000_add_service_orders` và `20261118000000_add_waiting_visit_status`. Không thể suy ra tình trạng triển khai trên database thật chỉ từ ZIP.

Báo cáo `DANH_GIA/bao_cao_smartclinic_v24_2_mvp.md` nêu trong lượt kiểm thử cuối **232 backend PASS + 25 browser PASS + 1 browser FAIL**, đồng thời PostgreSQL integration/E2E thật **BLOCKED/NOT RUN**. Đây là kết quả *được báo cáo*, không phải phép thử được tái chạy trong phiên phân tích này.

## Các vấn đề / rủi ro cần xử lý

### 1. [P1 — phải sửa trước demo] Hóa đơn `DA_HUY` vẫn có thể hiển thị nút thu tiền

- `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx:88-112`: status chỉ phân biệt `DA_THANH_TOAN`, thanh toán một phần và chưa thanh toán.
- Cùng file `:729-731, :839-847`: form và nút thu tiền chỉ kiểm tra còn tiền, `ready`, quyền; không loại trừ hóa đơn hủy.
- Test browser bị FAIL tái hiện lỗi này trong `DANH_GIA/bao_cao_smartclinic_v24_2_mvp.md`, mục 21.3. Backend `BE/src/modules/thanh-toan/thanh-toan.service.ts:281-286` đã chặn thu tiền cho hóa đơn hủy.
- **Khắc phục:** map trạng thái `Đã hủy`, ẩn QR/form/nút ghi thu, vẫn cho xem chi tiết và lịch sử; kiểm tra cả nút bảng và modal; chạy lại test FAIL.

### 2. [P1 — thanh toán thật] Chống trùng SePay chưa bền vững trên toàn hệ thống

- `BE/prisma/schema.prisma:1051-1070`: `ThanhToan.maGiaoDich` chỉ `@@index`, không `@unique` theo nguồn.
- `BE/src/modules/thanh-toan/thanh-toan.service.ts:93-126`: kiểm tra trùng trong transaction theo khóa hóa đơn, không chứng minh ngăn hai hóa đơn khác nhau nhận cùng mã sự kiện khi đồng thời.
- **Khắc phục:** thiết kế unique khóa sự kiện theo nguồn ngân hàng, kiểm tra dữ liệu cũ, migration additive trên DB test; test hai webhook đồng thời và khác hóa đơn.

### 3. [P1 — thanh toán thật] Giao dịch không khớp/đến sớm chưa có nơi đối soát

- `BE/src/modules/thanh-toan/thanh-toan.service.ts:53-86`: webhook không mã/không khớp hóa đơn được trả thành công nhưng không ghi ledger chờ xử lý.
- Cùng file `:127, :333-345`: yêu cầu đơn phải cấp xong; nếu tiền đã vào ngân hàng trước khi thuốc cấp, request có thể bị từ chối trước `thanhToan.create`.
- **Khắc phục:** ghi sự kiện nhận tiền (inbox) và trạng thái chưa khớp; chỉ đánh dấu đủ khi đối soát xong; xác minh tài khoản thụ hưởng và tính duy nhất giao dịch. Không bỏ guard dược sĩ chỉ để có giao diện xanh.

### 4. [P1 — dữ liệu bệnh nhân thật] Hồ sơ nháp lưu plaintext vào localStorage

- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx:19-49, :181-205, :259-279`: lưu/khôi phục triệu chứng, ICD, kết luận, thông tin thuốc; khóa chỉ dựa ID lượt khám.
- **Khắc phục trước dùng thật:** chiến lược xóa khi logout/đổi tài khoản, TTL, cách ly key theo tài khoản; cân nhắc giảm dữ liệu nhạy cảm lưu client và có XSS controls. Với dữ liệu giả dùng demo là giới hạn có thể nêu trong khóa luận.

### 5. [P1 — bảo đảm chất lượng] Chưa có kết quả kiểm thử tích hợp PostgreSQL thật

- Báo cáo V24.2 mục 21 cho biết chưa chạy FK/unique/rollback/race và chuỗi FE → BE → DB/Socket.IO thật.
- Không được xem 232 test backend PASS là E2E PASS.
- **Cần test DB riêng:** double-click tạo chỉ định; một chỉ định một dòng phí; giao dịch tạo dòng rồi rollback; hai cập nhật hóa đơn đồng thời; thuốc + phí X-quang; hủy chỉ định; thay trạng thái A → B → A; SePay tiền mặt/webhook đồng thời.

### 6. [P2 — demo] Nút bác sĩ hiển thị thông điệp sai khi không kê thuốc

- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx:994-1001`: nhãn `Hoàn tất khám & chuyển Dược` dù luồng không thuốc theo code được gửi thẳng thu ngân.
- **Khắc phục:** nhãn động `Hoàn tất khám & chuyển Thu ngân` khi không có đơn, hoặc nhãn trung tính `Hoàn tất khám`; xác minh modal xác nhận không thuốc.

### 7. [P2 — API/dữ liệu] Danh sách hóa đơn trả nhiều dữ liệu hơn cần thiết và không phân trang Backend

- `BE/src/modules/thanh-toan/thanh-toan.service.ts:200-237`: `hoaDon.findMany` không có phân trang và `benhNhan: true` trả toàn bộ trường bệnh nhân cho client thu ngân.
- **Khắc phục:** chọn các trường bệnh nhân cần thiết, pagination + filter từ server nếu dữ liệu lớn.

### 8. [P2 — đóng gói] Package có lệnh seed/script không tồn tại trong ZIP

- `BE/package.json`: có ít nhất 16 entry `node prisma/seed-data/*.mjs` trỏ đến file không hiện diện trong bản ZIP, ví dụ `seed-appointments.mjs`, `seed-patients-history.mjs`, `backfill-invoice-details.mjs`, `audit-data-completeness.mjs`. Nếu đúng là workspace triển khai, các script đó sẽ lỗi khi gọi.
- **Khắc phục:** đối chiếu tên script thực, phục hồi file hợp lệ hoặc bỏ lệnh lỗi; không tự chạy `db:seed:clinic` lên Neon dùng chung.

### 9. [P1 — chia sẻ tài liệu] ZIP chứa `.env` và `.git`

- Trong `Nhom20.zip` có `Nhom20/BE/.env`, `Nhom20/FE/.env` và thư mục `.git` với lịch sử git. Không trích xuất, đọc hoặc công bố giá trị bí mật trong phiên rà soát.
- **Khắc phục:** khi gửi dự án cho thành viên/giáo viên/AI, loại `.env`, `.git`, backups, dump và tạo `.env.example` không chứa bí mật. Nếu file thực đã bị chia sẻ công khai, đánh giá nhu cầu đổi token/secret.

### 10. [P2 — phạm vi] Giới hạn tính phí và luồng đa chuyên khoa

- V24.2 ghi phí cận lâm sàng khi hoàn tất khám (`BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts:191-403`), không làm thu trước khi chụp.
- `HoaDon.luotKhamId @unique`: chưa gộp nhiều chuyên khoa trong một đợt; đây là **phạm vi đã chốt**, không nên xem là bug của V24.2.
- `ChiDinhDichVu.ketQua` là kết quả do bác sĩ nhập thủ công mô phỏng; không phải tích hợp X-quang thật.

## Điểm đã làm đúng trong source

- `BE/src/modules/chi-dinh-dich-vu/service-orders.service.ts:65-110, :141-225`: xác minh bác sĩ sở hữu lượt, kiểm tra dịch vụ cận lâm sàng hoạt động, idempotency, chặn trạng thái sai và audit.
- `BE/src/modules/chi-dinh-dich-vu/repositories/prisma-service-order.repository.ts:46-107`: transaction có row lock `luot_kham` và `hoa_don`.
- `BE/prisma/schema.prisma:1271-1360`: unique `ChiTietHoaDon.chiDinhDichVuId` và `ChiDinhDichVu.idempotencyKey` (không cấm chỉ định lặp hợp lệ).
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts:191-403`: từ chối chốt khi chỉ định chờ; phí hoàn tất có liên kết chỉ định; đối soát dòng phí có sẵn.
- `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts:250-351`: `deleteMany` giới hạn `TIEN_THUOC`, giữ dòng phí khám/dịch vụ.
- `BE/src/modules/kham-benh/waiting-visits.service.ts:43-101`: bác sĩ sở hữu lượt, chuyển trạng thái đợi/tiếp tục; không tạo lượt khám mới.
- `BE/src/modules/thanh-toan/thanh-toan.controller.ts:29-52`: webhook thiếu token từ chối, không log header bí mật ở nhánh này.

## Trình tự khắc phục gợi ý

1. **Trước buổi demo:** sửa trạng thái hóa đơn hủy/nút thu; sửa nhãn hoàn tất bác sĩ; kiểm thử trình duyệt tương tác có/không thuốc, chờ kết quả, X-quang, bảng phí; xác minh danh mục dịch vụ trong DB đích.
2. **Trước khi tuyên bố E2E:** tạo PostgreSQL test tách biệt, chạy migration ở đó và test chuỗi thực (không sử dụng Neon dùng chung làm sandbox).
3. **Trước khi nhận tiền thật:** chống trùng sự kiện theo DB, ledger chưa đối soát, xác minh tài khoản nhận, test webhook cùng cash và xử lý đơn từ chối cấp.
4. **Trước khi chia sẻ ZIP:** loại secrets/git history và đối chiếu package scripts. Đối với hệ thống dùng bệnh nhân thật, ưu tiên xử lý localStorage y tế và giới hạn dữ liệu API.

**Lưu ý:** kết quả về khả năng chạy thực tế, dữ liệu Neon hiện tại, cấu hình SePay và các race condition chưa được xác minh. Không chỉnh source, không kết nối dịch vụ thật hoặc sửa dữ liệu.
