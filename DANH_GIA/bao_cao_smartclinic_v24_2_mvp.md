# SmartClinic V24.2 MVP — Báo cáo theo checkpoint

Ngày: 17/11/2026. Nhánh: `Tram`.

## Phạm vi và trạng thái

- Bước 1: đã khảo sát source, không sửa file tại bước khảo sát; người dùng đã duyệt Bước 2.
- Bước 2: đã sửa phần bảo vệ hóa đơn và bổ sung chặn request cấp thuốc thiếu/trùng dòng theo phê duyệt. Code và kiểm thử mock PASS; PostgreSQL integration BLOCKED, E2E chưa xác nhận.
- Bước 3: đã được duyệt thiết kế và triển khai model/API chỉ định, phân loại dịch vụ và chặn hoàn tất khi còn chỉ định chờ. 119 test liên quan PASS; chi tiết và từ điển dữ liệu để đưa vào Word ở mục 8–12.
- Bước 4: đã triển khai giao diện chỉ định, nhập/xem kết quả mô phỏng và hủy; 12 test trình duyệt với API giả lập PASS, 63 test BE liên quan PASS, build FE/BE PASS (mục 17). Chưa xác nhận E2E với PostgreSQL thật.
- Bước 5: đã triển khai nháp an toàn, trạng thái chờ/mở lại theo visitId và lọc dịch vụ công khai theo phê duyệt. 111 test BE và 19 test browser API giả lập PASS; build FE/BE PASS. Migration CHO_KET_QUA đã áp dụng riêng lên Neon sau khi chủ dự án duyệt; xem mục 19. Chưa kiểm thử E2E/database thật.
- Bước 6–7: CHƯA THỰC HIỆN. Chưa cộng phí chỉ định vào hóa đơn hoặc xác nhận E2E với database thật.
- Schema đã bổ sung trong Bước 3. Sau phê duyệt riêng của chủ dự án, migration `20261117000000_add_service_orders` đã áp dụng và đọc lại thành công trên Neon ngày 17/11/2026 (mục 14). Lượt migration không chạy seed; lượt bổ sung danh mục đã seed riêng theo phê duyệt (mục 16). Không Git mutation; không chạy migration phân quyền cũ.
- Không thêm khoa, role, lịch trực; không sửa FEFO hoặc thuật toán tồn kho.

## 1. Điều xác minh từ source

1. Hóa đơn không thuốc còn trong các thay đổi có sẵn: `PrismaExaminationRepository.markComplete` upsert hóa đơn theo lượt khám, phí khám lấy từ chuyên khoa, thuốc/dịch vụ ban đầu bằng 0; service phát `invoice.ready`, FE thu ngân tải lại danh sách. Chưa tính dịch vụ chỉ định.
2. Trước sửa, repository cấp thuốc đặt `phiDichVu = 0`, tính tổng chỉ gồm khám + thuốc và `deleteMany` tất cả dòng hóa đơn. Đây là điểm làm mất phí dịch vụ.
3. Có GET/POST draft/POST complete tại `/examinations/visit/:visitId`; bác sĩ phải sở hữu lượt khám. Trang khám dùng query `luotKhamId`; API active chỉ là fallback khi thiếu ID, lấy lượt `DA_VAO_PHONG` mới nhất.
4. Nháp có lưu ICD và thuốc, localStorage phục hồi theo lượt khám. Rủi ro: service chuyển `dto.prescription ?? []`, vì vậy request bỏ trường prescription có thể xóa đơn đã lưu. Cần test chuyển A/B và reset state; chưa chứng minh an toàn trên trình duyệt.
5. Seed hiện hành `BE/prisma/seed-data/seed-services.mjs` khai báo 8 dịch vụ khám. Chưa xác minh danh mục Neon có X-quang/xét nghiệm. GET local `http://localhost:5173/api/v1/services` thất bại vì không kết nối được. Không suy ra Neon không có dịch vụ từ seed.
6. Có 6 file sửa dở trước lượt này, liệt kê bên dưới; không có file SePay/chứng chỉ trong Git status ban đầu. Không kết luận gì về lịch sử commit ngoài kiểm tra này.
7. Tiền khám lấy `visit.chuyenKhoa.phiKham`, không chọn từ dịch vụ có khoa null. Đồng bộ giá dịch vụ/phí khám dựa tên chính xác `Khám <tên chuyên khoa>`; `DichVu` chưa có trường phân loại khám/cận lâm sàng.
8. `ServiceCards` lấy tất cả dịch vụ hoạt động và đều có nút đặt lịch. Dịch vụ khoa null dẫn tới trang đặt lịch không có khoa chọn sẵn. Đề xuất bổ sung phân loại có cấu trúc và lọc dịch vụ khám ở nơi đặt lịch; không dùng khoa null hoặc tên để suy đoán. Chờ duyệt schema/phạm vi trước khi sửa.
9. Enum lượt khám gồm DA_DANG_KY, DANG_CHO, DA_VAO_PHONG, DA_HOAN_TAT, DA_HUY. Phụ thuộc ở tiếp đón, hàng chờ, khám bệnh, lịch hẹn, cổng bệnh nhân; FE có type hàng chờ và biểu đồ tiếp đón. Service khám hiện chỉ ghi hồ sơ khi DANG_CHO/DA_VAO_PHONG. Chưa có chờ kết quả/danh sách chờ kết quả.
10. Khác mô tả prompt: DTO Cơ Xương Khớp có `ketQuaXQuang`, nhưng component `KhamCoXuongKhop.tsx` hiện chỉ có vị trí đau, mức đau, vận động, tiền sử chấn thương. Không tự thêm nơi lưu kết quả thứ hai hoặc chuyển dữ liệu cũ.
11. Socket có phòng theo user, role, doctor và specialty. AuditLog sẵn có nhưng ghi best-effort; chưa bảo đảm audit chỉ định cùng transaction.
12. SePay đang phân biệt `payment.partial` và `payment.success`, cộng các khoản đã thu. Bước này không sửa thanh toán. Mock không chứng minh chống race ở PostgreSQL.

## 2. Bản sửa Bước 2

- Chỉ xóa/tạo lại dòng `TIEN_THUOC`; giữ nguyên dòng DICH_VU, PHU_THU, KHAC, PHI_KHAM.
- Giữ tiền khám snapshot, phí dịch vụ và giảm giá của hóa đơn đã có.
- Tổng mới = tổng hiện tại - tiền thuốc cũ + tiền thuốc mới. Không âm thầm tính lại khoản khác hoặc sửa hóa đơn cũ đã sai số liệu.
- Chỉ thêm dòng PHI_KHAM nếu chưa có; hóa đơn mới vẫn có phí khám và thuốc như luồng trước.
- Chặn hóa đơn DA_THANH_TOAN và DA_HUY; giữ transaction Serializable hiện có.
- Giữ nguyên code xuất lô, trừ tồn, ghi giao dịch kho. Việc rollback khi ném lỗi vẫn phụ thuộc transaction PostgreSQL, chưa được kiểm chứng bằng mock.
- Không sửa lại luồng không thuốc; bổ sung test kiểm tra phần code có sẵn.

### Bổ sung đã duyệt ngày 17/11/2026

- Người dùng duyệt sửa `dispensing.service.ts` và bổ sung test, xác nhận chưa có DB test riêng, ghi BLOCKED integration.
- Thêm kiểm tra ID dòng không trùng và số dòng request phải bằng số dòng đơn thuốc, không chấp nhận đơn không có thuốc. Kết hợp kiểm tra ID thuộc đơn hiện có để bảo đảm đúng toàn bộ tập dòng, không chỉ so số lượng phần tử.
- Kiểm tra nằm trước lời gọi repository ghi dữ liệu; khi sai không gọi cấp thuốc, audit thành công, socket hoặc thông báo thành công.
- Giữ kiểm tra số lượng cấp đúng từng dòng. Cho phép đổi thứ tự dòng và chia một thuốc qua nhiều lô.
- Không triển khai cấp một phần, không đổi cách tính giá hoặc thuật toán FEFO/tồn kho. Không sửa DTO/controller hoặc API response.
- Giới hạn: đây là validation request tại service; mock không xác nhận tính an toàn của hai request cấp thuốc đồng thời hoặc dữ liệu đơn bị thay đổi giữa đọc và ghi. Các trường hợp đó vẫn cần PostgreSQL test.

## 3. Test và build thực tế

| Kiểm tra | Kết quả |
|---|---|
| Test trước sửa, 2 suite hóa đơn | 7 PASS, 4 FAIL (tái hiện xóa dòng phí, đặt phí về 0, tạo lại phí khám, cập nhật hóa đơn hủy) |
| Test sau sửa, 2 suite hóa đơn | 11 PASS, 0 FAIL; chạy lại sau chỉnh test vẫn 11 PASS |
| Test request cấp thuốc trước sửa bổ sung | 7 PASS, 5 FAIL: tái hiện thiếu dòng, rỗng, lặp dòng, đơn không có thuốc |
| Test request cấp thuốc sau sửa bổ sung | 12 PASS, 0 FAIL |
| Hồi quy thanh toán/SePay, 5 suite | 31 PASS, 0 FAIL |
| Chạy lại toàn bộ 8 suite liên quan sau bổ sung | 54 PASS, 0 FAIL |
| Lint file test request mới | PASS (chỉ tự định dạng file test mới, không format service cũ) |
| Lint 3 file BE của Bước 2 | Ban đầu 35 lỗi định dạng/kiểu mock; sau chỉnh còn 3 lỗi; đã sửa và kiểm tra lại không còn lỗi |
| Build BE | PASS (`npm.cmd run build`) |
| Build FE | PASS (`tsc -b && vite build`), có cảnh báo chunk > 500 kB |
| PostgreSQL integration, rollback, foreign key, concurrency | BLOCKED: chưa có DB test riêng được xác minh an toàn |
| Trình duyệt, webhook thật, A/B, E2E | NOT RUN |
| Lint toàn dự án | NOT RUN; không chạy script BE lint tự sửa hàng loạt |

Tại checkpoint Bước 2: 54 PASS, 0 FAIL trên 8 suite (23 test hóa đơn/request và 31 test thanh toán). Đây là kiểm thử mock/HTTP giả lập, không phải PostgreSQL thật. Tại thời điểm đó chưa triển khai chỉ định dịch vụ. Kết quả mới nhất sau Bước 3 được ghi riêng ở mục 11.

PowerShell chặn `npm.ps1`; dùng `npm.cmd`, không thay execution policy.

Lệnh kiểm tra:

