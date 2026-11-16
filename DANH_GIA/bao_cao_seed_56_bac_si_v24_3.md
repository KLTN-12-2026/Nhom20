# Báo cáo seed 56 bác sĩ V24.3

## Cập nhật triển khai thực tế ngày 16/11/2026

**Migration và seed Neon đã thực hiện thành công, có đọc lại xác minh.** Phần lịch sử bên dưới mô tả trạng thái trước triển khai, không phải trạng thái hiện tại.

- Đích được truy vấn trực tiếp từ metadata Neon: project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`, database `smart_clinic`.
- Người dùng xác nhận 56 hồ sơ là demo và yêu cầu thực hiện ghi migration/seed.
- Tạo backup riêng bảng bác sĩ tại `C:\Users\JUN\AppData\Local\Temp\smartclinic-v243-backup-QkGhAQ\doctors-before.json`, kiểm tra hash sau khi đọc lại và khôi phục thử từ JSON vào bảng tạm thành công. Đây là backup phạm vi bảng bác sĩ, không phải backup toàn database hay PITR Neon. Nên lưu giữ bản backup này ngoài thư mục tạm trước khi dọn máy.
- Kiểm thử PostgreSQL thực tế trên `pg_temp.bac_si` cô lập trong phiên kết nối, không phải branch Neon thử nghiệm riêng: khôi phục backup, áp dụng đúng SQL migration, seed 56 và dry-run lần hai 0 ứng viên. Xác minh bảng thật không đổi trong quá trình thử.
- Áp dụng riêng SQL migration `20261116000000_add_doctor_certificate` trong transaction, ghi nhận tên/checksum vào `_prisma_migrations` cùng transaction. Không chạy `prisma migrate deploy` tổng, không áp dụng migration phân quyền `20261106170000_chuan_hoa_quyen_bon_vai_tro` còn pending.
- Dry-run thực tế trước seed: 56 ứng viên, 0 bỏ qua. Seed: cập nhật 56, bỏ qua 0. Sau seed: vẫn 56 bác sĩ, 56 có chứng chỉ. Đọc lại từng chứng chỉ khớp đầu vào; dry-run sau seed có 0 ứng viên.
- Nguồn `DEMO`; mọi giá trị có nhãn “Mô phỏng, chưa xác minh”, không có giấy phép, đơn vị cấp hoặc ngày cấp giả.
- So sánh dữ liệu bác sĩ trước/sau ngoài cột chứng chỉ: không đổi. Hash và số lượng của `nguoi_dung`, `chuyen_khoa`, `lich_hen`, `ho_so_kham`, `luot_kham`: không đổi. Không khẳng định đã audit toàn bộ bảng trong database.
- `GET http://localhost:3000/api/v1/doctors`: HTTP 200, 56 hồ sơ/56 chứng chỉ. Qua Vite `http://localhost:5173/api/v1/doctors`: HTTP 200 với cùng số lượng. Lỗi thiếu cột gây HTTP 500 trước đó đã hết tại API kiểm tra.
- Chạy lại 8 test Jest và 5 test seed: 13/13 PASS. FE build và BE TypeScript build đã PASS trong lượt kiểm tra trước triển khai; không có thay đổi FE/BE nghiệp vụ sau đó. Script triển khai mới đã được format.
- Kiểm thử trực tiếp trên trình duyệt và HTTP CREATE/UPDATE chưa chạy; không tự tạo thêm tài khoản thật để kiểm thử. Người dùng cần tải lại trang; không coi HTTP GET thành công là đã kiểm thử toàn bộ giao diện.
- File mới trong lượt triển khai: `BE/prisma/seed-data/deploy-doctor-certificates.mjs`; báo cáo này được cập nhật. Các file V24.3 trước đó được giữ nguyên; không sửa ICD, dược sĩ, thu ngân hay SePay, không Git mutation.

## Lịch sử kiểm tra trước khi được phép triển khai

## Kết luận

**CHƯA TRIỂN KHAI / BLOCKED.** Chưa chạy migration, chưa seed Neon, chưa có kiểm thử database thử nghiệm hoặc kiểm thử giao diện thực tế. Không reset, không ghi vào database, không chạy seeder tổng hay Git mutation.

## Nguyên nhân trang bác sĩ bị lỗi

Backend V24.3 mà tôi đã sửa trước đó có Prisma model `BacSi.chungChi`, nhưng database `smart_clinic` chưa có cột `bac_si.chung_chi`. Truy vấn Prisma chỉ đọc tái hiện lỗi `P2022`, `ColumnNotFound`, `bac_si.chung_chi`; GET `/api/v1/doctors` trên backend local trả HTTP 500. Trang chủ, đội ngũ bác sĩ và admin đều dựa vào hook/API bác sĩ này. Trang chủ chỉ render danh sách khi có dữ liệu, còn hai trang kia hiển thị lỗi. Chỉ đọc database cho thấy có 56 bác sĩ; con số 0 trên giao diện khi API lỗi không chứng minh mất dữ liệu. Việc thêm model khi schema chưa được migrate là nguyên nhân do thay đổi trước của tôi; xin lỗi người dùng.