```text
BE: npm.cmd test -- --runInBand --runTestsByPath src/modules/cap-thuoc/dispensing-invoice.spec.ts src/modules/kham-benh/examination-invoice.spec.ts
BE: npm.cmd test -- --runInBand --runTestsByPath src/modules/cap-thuoc/dispensing-request.spec.ts
BE: npm.cmd test -- --runInBand --runTestsByPath src/modules/thanh-toan/sepay-v24-1.service.spec.ts src/modules/thanh-toan/sepay-v24-1.auth.spec.ts src/modules/thanh-toan/sepay-v24-1.logging.spec.ts src/modules/thanh-toan/thanh-toan.service.spec.ts src/modules/thanh-toan/thanh-toan.controller.spec.ts
BE: npx.cmd eslint src/modules/cap-thuoc/dispensing-invoice.spec.ts src/modules/kham-benh/examination-invoice.spec.ts src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts
BE/FE: npm.cmd run build
```

## 4. File thay đổi

### Đã có trước lượt này — giữ nguyên

1. `BE/src/modules/kham-benh/examinations.service.ts`
2. `BE/src/modules/kham-benh/repositories/examination.repository.interface.ts`
3. `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`
4. `BE/src/modules/thoi-gian-thuc/realtime.events.ts`
5. `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`
6. `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx`

### Thay đổi trong Bước 2 này

- MODIFY: `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts`
- MODIFY (bổ sung đã duyệt): `BE/src/modules/cap-thuoc/dispensing.service.ts`
- NEW (bổ sung đã duyệt): `BE/src/modules/cap-thuoc/dispensing-request.spec.ts`
- NEW: `BE/src/modules/cap-thuoc/dispensing-invoice.spec.ts`
- NEW: `BE/src/modules/kham-benh/examination-invoice.spec.ts`
- NEW: `DANH_GIA/bao_cao_smartclinic_v24_2_mvp.md`
- Không xóa file. Giữ test hồi quy; không xóa hoặc đổi test có sẵn để qua test.

## 5. Rủi ro cần duyệt trước khi tiếp tục

- Rủi ro request thiếu/trùng dòng đã được xử lý theo phê duyệt và xác minh bằng mock. Không khẳng định đã giải quyết race giữa các request hoặc dữ liệu bị sửa đồng thời.
- Người dùng xác nhận chưa có DB test riêng: PostgreSQL integration BLOCKED. Không dùng Neon chung làm test, không tuyên bố E2E PASS.
- Thiết kế model/migration đã được duyệt và chuẩn bị ở Bước 3; chưa áp dụng lên database.
- Cần chốt cách xử lý trường X-quang cũ và lọc dịch vụ công khai trước các bước liên quan.

## 6. Luồng và bước tiếp theo

Hiện có: bác sĩ hoàn tất → không thuốc: hóa đơn phí khám → thu ngân; có thuốc: dược sĩ cấp → hóa đơn giữ phí cũ + thay tiền thuốc → thu ngân.

Mục tiêu các bước CHƯA TRIỂN KHAI: bác sĩ → chỉ định → chờ kết quả → bác sĩ nhập kết quả mô phỏng → hoàn tất → dược sĩ (nếu có thuốc) / thu ngân.

Kết quả nhập thủ công phục vụ mô phỏng quy trình cận lâm sàng. Chưa tích hợp thiết bị chẩn đoán.

Bước 2 đã kết thúc. Người dùng đã duyệt thiết kế và triển khai Bước 3. Checkpoint hiện tại: kết thúc phần code/test Bước 3, dừng chờ duyệt Bước 4; integration vẫn BLOCKED.

## 7. Triển khai PC main (chưa thực hiện)

Sau khi người dùng duyệt các checkpoint và hoàn tất kiểm thử: chuyển đầy đủ các file phụ thuộc của luồng không thuốc cùng bản sửa hóa đơn; build/test lại trên PC. Bước 2 không có migration. Nếu bước sau thêm migration, phải duyệt riêng, kiểm thử DB riêng và sao lưu trước khi người dùng quyết định triển khai Neon chung. Không chạy Git mutation hoặc seeder tổng trong tác vụ này.

## 8. Bước 3 — cấu trúc bảng để đưa vào Word

### 8.1. Mô tả chức năng bảng

Tên thực thể Prisma: **ChiDinhDichVu**. Tên bảng PostgreSQL: **chi_dinh_dich_vu**.

Bảng lưu từng lần bác sĩ chỉ định một dịch vụ cận lâm sàng trong một lượt khám. Mỗi bản ghi xác định dịch vụ, bác sĩ chỉ định, lý do, đơn giá tại thời điểm xác nhận và trạng thái xử lý. Bảng đồng thời lưu kết quả văn bản do bác sĩ nhập mô phỏng hoặc thông tin hủy. Không tạo bảng kết quả riêng, không tạo khoa/role kỹ thuật viên và không tích hợp thiết bị chẩn đoán.

Một lượt khám có thể có nhiều chỉ định; cùng một dịch vụ có thể được chỉ định nhiều lần hợp lệ. Mỗi lần có ID và khóa yêu cầu riêng. Bảng có **17 cột dữ liệu**; các thuộc tính relation trong Prisma không phải cột bổ sung.

### 8.2. Từ điển dữ liệu — 17 cột

| STT | Tên cột PostgreSQL | Thuộc tính Prisma | Kiểu PostgreSQL | Cho NULL | Ràng buộc / ý nghĩa |
|---|---|---|---|---|---|
| 1 | id | id | INTEGER / SERIAL | Không | Khóa chính, tự tăng; định danh duy nhất từng chỉ định |
| 2 | luot_kham_id | luotKhamId | INTEGER | Không | FK → luot_kham.id; lượt khám phát sinh chỉ định |
| 3 | dich_vu_id | dichVuId | INTEGER | Không | FK → dich_vu.id; dịch vụ được chỉ định |
| 4 | bac_si_chi_dinh_id | bacSiChiDinhId | INTEGER | Không | FK → bac_si.id; bác sĩ chỉ định, BE xác định, không nhận từ client |
| 5 | ly_do_chi_dinh | lyDoChiDinh | VARCHAR(1000) | Không | Lý do chuyên môn; trim và không được rỗng ở API |
| 6 | ghi_chu | ghiChu | VARCHAR(2000) | Có | Ghi chú thêm; chuỗi rỗng được lưu NULL |
| 7 | trang_thai | trangThai | ENUM trang_thai_chi_dinh_dich_vu | Không | Mặc định CHO_THUC_HIEN; giá trị hợp lệ xem mục 8.4 |
| 8 | don_gia_snapshot | donGiaSnapshot | DECIMAL(15,2) | Không | Đơn giá tại lúc xác nhận, lấy từ danh mục BE; không đổi theo giá danh mục sau đó |
| 9 | idempotency_key | idempotencyKey | UUID | Không | UNIQUE; client gửi UUID v4 cho một yêu cầu, gửi lại phải dùng cùng khóa |
| 10 | ket_qua | ketQua | TEXT | Có | Kết quả văn bản nhập thủ công mô phỏng; API giới hạn 10.000 ký tự |
| 11 | nguoi_nhap_ket_qua_id | nguoiNhapKetQuaId | INTEGER | Có | FK → nguoi_dung.id; tài khoản bác sĩ lưu kết quả |
| 12 | thoi_gian_co_ket_qua | thoiGianCoKetQua | TIMESTAMP(3) | Có | Thời điểm BE ghi nhận kết quả |
| 13 | ly_do_huy | lyDoHuy | VARCHAR(1000) | Có | Bắt buộc không rỗng khi gọi API hủy; NULL nếu chưa hủy |
| 14 | nguoi_huy_id | nguoiHuyId | INTEGER | Có | FK → nguoi_dung.id; người thực hiện hủy |
| 15 | thoi_gian_huy | thoiGianHuy | TIMESTAMP(3) | Có | Thời điểm BE ghi nhận hủy |
| 16 | created_at | createdAt | TIMESTAMP(3) | Không | Mặc định CURRENT_TIMESTAMP khi tạo |
| 17 | updated_at | updatedAt | TIMESTAMP(3) | Không | Prisma @updatedAt cập nhật khi ghi qua ORM; không phải trigger PostgreSQL |

Phân nhóm để thuyết minh: **11 cột nền tảng** (1–9, 16–17); **3 cột kết quả** (10–12); **3 cột hủy** (13–15). Đây vẫn là một bảng, không chia các nhóm thành bảng riêng.

`bac_si_chi_dinh_id` tham chiếu hồ sơ bác sĩ; `nguoi_nhap_ket_qua_id` và `nguoi_huy_id` tham chiếu tài khoản đăng nhập. Không dùng lẫn ID bác sĩ với ID người dùng.

### 8.3. Quan hệ và chỉ mục

- LuotKham **1–N** ChiDinhDichVu.
- DichVu **1–N** ChiDinhDichVu. Không tạo quan hệ DichVu → BacSi.
- BacSi **1–N** ChiDinhDichVu, qua bác sĩ chỉ định.
- NguoiDung **1–N** ChiDinhDichVu, qua người nhập kết quả và người hủy, hai quan hệ có tên riêng.
- ChiDinhDichVu **1–0..1** ChiTietHoaDon: một chỉ định có tối đa một dòng phí liên kết. Dòng hóa đơn cũ có thể không có chỉ định.
- Năm FK trong bảng chỉ định và FK mới ở chi tiết hóa đơn đều `ON DELETE RESTRICT`, `ON UPDATE CASCADE`. Không xóa dây chuyền dữ liệu chỉ định.
- Unique: `idempotency_key`; không đặt unique cho `(luot_kham_id, dich_vu_id)`.
- Index tổng hợp `(luot_kham_id, trang_thai)` phục vụ danh sách và kiểm tra còn chỉ định chờ.
- Index đơn trên `dich_vu_id`, `bac_si_chi_dinh_id`, `nguoi_nhap_ket_qua_id`, `nguoi_huy_id`.

### 8.4. Trạng thái và quy tắc

| Trạng thái | Ý nghĩa | Cho phép tiếp theo |
|---|---|---|
| CHO_THUC_HIEN | Đã xác nhận chỉ định, chưa có kết quả | DA_HOAN_TAT hoặc DA_HUY |
| DA_HOAN_TAT | Bác sĩ đã nhập kết quả mô phỏng | Không sửa kết quả hoặc hủy trong MVP |
| DA_HUY | Hủy trước thực hiện, có người/thời gian/lý do hủy | Không nhập kết quả, không khôi phục trong MVP |

- Trạng thái được kiểm tra trong service và điều kiện UPDATE; không có trigger hoặc CHECK SQL liên kết các cột kết quả/hủy.
- Mọi chỉ định phải hoàn tất hoặc hủy trước khi BE cho hoàn tất khám; không chỉ ẩn nút FE.
- Bước 3 chỉ cho mutation trong lượt `DA_VAO_PHONG`. Chưa thêm trạng thái chờ kết quả vào LuotKham (Bước 5).
- Không mutation khi hóa đơn DA_THANH_TOAN hoặc DA_HUY. Request CREATE lặp đúng nội dung được trả lại bản ghi cũ mà không ghi thêm, kể cả lượt đã đóng; vẫn kiểm tra quyền sở hữu trước khi trả dữ liệu.
- Nhập/hủy lặp đúng nội dung trong lượt còn được phép sửa trả bản ghi hiện có, không thêm audit/socket; khác nội dung hoặc sai trạng thái trả 409.

### 8.5. Hai bảng cũ được bổ sung

| Bảng | Cột mới | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|---|
| dich_vu | loai_dich_vu | ENUM loai_dich_vu, nullable | KHAM hoặc CAN_LAM_SANG; NULL là dữ liệu cũ chưa phân loại, không tự chuyển giá trị |
| chi_tiet_hoa_don | chi_dinh_dich_vu_id | INTEGER nullable, UNIQUE, FK RESTRICT → chi_dinh_dich_vu.id | Chuẩn bị liên kết phí theo chỉ định, tránh tính một chỉ định hai lần |

Danh mục chọn chỉ định chỉ gồm CAN_LAM_SANG + DANG_HOAT_DONG. Không phân loại dựa theo tên dịch vụ hoặc chuyenKhoaId NULL. Không backfill, không thêm dịch vụ, không tự đặt giá. FK/unique chỉ bảo đảm liên kết và không trùng; kiểm tra chỉ định và hóa đơn cùng lượt khám, đã hoàn tất, đúng số tiền sẽ triển khai ở Bước 6.

## 9. Bước 3 — API và logic đã triển khai

Tất cả API mới có tiền tố `/api/v1`, yêu cầu JWT + role DOCTOR + quyền hiện có `BENH_AN.VIEW`. Mọi thao tác gắn lượt khám đều kiểm tra bác sĩ được phân công trong BE. ADMIN/RECEPTIONIST/PHARMACIST/PATIENT không được nhập hoặc xem kết quả qua các endpoint này. Không sửa seed quyền.

| Method | Endpoint | Request | Chức năng |
|---|---|---|---|
| GET | /service-orders/catalog | search?, page=1, limit=20 (tối đa 100) | Danh mục cận lâm sàng hoạt động; trả giá từ BE |
| GET | /service-orders/visit/:visitId | Không có body | Danh sách chỉ định đúng ID lượt khám |
| POST | /service-orders/visit/:visitId | serviceId, idempotencyKey (UUID v4), reason, note? | Tạo chỉ định và snapshot giá |
| PATCH | /service-orders/:id/result | result | Nhập kết quả văn bản mô phỏng; server gán actor/time |
| PATCH | /service-orders/:id/cancel | reason | Hủy khi còn chờ, lưu actor/time/lý do |

Các field không nằm trong DTO (priceSnapshot, doctorId, status...) bị ValidationPipe từ chối. DTO không cho lý do/kết quả chỉ có khoảng trắng. Giá snapshot trong response trả chuỗi thập phân để giữ độ chính xác.

Response chỉ định: `id`, `visitId`, `doctorId`, `service {id,code,name}`, `reason`, `note`, `status`, `priceSnapshot`, `idempotencyKey`, `result`, `resultEnteredBy`, `resultedAt`, `cancellationReason`, `canceledBy`, `canceledAt`, `createdAt`, `updatedAt`, `resultNotice`. Wrapper dùng interceptor hiện có.

`resultNotice`: **Kết quả nhập thủ công phục vụ mô phỏng quy trình cận lâm sàng. Chưa tích hợp thiết bị chẩn đoán.** Không có AI tự sinh kết quả.

API danh mục cũ `/services` nhận thêm `type` ở CREATE/UPDATE và query GET, response thêm `type`. Không đổi tên hoặc loại bỏ field cũ; không có query type thì vẫn giữ danh sách cũ. Query type trên API cũ lọc từ kết quả repository sẵn có để không đổi chữ ký method cũ; catalog mới có filter và phân trang tại DB. UPDATE dịch vụ CAN_LAM_SANG không đồng bộ giá sang phiKham dù trùng mẫu tên khám cũ.

### Transaction, idempotency và realtime

1. Repository khóa hàng lượt khám bằng `SELECT ... FOR UPDATE`, khóa hóa đơn đang tồn tại, rồi đọc lại trạng thái. Isolation ReadCommitted được khai báo rõ ở repository mới.
2. Service kiểm tra bác sĩ sở hữu trước replay. Cùng khóa + cùng visit/doctor/service/reason/note đã chuẩn hóa trả lại bản ghi; nội dung khác trả 409. Không kiểm tra khóa dựa trên giá danh mục hiện tại để retry không bị lỗi do giá đã đổi.
3. CREATE giá từ DB; mutation và NhatKyHeThong cùng transaction. Audit thất bại được đẩy ra để transaction rollback, không best-effort. Audit ghi ID và trạng thái, không ghi nội dung kết quả.
4. Unique key bảo vệ request đụng khóa giữa các lượt; P2002 được đổi thành 409. Cùng lượt được serialize qua khóa hàng. Đây là thiết kế code, chưa được kiểm chứng bằng PostgreSQL concurrency test.
5. API hoàn tất khám theo appointment và visit cùng đi qua `markComplete`; method này khóa cùng hàng lượt khám và đếm CHO_THUC_HIEN trước khi chốt hồ sơ/hóa đơn. Không thêm chỉ định được sau khi lượt đã hoàn tất.
6. Sau commit mới phát `service-order.updated` tới `doctor:<doctorId>`, payload chỉ có ID chỉ định, visitId và status. Không gửi kết quả tới phòng công khai. Nếu socket lỗi sau commit thì vẫn trả thành công lưu DB, log cảnh báo không chứa kết quả.

**Chưa tích hợp phí dịch vụ ở Bước 3.** Không gọi endpoint này trên môi trường vận hành trước khi Bước 6 hoàn tất: hiện khám không thuốc vẫn tạo hóa đơn chỉ gồm phí khám, không được coi là đã quyết toán đủ phí chỉ định.

## 10. File thay đổi và migration Bước 3

### Tạo mới (14 file)

1. `BE/prisma/migrations/20261117000000_add_service_orders/migration.sql`
2. `BE/src/modules/chi-dinh-dich-vu/service-orders.module.ts`
3. `BE/src/modules/chi-dinh-dich-vu/service-orders.controller.ts`
4. `BE/src/modules/chi-dinh-dich-vu/service-orders.service.ts`
5. `BE/src/modules/chi-dinh-dich-vu/dto/create-service-order.dto.ts`
6. `BE/src/modules/chi-dinh-dich-vu/dto/service-order-query.dto.ts`
7. `BE/src/modules/chi-dinh-dich-vu/dto/save-service-result.dto.ts`
8. `BE/src/modules/chi-dinh-dich-vu/dto/cancel-service-order.dto.ts`
9. `BE/src/modules/chi-dinh-dich-vu/repositories/service-order.repository.interface.ts`
10. `BE/src/modules/chi-dinh-dich-vu/repositories/prisma-service-order.repository.ts`
11. `BE/src/modules/chi-dinh-dich-vu/service-orders.service.spec.ts`
12. `BE/src/modules/chi-dinh-dich-vu/service-orders.controller.spec.ts`
13. `BE/src/modules/chi-dinh-dich-vu/service-orders.repository.spec.ts`
14. `BE/src/modules/dich-vu/service-classification.spec.ts`

### Sửa thêm trong Bước 3 (9 file, gồm báo cáo/test đã có từ Bước 2)