## Migration và an toàn

- Migration dự kiến `BE/prisma/migrations/20261116000000_add_doctor_certificate/migration.sql` chỉ thêm cột nullable VARCHAR(255); đối chiếu tĩnh phù hợp Prisma. Chưa chạy ở branch hoặc database nào; chưa kiểm thử trên PostgreSQL riêng.
- Database cấu hình `smart_clinic` hiện có 56 bác sĩ, cột chứng chỉ chưa có. Project/branch Neon và backup/khôi phục chưa được xác minh; chưa có nhánh thử nghiệm được cung cấp.
- Đối chiếu danh sách migration local với bảng `_prisma_migrations` chỉ đọc cho thấy hai migration chưa có bản hoàn tất: `20261106170000_chuan_hoa_quyen_bon_vai_tro` và `20261116000000_add_doctor_certificate`. Migration phân quyền có thao tác thay đổi quyền bốn vai trò; **không chạy migrate deploy tổng** khi chưa review, vì có thể áp dụng thêm thay đổi ngoài phạm vi.

## Dữ liệu demo và seed

- Người dùng xác nhận 56 bác sĩ mã 2001–2056 là hồ sơ demo. Đối chiếu chỉ đọc file mẫu với Neon: 56 bác sĩ, 56 mã duy nhất, 0 mã không khớp, 0 sai tên/chuyên khoa.
- Tạo `BE/prisma/seed-data/doctor-certificates.demo.json`: 56 nội dung minh họa theo chuyên khoa, mỗi nội dung có nhãn “Mô phỏng, chưa xác minh”, nguồn `DEMO`; không tạo số giấy phép, tổ chức hoặc ngày cấp. Chỉ là dữ liệu giả lập để demo, không xác nhận bác sĩ có chứng chỉ thật. File được chuẩn bị, **chưa ghi DB**.
- Kiểm tra cấu trúc file: 56 dòng, 56 mã duy nhất, 0 dòng thiếu nhãn/nguồn hoặc vượt độ dài. Script seed hiện tại chỉ UPDATE cột `chung_chi` còn null/rỗng theo mã bác sĩ, có transaction, đối chiếu mã kế hoạch và mặc định dry-run.
- Dry-run chỉ đọc trên `smart_clinic`: `schemaReady=false`, tổng 56, 0 đủ điều kiện cập nhật, 56 bỏ qua do chưa có cột, cập nhật 0. Không thể kết luận số đã có chứng chỉ vì cột chưa tồn tại.
- Apply trên môi trường thử nghiệm: NOT RUN. Seed Neon: NOT RUN; số cập nhật 0. Đọc lại sau ghi và dry-run idempotency sau ghi: NOT RUN. Test idempotency/rollback bằng mock không thay thế kiểm thử database thật.

## Test

- 8/8 unit test bác sĩ PASS; 5/5 test script seed giả lập PASS.
- FE build PASS ra thư mục tạm, còn cảnh báo bundle lớn. BE TypeScript và biên dịch với `tsconfig.build.json` ra thư mục tạm PASS; chưa chạy Nest CLI build đầy đủ để không xóa `dist` đang dùng.
- API CREATE/UPDATE/GET với schema mới: NOT RUN. Kiểm tra hiển thị admin, trang chủ, mobile, tìm kiếm, phân trang, đặt lịch: NOT RUN. API danh sách hiện tại FAIL HTTP 500 như phân tích trên.

## File

- Mới trong phiên: `BE/prisma/seed-data/doctor-certificates.demo.json`; `DANH_GIA/bao_cao_seed_56_bac_si_v24_3.md`.
- Các thay đổi V24.3 có sẵn được giữ nguyên: `BE/prisma/schema.prisma`, `BE/prisma/migrations/20261116000000_add_doctor_certificate/migration.sql`, `BE/src/modules/bac-si/doctors.service.ts`, `BE/src/modules/bac-si/dto/create-doctor.dto.ts`, `BE/src/modules/bac-si/repositories/doctor.repository.interface.ts`, `BE/src/modules/bac-si/repositories/prisma-doctor.repository.ts`, `BE/src/modules/bac-si/doctor-certification.spec.ts`, `BE/prisma/seed-data/doctor-certificates.template.json`, `BE/prisma/seed-data/seed-doctor-certificates.mjs`, `BE/prisma/seed-data/seed-doctor-certificates.test.mjs`, `FE/src/modules/bac-si/pages/admin/TrangQuanLyBacSi.tsx`, `FE/src/modules/bac-si/types/doctor.types.ts`, `FE/src/modules/trang-chu/components/HomeDirectorySections.tsx`, `DANH_GIA/bao_cao_smartclinic_v24_3_hoan_thien.md`.

## Cần xác nhận để tiếp tục

Xác định project/branch `smart_clinic`, xác nhận backup hoặc điểm khôi phục, cung cấp branch thử nghiệm tách biệt và quyền chạy migration trên branch đó. Sau khi thử migration/seed ở test và review hai migration pending, trình số bản ghi dự kiến để được duyệt ghi Neon dùng chung. Không cung cấp mật khẩu hoặc connection string trong báo cáo/chat.