- `BE/prisma/schema.prisma`: thêm model/enum/cột nullable/relation.
- `BE/src/app.module.ts`: thêm import/module.
- `BE/src/modules/dich-vu/dto/create-service.dto.ts`: thêm type (UpdateServiceDto kế thừa).
- `BE/src/modules/dich-vu/dto/service-query.dto.ts`: thêm query type.
- `BE/src/modules/dich-vu/services.service.ts`: ghi/trả/lọc phân loại, ngăn đồng bộ phí khám từ CLS.
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`: thêm khóa + kiểm tra chỉ định chờ trước hoàn tất, bảo toàn phần sửa có sẵn.
- `BE/src/modules/kham-benh/examination-invoice.spec.ts`: thêm 2 test guard và cập nhật mock cho khóa/count.
- `BE/src/modules/thoi-gian-thuc/realtime.events.ts`: thêm tên sự kiện, giữ invoice.ready có sẵn.
- `DANH_GIA/bao_cao_smartclinic_v24_2_mvp.md`: cập nhật checkpoint và từ điển dữ liệu.

Không sửa thêm FE, module cấp thuốc hoặc SePay trong Bước 3. Không xóa file. Các file FE/cấp thuốc đang hiện trong Git status là thay đổi đã có hoặc thuộc Bước 2, không phải sửa mới của Bước 3. Không đổi repository danh mục dịch vụ cũ vì giữ được chữ ký method.

Migration chỉ ADD 2 enum, 1 bảng, 2 cột nullable, index và FK. Không UPDATE/DELETE dữ liệu, không backfill danh mục. Đã chạy `prisma validate` và `prisma generate` tại máy local. Tại checkpoint code Bước 3 chưa chạy migration; sau đó chủ dự án duyệt áp dụng trực tiếp lên Neon và đã thực hiện thành công (mục 14).

**Không triển khai BE dùng Prisma Client mới với DB chưa có migration:** truy vấn DichVu/hoàn tất khám có thể báo thiếu cột/bảng. Đích Neon ở mục 14 đã có migration mới; database khác phải kiểm tra riêng. Migration phân quyền cũ đã được xóa khỏi dự án theo yêu cầu tiếp theo của chủ dự án (mục 15). Bước 4–7 vẫn cần triển khai/kiểm chứng trước khi dùng luồng chỉ định để thanh toán thật.

## 11. Kết quả kiểm tra Bước 3

Các kết quả dưới đây được ghi khi hoàn tất code. Kết quả migration và truy vấn PostgreSQL thực tế sau phê duyệt bổ sung nằm ở mục 14; không coi truy vấn chỉ đọc là kiểm thử E2E hoặc concurrency.

| Kiểm tra thực tế | Kết quả |
|---|---|
| Prisma validate + generate local | PASS; không kết nối/ghi migration lên Neon |
| TypeScript BE `npx.cmd tsc --noEmit` | PASS (chạy trước test và sau build) |
| Lần đầu service/controller + test hoàn tất khám | 55 PASS, 0 FAIL / 3 suite |
| Bổ sung repository + phân loại dịch vụ | 14 PASS, 0 FAIL / 2 suite |
| Hồi quy đầy đủ 12 suite liên quan | **119 PASS, 0 FAIL** |
| Lint file mới/sửa Bước 3 | Lần đầu 35 lỗi lint kiểu mock/format; sửa xong còn 4 lỗi assertion thừa mới phát sinh do siết kiểu; bỏ assertion, lần cuối PASS |
| Build BE | PASS (`nest build`) |
| Build FE | PASS (`tsc -b && vite build`); còn cảnh báo chunk >500 kB |
| Git diff --check | PASS; chỉ warning LF/CRLF của một số file sẵn có |
| PostgreSQL migration/FK/rollback/concurrency | **BLOCKED**: người dùng xác nhận chưa có PostgreSQL test riêng |
| Swagger/Bruno với BE thật + DB, trình duyệt, socket delivery | **NOT RUN** |
| E2E lâm sàng/cấp thuốc/thanh toán | **CHƯA XÁC NHẬN** |

119 test = 54 test Bước 2 được giữ + 65 test mới/bổ sung Bước 3. HTTP test khởi tạo Nest trong test, dùng RolesGuard/PermissionsGuard và ValidationPipe thật, giả JWT và service; không phải đăng nhập hoặc API trên Neon thật. Repository test kiểm tra câu lệnh và lời gọi transaction, không chứng minh SQL khóa/rollback thật.

Phạm vi đã kiểm tra: role sai/thiếu quyền; actor và giá không lấy client; DTO rỗng/quá dài; tạo 2 chỉ định khác hoặc cùng dịch vụ với khóa khác; replay cùng khóa; xung đột payload/key; dịch vụ chưa phân loại/KHAM/ngừng hoạt động/giá âm; kết quả và hủy đúng trạng thái; bác sĩ khác bị chặn; hóa đơn quyết toán bị chặn; audit lỗi không phát socket; catalog rỗng; BE chặn hoàn tất có/không thuốc khi còn chỉ định chờ; hồi quy cấp thuốc và SePay partial/success.

Lệnh test tổng (chạy trong BE):

```powershell
npm.cmd test -- --runInBand --runTestsByPath src/modules/chi-dinh-dich-vu/service-orders.service.spec.ts src/modules/chi-dinh-dich-vu/service-orders.controller.spec.ts src/modules/chi-dinh-dich-vu/service-orders.repository.spec.ts src/modules/dich-vu/service-classification.spec.ts src/modules/kham-benh/examination-invoice.spec.ts src/modules/cap-thuoc/dispensing-invoice.spec.ts src/modules/cap-thuoc/dispensing-request.spec.ts src/modules/thanh-toan/sepay-v24-1.service.spec.ts src/modules/thanh-toan/sepay-v24-1.auth.spec.ts src/modules/thanh-toan/sepay-v24-1.logging.spec.ts src/modules/thanh-toan/thanh-toan.service.spec.ts src/modules/thanh-toan/thanh-toan.controller.spec.ts
```

## 12. Checkpoint Bước 3, rủi ro còn lại và việc tiếp theo

Kết luận: **CODE BACKEND BƯỚC 3 ĐÃ TRIỂN KHAI — CHƯA XÁC NHẬN HOẠT ĐỘNG E2E.** Toàn bộ V24.2 còn CHƯA HOÀN THÀNH vì Bước 4–7 chưa triển khai.

- Tại checkpoint code chưa chạy migration; phê duyệt và lần áp dụng riêng trên Neon được ghi ở mục 14. Không chạy seeder, không Git mutation; mọi thay đổi dở dang được giữ.
- Chưa có dịch vụ CLS được xác nhận phân loại trên DB; catalog có thể rỗng. Không tự ghi/đặt giá thay người dùng.
- API `/services` cũ vẫn trả đủ khi không truyền type. Bước 4 phải cập nhật UI Admin phân loại và lọc dịch vụ đặt lịch theo thiết kế đã duyệt; hiện FE chưa thay đổi, chưa bảo đảm ẩn CLS khỏi trang đặt lịch.
- Phát hiện để theo dõi: chiều đồng bộ ngược trong `BE/src/modules/chuyen-khoa/repositories/prisma-specialty.repository.ts` vẫn dùng tên `Khám <tên khoa>`, chưa xét loaiDichVu. Nếu gắn CLS vào khoa và đặt đúng tên khám, cập nhật khoa có thể đổi giá danh mục CLS. Không sửa ngoài phạm vi; cần xin duyệt riêng trước xử lý. Snapshot chỉ định đã tạo không bị cập nhật theo giá đó.
- Chưa sửa field X-quang chuyên khoa cũ. Đề xuất Bước 4 lưu kết quả mới duy nhất trong ChiDinhDichVu, không tự sao chép sang `ketQuaXQuang`, không xóa dữ liệu cũ; chờ người dùng chốt.
- Bước 5 cần mở lại theo ID, giữ nháp ICD/thuốc, bổ sung trạng thái/danh sách chờ và kiểm tra chuyển bệnh nhân A/B. Chưa làm ở bước này.
- Bước 6 bắt buộc nối phí hoàn tất vào hóa đơn, chống trùng theo chiDinhDichVuId và kiểm tra cùng lượt; không dùng bản dở dang để thanh toán thật.
- Trước cho chạy vận hành cần DB test riêng: migration additive với dữ liệu cũ, FK restrict/unique, 2 request đồng thời cùng key, create-vs-complete, result-vs-cancel, payment-vs-mutation, rollback khi audit lỗi. Mock không thay thế được các kiểm tra này.

Hướng dẫn kiểm tra sau khi có DB test được duyệt: áp dụng migration vào đúng DB test → cấu hình dịch vụ test CAN_LAM_SANG theo giá test đã chốt → đăng nhập bác sĩ có lượt DA_VAO_PHONG → tạo chỉ định bằng UUID → gửi lại cùng body và kiểm tra cùng ID → gọi complete phải bị chặn → nhập kết quả hoặc hủy → tải lại danh sách đúng visit ID → kiểm tra nhật ký → thử bác sĩ khác/thu ngân phải bị 403. Không thực hiện trên Neon dùng chung.

**Dừng tại Bước 3, chờ duyệt sang Bước 4.** Nội dung mục 8 có thể sao chép vào chương thiết kế cơ sở dữ liệu trong Word. Sau phê duyệt bổ sung ở mục 14, bảng 17 cột này đã tồn tại trên Neon; chức năng giao diện và luồng đầy đủ vẫn chưa hoàn tất.

## 13. Yêu cầu mới: migration lên Neon — kết quả preflight 17/11/2026

Sau khi hoàn tất code Bước 3, người dùng yêu cầu: “cập nhật migration lên database Neon Cloud luôn”. Đây là phê duyệt thay đổi đích triển khai so với yêu cầu trước (chỉ chuẩn bị migration). Đã kiểm tra chỉ đọc trực tiếp Neon, chưa ghi schema/dữ liệu.

- Database: `smart_clinic`.
- Project thực tế từ `current_setting`: `solitary-firefly-31944589`.
- Branch: `br-shiny-art-az888jre`; endpoint: `ep-jolly-sound-azhj3db2`.
- Chưa có bảng `chi_dinh_dich_vu` hoặc hai cột mới. Chưa có migration failed chưa rollback.
- Số lượng đọc tại preflight: 11 dịch vụ, 417 dòng chi tiết hóa đơn, 56 bác sĩ. Đây là số lượng trước migration, không phải đối chiếu sau ghi.
- Có **hai migration pending**: `20261106170000_chuan_hoa_quyen_bon_vai_tro` và `20261117000000_add_service_orders`.
- Đã đọc migration cũ: có DELETE phân quyền của cả bốn role rồi gán lại ma trận. Không được chạy `prisma migrate deploy` chung vì sẽ thay đổi quyền hiện tại ngoài yêu cầu migration chỉ định.
- Kết nối sandbox lần đầu EACCES; đã chạy lại với quyền mạng được duyệt và preflight thành công. Không in connection string/mật khẩu/token.

**Tại thời điểm preflight: chưa APPLY.** Chưa có PostgreSQL test riêng; chưa xác minh backup/PITR hiện tại. Backup bảng bác sĩ V24.3 không bao phủ các bảng của migration này. Công cụ pg_dump/pg_restore chưa tìm thấy trong PATH hoặc thư mục PostgreSQL mặc định. Script backup dữ liệu cũ dùng Prisma Client đã generate schema mới có nguy cơ đọc cột chưa tồn tại, nên không chạy để giả nhận có backup.

Đề nghị xác nhận một trong hai hướng trước khi ghi: cung cấp Neon branch test để kiểm thử migration trước; hoặc xác nhận có backup/điểm khôi phục hiện tại và duyệt áp dụng riêng migration mới trực tiếp, chấp nhận PostgreSQL integration chưa chạy. Trong mọi trường hợp không tự chạy migration phân quyền cũ, không seed và không chuyển sang Bước 4.

## 14. Migration Neon thực tế — PASS sau phê duyệt bổ sung

Ngày 17/11/2026, chủ dự án xác nhận: **“Tôi xác nhận có backup/điểm khôi phục hiện tại; cho chạy riêng migration mới trực tiếp, chấp nhận chưa kiểm thử PostgreSQL riêng.”** Dựa trên xác nhận này đã thực hiện migration trực tiếp. Khả năng khôi phục do chủ dự án xác nhận; agent không tạo backup mới hoặc tự kiểm thử restore/PITR trong lượt này.

### Đích và phạm vi ghi

- Database: `smart_clinic`; schema `public`.
- Neon project: `solitary-firefly-31944589`.
- Neon branch: `br-shiny-art-az888jre`; endpoint `ep-jolly-sound-azhj3db2`.
- Migration duy nhất: `20261117000000_add_service_orders`.
- SHA-256 file SQL khớp lịch sử Prisma: `f4f19291a387086713c0de9881be922c2955f2dda0e4896636eada65e4c01f61`.
- Lịch sử Prisma ghi finished_at `2026-11-17T03:03:18.560Z`, tức **10:03:18 ngày 17/11/2026 (UTC+7)**; rolled_back_at NULL.
- Không đổi quyền, không backfill, không seed, không thêm dữ liệu khám hoặc dịch vụ mô phỏng.

### Cách thực hiện

1. Xác minh lại project/branch/database/endpoint bằng metadata Neon trong cùng phiên trước ghi. Danh sách pending đúng hai migration đã khảo sát; không có migration lỗi chưa rollback; bảng/cột đích chưa tồn tại.
2. Đọc đúng file SQL migration đã duyệt. Chạy trong một transaction PostgreSQL với `lock_timeout=5s`, `statement_timeout=30s`, advisory transaction lock cho migration; khóa hai bảng cũ bị ALTER trước khi chụp giá trị đối chiếu.
3. Chỉ thực thi nội dung file `20261117000000_add_service_orders/migration.sql`, không dùng `migrate deploy` để tránh chạy migration phân quyền cũ.
4. Trước COMMIT, kiểm tra đủ 17 cột, 6 FK RESTRICT đã validated (5 FK bảng mới + 1 FK chi tiết hóa đơn), bảng mới rỗng, số bản ghi/hash các cột cũ không đổi.
5. COMMIT thành công. Sau đó chạy `npx.cmd prisma migrate resolve --applied 20261117000000_add_service_orders` để ghi nhận SQL đã thực thi vào lịch sử Prisma; không đánh dấu migration chưa chạy là đã chạy. Cách đối soát SQL đã áp dụng với lịch sử tham khảo [Prisma — Patching & hotfixing](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing).
6. Mở kết nối mới READ ONLY sau commit, đọc lại lịch sử/checksum, schema, FK, unique index, enum và số lượng. Chạy thêm Prisma Client trong transaction READ ONLY để đọc các field mới.

### Đối chiếu dữ liệu trong transaction

Hash MD5 của JSON các cột cũ, sắp theo ID; khi đối chiếu sau ALTER bỏ hai cột mới khỏi JSON. Đây là kiểm tra tính toàn vẹn dữ liệu trước/sau, **không phải bản sao lưu**.

| Bảng | Trước | Sau | Hash các cột cũ trước/sau |
|---|---:|---:|---|
| dich_vu | 11 | 11 | Cùng `fe01e26cfa07426bce11795f36007cf1` |
| chi_tiet_hoa_don | 417 | 417 | Cùng `2e2bd5b574d8045f12c6b76afa40c56e` |
| vai_tro_quyen | 117 | 117 | Cùng `c0dcdf670263a086b7fec5725b87af69` |

### Đọc lại sau commit và kết quả

| Kiểm tra trên Neon thật | Kết quả |
|---|---|
| Bảng chi_dinh_dich_vu | PASS: đủ 17 cột như mục 8; 0 bản ghi vì không seed |
| dich_vu.loai_dich_vu | PASS: enum nullable, cả 11 dịch vụ cũ vẫn NULL |
| chi_tiet_hoa_don.chi_dinh_dich_vu_id | PASS: integer nullable, 417 dòng cũ vẫn NULL |
| Hai enum | PASS: KHAM/CAN_LAM_SANG và CHO_THUC_HIEN/DA_HOAN_TAT/DA_HUY |
| Primary key, FK và index | PASS bằng introspection; tồn tại PK, 6 FK RESTRICT và các index đã thiết kế |
| Unique chống trùng | PASS bằng introspection: idempotency_key và chi_tiet_hoa_don.chi_dinh_dich_vu_id có unique index |
| Lịch sử migration | PASS: finished_at có giá trị, checksum khớp chính xác file local |
| Prisma Client truy vấn field mới | PASS: đọc 11 dịch vụ, đếm 0 chỉ định chờ, đếm 417 dòng hóa đơn cũ |
| Số bác sĩ | 56 sau migration; không ghi bảng bác sĩ |
| Test tạo/sửa chỉ định, concurrency, lỗi FK/rollback cố ý, trình duyệt/E2E | NOT RUN trên Neon; không tạo dữ liệu test lên database dùng chung |

Tại thời điểm hoàn tất mục 14, migration `20261106170000_chuan_hoa_quyen_bon_vai_tro` vẫn pending và chủ động không chạy, không đánh dấu giả là applied. Sau đó chủ dự án yêu cầu xóa migration này; xem kết quả cập nhật tại mục 15.

### File thay đổi riêng trong lượt áp dụng migration

- `BE/prisma/migrations/20261117000000_add_service_orders/migration.sql`: chỉnh comment đầu file trước khi áp dụng để không còn ghi “chưa áp dụng”; SQL nghiệp vụ không đổi. Không sửa file này sau khi ghi nhận checksum.
- `DANH_GIA/bao_cao_smartclinic_v24_2_mvp.md`: cập nhật kết quả thực tế.
- Không đổi code FE/BE trong lượt migration, không chạy lại build/test unit vì chỉ đổi comment SQL và báo cáo. Kết quả 119 test và build BE/FE ở Bước 3 giữ nguyên là kết quả lượt trước, không nhận là mới chạy trong lượt này.

**Kết luận: MIGRATION PASS — đã ghi và đọc lại trên đúng Neon.** Không đồng nghĩa V24.2/E2E hoàn thành. Giao diện chỉ định, chờ kết quả và tổng hợp phí còn thuộc Bước 4–7; danh mục CLS hiện rỗng do chưa phân loại, không tự thêm dữ liệu. Dừng sau migration/Bước 3; chờ duyệt trước Bước 4.

## 15. Xóa migration phân quyền chưa áp dụng theo yêu cầu chủ dự án

Ngày 17/11/2026, chủ dự án yêu cầu: “vậy thì xoá cái migrate cũ đi là đc”.

- Kiểm tra bằng transaction READ ONLY trên Neon project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`, database `smart_clinic`.
- `_prisma_migrations` không có bản ghi nào mang tên `20261106170000_chuan_hoa_quyen_bon_vai_tro`; trước khi xóa đây là migration pending duy nhất. Không có migration đã áp dụng nào bị thiếu file local.
- Đã xóa file `BE/prisma/migrations/20261106170000_chuan_hoa_quyen_bon_vai_tro/migration.sql` và thư mục rỗng tương ứng. File có thể khôi phục từ lịch sử Git nếu cần; không thực hiện thao tác Git ghi trong lượt này.
- Không chạy SQL của migration cũ; không thay quyền hiện tại, dữ liệu nghiệp vụ hoặc lịch sử migration trên Neon. Giữ nguyên migration `20261117000000_add_service_orders` đã áp dụng.
- Kiểm tra sau xóa: `npx.cmd prisma migrate status` exit code 0, tìm thấy **27 migrations**, kết quả **Database schema is up to date!**
- Không chạy lại build/test FE/BE vì chỉ xóa SQL chưa áp dụng và cập nhật tài liệu; không thay code runtime hoặc Prisma schema. Không chạy seed/migrate deploy và không chuyển sang Bước 4.
- Các máy dùng chung Neon phải nhận cả thay đổi xóa file này khi đồng bộ code, nếu không bản local cũ vẫn thấy migration pending. Database/branch độc lập khác chưa được kiểm tra; không suy diễn kết quả Neon này sang các database khác.

File thay đổi trong lượt này: xóa migration phân quyền cũ nêu trên; cập nhật báo cáo này. Các mục 13–14 được giữ làm lịch sử tại thời điểm thực hiện.

## 16. Seed hai dịch vụ cận lâm sàng demo — SEED PASS

Chủ dự án yêu cầu thêm X-quang và xét nghiệm máu, sau đó chọn **“Seed trực tiếp Neon theo đề xuất”**: dùng lại xét nghiệm công thức máu giá 150.000đ và thêm chụp X-quang ngực thẳng giá demo 200.000đ. Đây là danh mục minh họa khóa luận, không phải bảng giá y tế thực tế; không tạo khoa/role/bác sĩ mới.

`CAN_LAM_SANG` = cận lâm sàng, dùng cho dịch vụ hỗ trợ chẩn đoán như xét nghiệm và chụp X-quang. `KHAM` dùng cho dịch vụ khám trực tiếp. API danh mục chỉ định hiện chỉ lấy dịch vụ `CAN_LAM_SANG` đang hoạt động; không suy đoán các bản ghi có loại NULL.

### Đích, thay đổi và đọc lại thực tế

- Xác minh bằng metadata DB: project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`, database `smart_clinic`, bảng `public.dich_vu`.
- Trước APPLY: 11 dịch vụ, chưa có dịch vụ được phân loại CAN_LAM_SANG.
- Sau APPLY và đọc lại sau COMMIT: **12 dịch vụ**, **2 dịch vụ CAN_LAM_SANG đang hoạt động**.

| Mã dịch vụ | Tên | Giá demo | Thao tác thực tế |
|---|---|---:|---|
| DV002 | Xét nghiệm công thức máu | 150.000đ | Chỉ đổi loai_dich_vu từ NULL thành CAN_LAM_SANG; không đổi các trường khác |
| CLS_XQ_NGUC | Chụp X-quang ngực thẳng | 200.000đ | Tạo mới, ID thực tế 16, loại CAN_LAM_SANG, đang hoạt động, không gán khoa |

- Không tạo trùng xét nghiệm máu, không phân loại lại siêu âm hoặc các dịch vụ khám ngoài phạm vi được duyệt.
- Mô tả X-quang ghi rõ dịch vụ mô phỏng và giá minh họa. Không tự điền thời gian trả kết quả, báo cáo kết quả khám, chỉ định hoặc hóa đơn.
- Không ghi bảng khác, không chạy seeder tổng, migration, không sửa FE/API/schema.

### An toàn và sao lưu

Script mặc định dry-run. APPLY cần hash kế hoạch đọc thật, xác minh đúng project/branch/database, khóa ghi bảng danh mục trong transaction ngắn, kiểm tra bản ghi cũ, sao lưu trước ghi, kiểm tra toàn bộ trường các dịch vụ cũ trước COMMIT. Có conflict thì rollback, không ghi đè chỉnh sửa thủ công.

- Hash dry-run đã sử dụng: `0767056a8909b4fcfc292725d162a3477efa3949eaf11eed58c08607c41097f8`.
- Backup danh mục đã ghi và đọc kiểm tra trước APPLY: `C:\Users\JUN\AppData\Local\Temp\smartclinic-cls-IzdGBV\services-before.json`.
- Backup chỉ chứa danh mục và metadata đích, không chứa secret. Đây là file tạm ngoài Git, cần giữ bản sao nếu muốn lưu lâu dài; không thay thế backup toàn DB/PITR.
- Nếu cần hoàn tác: đối chiếu backup với trạng thái hiện tại trong transaction; chỉ đưa loại của DV002 về giá trị cũ khi không có thay đổi mới, và chỉ xóa CLS_XQ_NGUC nếu chưa được tham chiếu, chưa bị sửa. Nếu đã phát sinh chỉ định/hóa đơn thì không xóa cứng; cần đánh giá ngừng hoạt động. Chưa chạy hoàn tác hoặc test restore trên DB dùng chung.

### Kiểm thử

- `node --test prisma/seed-data/seed-clinical-services.test.mjs`: **12/12 PASS** (kiểm tra kế hoạch và đối chiếu dữ liệu, không phải integration transaction).
- `node --check prisma/seed-data/seed-clinical-services.mjs`: PASS.
- Dry-run trước APPLY: classifyBlood=true, insertXray=true; APPLY thực tế: classified=1, inserted=1, SEED_PASS sau đọc lại.
- Dry-run bằng kết nối mới sau APPLY: totalBefore=12, classifyBlood=false, insertXray=false — **idempotent, không còn ghi thêm**.
- Prisma Client đọc Neon theo đúng điều kiện catalog: trả đúng DV002 và CLS_XQ_NGUC, giá tương ứng 150000/200000 — PASS. Đây là kiểm thử truy vấn, chưa phải kiểm thử HTTP đăng nhập/phân quyền hoặc E2E trình duyệt.
- `npm.cmd run build` tại BE: PASS; tại FE: PASS (cảnh báo chunk >500 kB).
- Driver vẫn có cảnh báo SSL mode cũ; không gây thất bại kết nối/seed trong lượt kiểm thử này. Không sửa cấu hình SSL ngoài phạm vi.

### Files và bước tiếp theo

- NEW: `BE/prisma/seed-data/seed-clinical-services.mjs`.
- NEW: `BE/prisma/seed-data/seed-clinical-services.test.mjs`.
- UPDATE: báo cáo này.
- Giữ nguyên thay đổi xóa migration từ lượt trước; không add/commit/push/restore.
- Chỉ hoàn tất seed danh mục. Chưa triển khai Bước 4 (giao diện chỉ định), Bước 5 (chờ kết quả), Bước 6 (tính phí) và E2E. Danh mục cận lâm sàng nay đã có dữ liệu để triển khai Bước 4; các ghi chú “catalog rỗng” ở mục trước là lịch sử trước seed.

## 17. Bước 4 — Giao diện chỉ định tại trang khám bệnh

Ngày 17/11/2026, chủ dự án duyệt: **“oke làm đi b4”**. Chỉ triển khai Bước 4; chưa chuyển Bước 5–7.

### Đã triển khai

- Thêm khu vực **Chỉ định dịch vụ cận lâm sàng** ngay sau chẩn đoán/ICD, trước kết luận; không sắp xếp lại các khu vực cũ.
- Modal Bootstrap “Thêm chỉ định”: tìm tên/mã, phân trang danh mục 10 dòng, hiển thị giá BE, chọn dịch vụ, nhập lý do bắt buộc tối đa 1.000 ký tự và ghi chú tối đa 2.000 ký tự.
- Danh sách theo đúng visit ID, giá snapshot, trạng thái chờ/đã có kết quả/đã hủy. Có tải dữ liệu, trạng thái rỗng, lỗi và nút thử lại; không coi lỗi API là không có chỉ định.
- Modal nhập kết quả văn bản tối đa 10.000 ký tự; luôn ghi rõ: “Kết quả nhập thủ công phục vụ mô phỏng quy trình cận lâm sàng. Chưa tích hợp thiết bị chẩn đoán.” Không gợi ý/tạo kết quả bằng AI.
- Modal hủy yêu cầu lý do bắt buộc, tối đa 1.000 ký tự. Chỉ định cuối chỉ xem, không sửa/hủy; không xóa cứng.
- Xem chi tiết lý do, ghi chú, kết quả, lý do hủy và thời gian BE trả về. Nội dung văn bản được React escape, không dùng HTML injection.
- FE yêu cầu role DOCTOR và BENH_AN.VIEW; chỉ mở thao tác khi lượt DA_VAO_PHONG. Quyền sở hữu và hóa đơn đã quyết toán/hủy vẫn do BE kiểm tra; API visit hiện không trả trạng thái hóa đơn nên FE không tự suy đoán quyền từ hóa đơn.
- Khóa thao tác đồng bộ bằng ref để double-click không gửi hai POST; khóa field/modal khi đang gửi. UUID v4 mới cho yêu cầu mới, cùng nội dung thất bại giữ khóa để retry trong phiên component, kể cả đóng/mở modal. Sau phản hồi thành công có thể chỉ định cùng dịch vụ lần khác với UUID mới.
- Khóa retry chỉ lưu trong bộ nhớ, không lưu thêm lý do/kết quả y tế vào localStorage. Sau F5 cần tải danh sách thật để đối chiếu; không cam kết khôi phục yêu cầu chưa rõ kết quả qua lần reload toàn trang.
- Lưu thành công đồng bộ dữ liệu trả về và tải lại riêng danh sách chỉ định, toast dùng message API. Lỗi ghi giữ nguyên nội dung modal và không dựng dòng thành công giả.
- Nghe `service-order.updated` đúng visit ID để tải lại riêng danh sách. Hủy GET cũ, kiểm soát thứ tự response; state/modal được tách theo visit ID để tránh lẫn chỉ định của A và B.
- Dùng portal đưa modal ra ngoài DOM form phiếu khám; chặn bubbling change/submit để không kích hoạt nhầm lưu nháp. Không gọi reload phiếu khám khi xử lý chỉ định.
- Kiểm tra lại `KhamCoXuongKhop.tsx`: không có ô nhập kết quả X-quang trên FE hiện hành. Giữ nguyên field dữ liệu cũ, không tạo nơi lưu kết quả thứ hai.

### Luồng và API

TrangKhamBenh → ServiceOrdersPanel/modal → hook → service-order.api → Axios client → API Bước 3 → service/repository → PostgreSQL → phản hồi/toast + cập nhật riêng danh sách.

- GET `/api/v1/service-orders/catalog?search=&page=&limit=10`.
- GET/POST `/api/v1/service-orders/visit/:visitId`.
- PATCH `/api/v1/service-orders/:id/result`.
- PATCH `/api/v1/service-orders/:id/cancel`.
- Không gửi giá hoặc bác sĩ tự khai trong POST; BE lấy và lưu snapshot. Không đổi route/API BE.

### File trong Bước 4

Tạo mới:

1. `FE/src/modules/chi-dinh-dich-vu/types/service-order.types.ts`.
2. `FE/src/modules/chi-dinh-dich-vu/api/service-order.api.ts`.
3. `FE/src/modules/chi-dinh-dich-vu/hooks/use-service-orders.ts`.
4. `FE/src/modules/chi-dinh-dich-vu/components/ServiceOrdersPanel.tsx`.
5. `FE/src/modules/chi-dinh-dich-vu/components/ServiceOrderModals.tsx`.
6. `FE/src/modules/chi-dinh-dich-vu/utils/service-order-display.ts`.
7. `FE/src/modules/chi-dinh-dich-vu/index.ts`.
8. `FE/tests/service-orders.browser.mjs`.

Sửa:

- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`: chỉ thêm import và vị trí render panel (5 dòng).
- Báo cáo này: cập nhật checkpoint.

Giữ nguyên thay đổi có trước: xóa migration phân quyền cũ và hai file seed cận lâm sàng; không nhận là thay đổi của Bước 4. Không sửa BE/schema/seed/phân hệ dược sĩ, thu ngân, SePay hoặc màn đặt lịch trong lượt này.

### Test — kết quả thực tế và các lần sửa

| Kiểm tra | Kết quả |
|---|---|
| Lần chạy browser đầu | 0/10 PASS: lỗi selector test do tên bệnh nhân xuất hiện ở cả thanh bệnh nhân và sidebar; giới hạn selector vào thanh bệnh nhân, không đổi app |
| Lần chạy browser thứ hai | 9/10 PASS: phát hiện số trang mới xuất hiện trước danh sách mới; sửa hook gắn trạng thái loading với khóa truy vấn ngay khi render |
| Chạy lại sau sửa phân trang | 10/10 PASS |
| Bổ sung 2 test bảo vệ thuốc đang soạn và lỗi ghi, chạy lại toàn bộ | **12/12 PASS**, 0 FAIL; Chrome thật, API giả lập trong bộ nhớ |
| Test backend 4 suite service-orders + service-classification | **63/63 PASS**, mock/controller giả lập, không PostgreSQL |
| Lint module FE mới và file browser test | Lần đầu 2 warning, sau tách util và chỉnh cleanup: PASS, không warning/error |
| Build FE sau bản sửa cuối | PASS: TypeScript `tsc -b` + Vite; cảnh báo chunk lớn hơn 500 kB |
| Build BE | PASS |
| git diff --check | PASS, chỉ cảnh báo LF/CRLF trên báo cáo |
| PostgreSQL integration / FE→BE→DB ghi thật / HTTP auth thật | BLOCKED/NOT RUN: chưa có DB test riêng; không ghi dữ liệu khám lên Neon dùng chung |
| Realtime server thật / tạm chờ / hóa đơn dịch vụ / E2E tổng | NOT RUN, không nằm trong xác nhận PASS Bước 4 |

12 kịch bản trình duyệt: danh mục/tạo nhiều chỉ định/ICD không mất; double-click và khóa Escape; mất phản hồi sau server mock đã lưu và retry UUID; nhập/xem kết quả/hủy/reload; lỗi quyền danh sách và retry; danh mục lỗi/rỗng; phân trang/tìm kiếm; không có quyền thì ẩn panel; lượt đóng chỉ đọc; đổi visit ID không lẫn modal/chỉ định; thuốc đang soạn được giữ và không gọi lại API phiếu khám; lỗi ghi giữ nội dung và không giả thành công.

Tất cả request API và websocket trong browser test đều bị chặn/giả lập, không chuyển tới BE/Neon. Fixtures chỉ tồn tại trong bộ nhớ test, browser context đóng sau mỗi ca; không có bản ghi test cần xóa trên cloud. Giữ file test để hồi quy. Đã kiểm tra ảnh chụp panel với dữ liệu test.

Lệnh chạy lại:

```text
FE: npm.cmd run dev -- --host 127.0.0.1 --port 5187 --strictPort
FE: node --test --test-concurrency=1 tests/service-orders.browser.mjs
    Cần PLAYWRIGHT_MODULE = đường dẫn tuyệt đối tới playwright-core/index.mjs.
    Chrome mặc định C:/Program Files/Google/Chrome/Application/chrome.exe;
    có thể đặt CHROME_PATH. Không cần sửa package.json/package-lock dự án.
FE: npx.cmd oxlint src/modules/chi-dinh-dich-vu tests/service-orders.browser.mjs
FE/BE: npm.cmd run build
BE: npm.cmd test -- --runInBand --runTestsByPath src/modules/chi-dinh-dich-vu/service-orders.service.spec.ts src/modules/chi-dinh-dich-vu/service-orders.controller.spec.ts src/modules/chi-dinh-dich-vu/service-orders.repository.spec.ts src/modules/dich-vu/service-classification.spec.ts
```

Playwright-core phục vụ kiểm thử được cài vào thư mục tạm riêng, không thêm dependency/lockfile vào dự án. Lint toàn dự án không chạy lại; kết quả lint nêu trên chỉ thuộc module/test mới.

### Kiểm tra thủ công và rủi ro còn lại

Trên môi trường test tách biệt: đăng nhập bác sĩ được phân công → mở đúng lượt DA_VAO_PHONG theo `luotKhamId` → nhập ICD/thuốc → thêm chỉ định → kiểm tra dữ liệu đang soạn còn nguyên → nhập/xem kết quả hoặc hủy có lý do → reload và kiểm tra theo visit ID. Thử lỗi mạng và bác sĩ khác; xác minh BE từ chối hoàn tất khi còn chỉ định chờ.

- Danh mục Neon đã có 2 dịch vụ demo từ mục 16; lượt này **không ghi Neon**, không migration, không seed, không Git mutation.
- **Chưa triển khai tính phí ở Bước 6**: không sử dụng luồng này để quyết toán dịch vụ thật. Việc đã có kết quả không đồng nghĩa hóa đơn đã có khoản phí đó.
- Chờ kết quả và tiếp tục khám A/B của toàn phiếu chưa triển khai. Test đổi visit ID ở đây chỉ chứng minh panel chỉ định không lẫn dữ liệu, không chứng minh toàn bộ nháp cũ A/B an toàn.
- Màn dịch vụ công khai/đặt lịch vẫn có thể hiển thị dịch vụ cận lâm sàng theo khảo sát trước; chưa tự sửa phạm vi này.
- Không tự khóa thêm nút hoàn tất khám ngoài phạm vi: BE đã có chặn pending từ Bước 3, FE hiển thị hướng dẫn khi còn chỉ định chờ.

**Checkpoint Bước 4: CODE ĐÃ TRIỂN KHAI — test FE giả lập và BE mock PASS, CHƯA XÁC NHẬN HOẠT ĐỘNG E2E.** Dừng chờ duyệt Bước 5: lưu nháp, tạm chờ kết quả, danh sách chờ và mở lại đúng lượt khám.

## 18. Bước 5 — Lưu nháp an toàn, chờ kết quả và mở lại đúng lượt khám

Ngày thực hiện: 17/11/2026. Phạm vi đã được chủ dự án duyệt: Bước 5 với sáu điều kiện; sau khảo sát đã chọn **A: thêm CHO_KET_QUA vào enum LuotKham** và **duyệt lọc tối thiểu dịch vụ công khai ngay trong Bước 5**. Không tự triển khai Bước 6.

### 18.1. Xác nhận lỗi trước khi sửa và kiểm thử đỏ/xanh

Trong cả `ExaminationsService.save` và `saveByVisit`, source cũ chuyển `dto.prescription ?? []` thành mảng gửi repository. `PrismaExaminationRepository.save` xử lý `prescription !== undefined` bằng xóa các dòng thuốc cũ; nếu mảng rỗng thì xóa đơn. Vì vậy request nháp bỏ trường prescription thực sự có thể xóa đơn đã lưu.

- Viết test gọi service và repository thật, transaction Prisma giả lập. Lần đầu fixture dùng structuredClone với Decimal không tương thích; sửa fixture trước khi đánh giá lỗi ứng dụng.
- Với fixture đúng, trước sửa có **6 FAIL/6 PASS**: ba trường hợp thiếu/undefined/null cho cả route appointment và visit đều chạm thao tác xóa thuốc.
- Sửa payload thành `dto.prescription?.map(...)`: thiếu/undefined/null giữ nguyên đơn; `[]` tường minh mới xóa; mảng có thuốc vẫn cập nhật và dùng giá từ repository. Chạy lại **12/12 PASS**.
- Bổ sung chặn autosave trễ khi hồ sơ đã đóng, kiểm tra lại trạng thái sau khóa dòng lượt khám trong transaction: thêm hai test PASS.
- Vì đơn cũ nay được giữ khi thiếu prescription, bổ sung kiểm tra liều dùng/cách dùng của đơn đã lưu trước hoàn tất. Sau hoàn thiện fixture, bốn test tái hiện FAIL vì gọi markComplete với đơn thiếu thông tin; sửa kiểm tra và chạy lại PASS. Phiếu vẫn là nháp khi bị từ chối hoàn tất.
- Bộ test nháp cuối cùng **18/18 PASS**, nằm trong tổng 111 test bên dưới. Không dùng kết quả mock để khẳng định rollback PostgreSQL thật.

### 18.2. Phương án trạng thái đã chọn và phụ thuộc source

| Điểm phụ thuộc | Xử lý Bước 5 |
|---|---|
| Enum Prisma `TrangThaiLuotKham` | Thêm CHO_KET_QUA; không thêm bảng hoặc cột |
| Chỉ định dịch vụ | Cho sửa chỉ định chờ trong DA_VAO_PHONG hoặc CHO_KET_QUA; giữ kiểm tra bác sĩ sở hữu và hóa đơn đã đóng |
| Lưu nháp | Chấp nhận CHO_KET_QUA; giữ trạng thái hồ sơ BAN_NHAP |
| Hoàn tất khám | Từ chối khi lượt CHO_KET_QUA, kể cả kiểm tra lại trong transaction; bác sĩ phải Tiếp tục khám trước; vẫn chặn khi còn chỉ định chưa xử lý |
| API lượt đang hoạt động | Source lọc DA_VAO_PHONG; giữ nguyên. Không dùng để mở lượt đang chờ |
| Hàng đợi bác sĩ | Loại lượt CHO_KET_QUA khỏi danh sách hiện hành; hiển thị ở panel riêng |
| Enum hàng chờ | Không thêm CHO_KET_QUA vào `TrangThaiHangCho`. Phiếu hàng chờ vẫn ghi nhận đã vào phòng, không bị đánh dấu hoàn tất khi tạm chờ |
| Thống kê hoàn tất/lịch sử bệnh nhân | Logic hiện chỉ tính/hiện DA_HOAN_TAT; không biến lượt chờ thành ca đã khám xong |
| Nhãn FE | Badge Chờ kết quả; danh sách phân biệt còn chỉ định chưa xử lý với đã xử lý hết nhưng chờ bác sĩ kết luận |

Luồng: **DA_VAO_PHONG → lưu nháp thành công → CHO_KET_QUA → mở đúng visitId → nhập/xem kết quả → Tiếp tục khám (DA_VAO_PHONG) → hoàn tất**.

Không suy diễn trạng thái lượt khám chỉ từ số chỉ định pending: khi tất cả chỉ định đã có kết quả/hủy, lượt vẫn cần bác sĩ mở lại và kết luận. Có thể tiếp tục khám khi còn chỉ định pending, nhưng không thể hoàn tất khi pending vẫn còn.

Migration đã chuẩn bị:

`BE/prisma/migrations/20261118000000_add_waiting_visit_status/migration.sql`

```sql
ALTER TYPE "trang_thai_luot_kham" ADD VALUE IF NOT EXISTS 'CHO_KET_QUA';
```

**Tại checkpoint Bước 5:** chưa chạy migration này trên Neon hoặc database nào; chỉ chạy `prisma generate` để sinh client local và kiểm tra type. Sau đó chủ dự án duyệt riêng và migration đã được áp dụng lên Neon; xem mục 19.

**Lưu ý triển khai:** bản code mới có truy vấn dùng CHO_KET_QUA. Database chưa có enum mới có thể từ chối truy vấn. Neon đích đã áp dụng theo mục 19; database khác cần kiểm tra riêng. Chưa xác nhận E2E với DB thật.

### 18.3. API và bảo vệ dữ liệu

Các route mới dưới `/api/v1`:

| Method/route | Mục đích |
|---|---|
| GET `/examinations/waiting/me?page=1&limit=10` | Lượt chờ của bác sĩ đang đăng nhập, phân trang; không lọc chỉ hôm nay nên không mất lượt chờ qua ngày |
| POST `/examinations/waiting/:visitId/wait` | Chuyển sang chờ khi đã lưu nháp, có chỉ định pending và lượt đang khám |
| POST `/examinations/waiting/:visitId/resume` | Tiếp tục đúng lượt chờ theo ID |

- JWT + role DOCTOR + BENH_AN.VIEW; kiểm tra quyền sở hữu từ người dùng đăng nhập, không nhận doctorId tự khai.
- Danh sách trả id/code, tên/mã bệnh nhân, số chỉ định pending và metadata phân trang. Transition trả id/status/message.
- Transaction khóa dòng `luot_kham` bằng FOR UPDATE rồi đọc lại trạng thái/owner/hồ sơ/hóa đơn. Không sửa ICD, đơn thuốc, chỉ định hoặc hóa đơn trong transition.
- Lặp cùng trạng thái là idempotent; trạng thái nguồn không phù hợp, hồ sơ đã hoàn tất, hóa đơn đã thanh toán/hủy đều bị chặn.
- Sự kiện queue.updated gửi ID/trạng thái vào phòng riêng bác sĩ. Nếu phát sự kiện lỗi sau commit thì ghi cảnh báo, không báo thao tác đã lưu là thất bại; người dùng có thể làm mới.
- GET chi tiết lượt khám hiện có vẫn được dùng theo ID; mở lượt chờ không gọi endpoint active và không tạo lượt khám mới.

### 18.4. Giao diện và an toàn khi đổi A → B → A

- Thêm panel Lượt chờ kết quả tại hàng đợi và trang khám: lỗi/loading/rỗng, làm mới, phân trang 10 dòng, mở đúng `luotKhamId`.
- Thêm nút Chờ kết quả/Tiếp tục khám và badge; chờ chỉ chuyển trang sau khi lưu nháp thành công. Lỗi lưu/transition giữ nguyên phiếu, không toast thành công giả.
- Session phiếu khám được key theo visitId: form, ref, autosave và callback cũ không ghi vào lượt khác. Phản hồi load cũ bị bỏ qua sau khi unmount.
- Các lượt lưu trong một session được xếp hàng tuần tự. Nháp local chưa đồng bộ được đánh dấu pending; phản hồi lưu phiên bản cũ không xóa dữ liệu mới đang soạn hoặc ghi đè khi quay lại A.
- Giữ ICD, thuốc và chỉ định riêng theo lượt. Khi thao tác chỉ định chỉ tải lại danh sách chỉ định, không reload toàn phiếu.
- Khóa form lúc gửi/chuyển trạng thái; lượt hoàn tất/hủy chỉ đọc. Nút hoàn tất bị khóa khi còn ở trạng thái chờ.
- Nháp localStorage là cơ chế có sẵn, được bổ sung quản lý pending; chưa đổi chính sách lưu trữ/xóa dữ liệu y tế trên máy hoặc đồng bộ xung đột giữa nhiều trình duyệt.

### 18.5. Lọc công khai tối thiểu — đã được duyệt

- Thêm query tùy chọn `excludeType=CAN_LAM_SANG` trên API danh sách dịch vụ, validate bằng enum.
- `ServiceCards` (dùng chung tại trang chủ và `/dich-vu`) gửi bộ lọc này; loại CLS trước phân trang, giữ KHAM và bản ghi cũ chưa phân loại.
- API mặc định không truyền excludeType vẫn trả dữ liệu cũ; Admin và catalog chỉ định không bị loại CLS.
- Khảo sát AppointmentForm hiện chọn chuyên khoa/bác sĩ, không có trường chọn serviceId hoặc tải danh mục dịch vụ. Không tự sửa form đặt lịch hay suy đoán loại dịch vụ từ tên/khoa. Các liên kết đặt lịch từ card CLS không còn xuất hiện.

### 18.6. Kiểm thử thực tế

| Kiểm tra | Kết quả cuối |
|---|---|
| 8 suite BE liên quan (nháp, waiting service/controller, invoice, service-orders service/controller/repository, classification) | **111/111 PASS** |
| Chạy riêng toàn thư mục test kham-benh | **46/46 PASS**, trùng một phần bộ 111, không cộng thành tổng mới |
| Browser Chrome thật, toàn bộ API/ws giả lập/chặn | **19/19 PASS**, 0 FAIL, khoảng 49 giây |
| Prisma generate local | PASS; không áp dụng schema lên DB |
| Build BE | PASS |
| Build FE (`tsc -b` + Vite) | PASS; còn cảnh báo chunk lớn hơn 500 kB |
| Lint FE toàn dự án | Exit 0, 7 warning ở các file ngoài phạm vi Bước 5; không tự sửa |
| Lint BE phạm vi service/repository/controller/DTO waiting và hai file khám sửa chính | PASS, exit 0 sau sửa lỗi format/unbound-method trong phần mới; không chạy lint --fix toàn dự án |
| PostgreSQL transaction/rollback/race thật | BLOCKED: chưa có DB test tách biệt |
| FE → BE → Neon và realtime server thật | NOT RUN, không ghi dữ liệu khám lên Neon |

Ngoài 12 ca Bước 4, browser bổ sung 7 ca: A→B→A giữ ICD/thuốc/chỉ định; lưu/chờ/danh sách/mở đúng ID/kết quả/tiếp tục/F5; lưu lỗi không chuyển chờ; response B chậm không ghi đè A; response lưu cũ không đè nháp A mới; chuyển chờ lỗi giữ phiếu; public services lọc CLS nhưng giữ dữ liệu cũ. Các ca mở lại theo ID kiểm tra không gọi API active.

Backend kiểm tra owner/role/permission, validation phân trang và ID, trạng thái đóng, idempotency, điều kiện có nháp/pending, socket lỗi sau lưu, thứ tự lấy khóa và cập nhật trạng thái, danh sách không giới hạn hôm nay. Mock không chứng minh SQL đã chạy hoặc concurrency thật.

Các test nháp ban đầu và kiểm tra đơn giữ lại có FAIL trước sửa rồi PASS sau sửa như mục 18.1. Không che các lần fixture/test bị lỗi; không coi những lần đó là lỗi DB.

Lệnh tái chạy:

```text
BE: npm.cmd test -- --runInBand --runTestsByPath src/modules/kham-benh/examination-draft-prescription.spec.ts src/modules/kham-benh/waiting-visits.spec.ts src/modules/kham-benh/waiting-visits.controller.spec.ts src/modules/kham-benh/examination-invoice.spec.ts src/modules/chi-dinh-dich-vu/service-orders.service.spec.ts src/modules/chi-dinh-dich-vu/service-orders.controller.spec.ts src/modules/chi-dinh-dich-vu/service-orders.repository.spec.ts src/modules/dich-vu/service-classification.spec.ts
FE: node --test --test-concurrency=1 tests/service-orders.browser.mjs
    Cấu hình Chrome/PLAYWRIGHT_MODULE và Vite test 5187 như mục 17.
FE: npm.cmd run lint
FE/BE: npm.cmd run build
```

Fixtures browser/BE chỉ ở bộ nhớ; context trình duyệt đóng sau test. Không có dữ liệu test cloud để xóa; giữ test source phục vụ hồi quy.

### 18.7. File trong phạm vi Bước 5

Tạo mới:

- `BE/prisma/migrations/20261118000000_add_waiting_visit_status/migration.sql` (chỉ chuẩn bị).
- `BE/src/modules/kham-benh/dto/waiting-visit-query.dto.ts`.
- `BE/src/modules/kham-benh/repositories/waiting-visits.repository.ts`.
- `BE/src/modules/kham-benh/waiting-visits.service.ts`.
- `BE/src/modules/kham-benh/waiting-visits.controller.ts`.
- `BE/src/modules/kham-benh/waiting-visits.spec.ts`.
- `BE/src/modules/kham-benh/waiting-visits.controller.spec.ts`.
- `BE/src/modules/kham-benh/examination-draft-prescription.spec.ts`.
- `FE/src/modules/kham-benh/api/waiting-visits.api.ts`.
- `FE/src/modules/kham-benh/hooks/use-waiting-visits.ts`.
- `FE/src/modules/kham-benh/components/WaitingVisitsPanel.tsx`.
- `FE/src/modules/kham-benh/index.ts`.

Sửa:

- `BE/prisma/schema.prisma`.
- `BE/src/modules/kham-benh/examinations.module.ts`.
- `BE/src/modules/kham-benh/examinations.service.ts`.
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`.
- `BE/src/modules/kham-benh/examination-invoice.spec.ts`.
- `BE/src/modules/chi-dinh-dich-vu/service-orders.service.ts` và `.spec.ts`.
- `BE/src/modules/hang-cho/repositories/prisma-queue.repository.ts`.
- `BE/src/modules/dich-vu/dto/service-query.dto.ts`.
- `BE/src/modules/dich-vu/services.service.ts`.
- `BE/src/modules/dich-vu/service-classification.spec.ts`.
- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`.
- `FE/src/modules/hang-cho/pages/bac-si/TrangHangDoiKham.tsx`.
- `FE/src/modules/chi-dinh-dich-vu/components/ServiceOrdersPanel.tsx` (file Bước 4 chưa commit; chỉ mở editable cho trạng thái chờ).
- `FE/src/modules/dich-vu/api/service.api.ts`.
- `FE/src/modules/dich-vu/hooks/use-services.ts`.
- `FE/src/modules/dich-vu/components/ServiceCards.tsx`.
- `FE/tests/service-orders.browser.mjs` (bổ sung test vào file Bước 4).
- Báo cáo này.

Giữ nguyên các thay đổi có trước: migration phân quyền cũ đã bị xóa, hai file seed cận lâm sàng và module/test FE Bước 4. Trong khi làm việc phát hiện `docs/package-lock.json` bị xóa ngoài phạm vi tác vụ; không tự tạo/xóa/restore file này và không gộp vào kết quả Bước 5.

### 18.8. Bàn giao và điểm cần duyệt tiếp

**Checkpoint Bước 5 ban đầu:** đã xong phần code và kiểm thử giả lập; chưa deploy, chưa xác nhận E2E database thật. Trong checkpoint đó không Git mutation, migration/seed/clinical write trên Neon; không sửa SePay, FEFO/tồn kho, lịch trực hoặc phân quyền. Migration được duyệt và áp dụng ở lượt sau: mục 19.

1. Migration CHO_KET_QUA đã được duyệt và áp dụng riêng ở mục 19; chấp thuận migration Bước 3 không mặc định bao gồm Bước 5.
2. Cần PostgreSQL test tách biệt để kiểm chứng khóa/rollback/race, nhiều tab/bác sĩ, mở lại sau đổi ngày và realtime thực; mock chưa thay thế bước này.
3. Chưa có phí chỉ định trong hóa đơn. Không dùng bản MVP hiện tại để quyết toán dịch vụ thật.
4. Đề nghị duyệt **Bước 6: cộng phí chỉ định vào hóa đơn và test các luồng có/không thuốc**, giữ nguyên giới hạn không ghi dữ liệu khám lên Neon. Duyệt Bước 6 không đồng nghĩa duyệt chạy migration.

## 19. Áp dụng migration CHO_KET_QUA lên Neon

Ngày 17/11/2026, sau khi được giải thích đây là migration mới không phải migration phân quyền cũ, chủ dự án yêu cầu áp dụng. Chỉ chạy migration `20261118000000_add_waiting_visit_status`; không chạy `migrate deploy` hàng loạt, migration phân quyền, seed hay ghi dữ liệu khám.

- Đích đọc trực tiếp: project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`, database `smart_clinic`, schema `public`.
- Trước ghi: enum có 5 giá trị cũ, chưa có `CHO_KET_QUA`; chỉ migration này pending; không có migration lỗi chưa rollback hoặc file đã áp dụng bị thiếu. 24 checksum cũ khác byte do LF/CRLF nhưng khớp sau chuẩn hóa LF; ba file còn lại khớp trực tiếp.
- Xác nhận có backup/điểm khôi phục do chủ dự án cung cấp trước đó trong cùng ngày (mục 14). Không tạo backup mới, không tự xác minh PITR hoặc thử khôi phục. Không thể hoàn tác riêng giá trị enum bằng lệnh DROP VALUE thông thường; khi cần rollback phải đánh giá phụ thuộc và phương án khôi phục.
- Thực thi đúng file SQL sau khi xác minh SHA-256, xác minh đích và lịch sử lần nữa trong transaction, advisory lock, `lock_timeout=5s` và `statement_timeout=25s`. COMMIT thành công. Sau đó `prisma migrate resolve --applied 20261118000000_add_waiting_visit_status` ghi nhận migration đã thực thi, không đánh dấu trước khi chạy.
- Kết nối mới READ ONLY xác nhận `CHO_KET_QUA` có trong enum; lịch sử có một bản ghi hoàn tất lúc `2026-11-17T06:53:10.199Z` (13:53:10, UTC+7), chưa rollback, checksum khớp file `d4359d1f1c6d735bbca71b481826d10ca8a7890db8bbf00bede3a39c332145be`.
- Đếm đối chiếu trước/sau: **463 lượt khám, 0 chỉ định**, không đổi. Đây là kiểm tra số lượng, không chứng minh mọi trường dữ liệu không đổi. SQL migration chỉ thêm giá trị enum, không cập nhật các hàng.
- Comment trong file migration vẫn nói chưa được phép chạy vì file đã ghi nhận checksum; thông tin đúng mới nhất là mục này. Không sửa file sau khi đã ghi lịch sử.
- Kết nối sandbox ban đầu EACCES, đã được phép dùng quyền mạng cần thiết. Không in thông tin đăng nhập. Cảnh báo SSL là cảnh báo từ thư viện, không làm thất bại migration.

**MIGRATION PASS:** đã ghi và đọc lại Neon. Không đồng nghĩa Bước 5 đã được E2E trên database thật; chưa tạo dữ liệu test khám, chưa kiểm thử rollback/concurrency PostgreSQL hoặc realtime thật, và chưa triển khai Bước 6.
