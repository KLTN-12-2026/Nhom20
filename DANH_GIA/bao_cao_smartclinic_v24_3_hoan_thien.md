# Báo cáo hoàn thiện SmartClinic V24.3

## Tình trạng

**Chưa hoàn thành toàn bộ; triển khai Neon BLOCKED.** Code, kiểm tra định dạng, script seed và dry-run chỉ đọc đã được chuẩn bị. Chưa có database/branch thử nghiệm riêng được xác minh, chưa xác minh backup/khôi phục, chưa có dữ liệu chứng chỉ được duyệt và chưa được người quản lý chấp thuận ghi lên Neon.

Nhánh hiện tại `Tram`. `git diff --check` PASS; có cảnh báo LF/CRLF từ Git sau khi format, không phải lỗi nội dung. Không thực hiện Git add, commit, push, pull, merge, restore hoặc chuyển nhánh. Các thay đổi V24.3 có từ đầu phiên được giữ lại; không sửa module SePay.

## Lint, build và test

- Đã chạy Prettier giới hạn vào các file BE bác sĩ đang thay đổi từ V24.3, không format toàn repository. ESLint các file BE bác sĩ liên quan PASS; Prettier kiểm tra hai file script seed PASS.
- TypeScript BE `tsc --noEmit --incremental false` PASS. Prisma `validate` PASS. Build BE bằng `tsc -p tsconfig.build.json` ra thư mục tạm PASS; **không chạy `nest build` đầy đủ** vì cấu hình xóa `dist` có thể ảnh hưởng backend đang chạy.
- Build FE `npm run build` ra thư mục tạm PASS; còn cảnh báo bundle lớn. Lint FE PASS với 7 cảnh báo trước đó ngoài phạm vi.
- Tổng 13/13 test tự động PASS: 8 test Jest DTO/service/repository với mock; 5 test Node script seed bằng client giả lập, gồm dry-run, chống ghi đè, hai lần chạy, điều kiện xác nhận, mã trùng, validate và rollback mô phỏng. Không coi mock là kiểm thử PostgreSQL hoặc HTTP thật.
- CREATE/UPDATE/GET: PASS ở mức unit test mô phỏng; API thực tế với schema mới **NOT RUN**. Admin/trang chủ, responsive, tìm kiếm, phân trang, đặt lịch và kiểm thử trình duyệt **NOT RUN**.

## Migration

`BE/prisma/migrations/20261116000000_add_doctor_certificate/migration.sql` thêm duy nhất `bac_si.chung_chi VARCHAR(255)` nullable, phù hợp `BacSi.chungChi String? @map("chung_chi") @db.VarChar(255)`. Đối chiếu tĩnh cho thấy không xóa dữ liệu và không sửa bảng khác; chưa chứng minh được bằng thực thi.

Kiểm tra chỉ đọc database cấu hình: tên `smart_clinic`, cột chưa tồn tại. Chưa xác định được Neon project/branch hoặc khả năng khôi phục. Không có công cụ PostgreSQL local/nhánh test riêng đã xác minh trong môi trường này. **Migration chưa chạy ở test hay Neon**; chưa thể đối chiếu dữ liệu trước/sau migration. Backend V24.3 không được triển khai trỏ vào schema cũ vì truy vấn bác sĩ có thể lỗi thiếu cột.

## Danh sách bác sĩ và nguồn dữ liệu

Truy vấn chỉ đọc tìm thấy **56 bác sĩ** (mã 2001–2056). Danh sách mã, tên và chuyên khoa nằm trong `BE/prisma/seed-data/doctor-certificates.template.json`. Đây là danh sách cần kiểm tra chứ **không phải khẳng định 56 bác sĩ thiếu chứng chỉ**: cột chưa tồn tại nên chưa có dữ liệu chứng chỉ hiện tại để kiểm tra; trường `chungChiHienTai` ghi `CHUA_CO_COT`.

Không tìm được nguồn chứng chỉ đã xác thực/được duyệt. `chungChiDuKien` và `nguon` để trống, `daPheDuyet` là `false`; không tạo giấy phép hay chứng chỉ giả. Dữ liệu này không được công khai như chứng chỉ đã xác minh.

## Seed riêng

File `BE/prisma/seed-data/seed-doctor-certificates.mjs` mặc định là dry-run; đọc JSON qua `--file=...`, nhận `--dry-run`. Script đối chiếu theo mã duy nhất, kiểm tra mã trùng và nguồn đối với dòng được duyệt; chỉ cập nhật cột `chung_chi` còn null/rỗng, không tạo bác sĩ hoặc thay dữ liệu khác. Apply yêu cầu `--apply`, `--approved`, `--confirm-target=<mã đích>` và `--confirm-plan=<mã kế hoạch>` lấy từ dry-run; nếu kế hoạch thay đổi phải dry-run và duyệt lại. Các cờ kỹ thuật không thay thế phê duyệt của người quản lý, xác minh backup hay kiểm tra branch.

Dry-run đã chạy **chỉ đọc** trên database cấu hình: 56 bác sĩ, 0 đủ điều kiện, 56 bỏ qua vì chưa duyệt, 0 cập nhật; `schemaReady=false`. Lượt dry-run này **không xác định số chứng chỉ thiếu**, không phải phê duyệt để apply. Seed Neon chưa chạy; số bác sĩ cập nhật thực tế **0**. Idempotency và rollback mới test với client mô phỏng, chưa test DB thật.

## File thay đổi

**Đã tồn tại thay đổi V24.3 khi bắt đầu phiên:**

- `BE/prisma/schema.prisma`
- `BE/src/modules/bac-si/doctors.service.ts`
- `BE/src/modules/bac-si/dto/create-doctor.dto.ts`
- `BE/src/modules/bac-si/repositories/doctor.repository.interface.ts`
- `BE/src/modules/bac-si/repositories/prisma-doctor.repository.ts`
- `BE/src/modules/bac-si/doctor-certification.spec.ts`
- `BE/prisma/migrations/20261116000000_add_doctor_certificate/migration.sql`
- `FE/src/modules/bac-si/pages/admin/TrangQuanLyBacSi.tsx`
- `FE/src/modules/bac-si/types/doctor.types.ts`
- `FE/src/modules/trang-chu/components/HomeDirectorySections.tsx`
- `DANH_GIA/bao_cao_smartclinic_v24_3.md`

Trong phiên này chỉ format các file BE bác sĩ liên quan và tạo:

- `BE/prisma/seed-data/doctor-certificates.template.json`
- `BE/prisma/seed-data/seed-doctor-certificates.mjs`
- `BE/prisma/seed-data/seed-doctor-certificates.test.mjs`
- `DANH_GIA/bao_cao_smartclinic_v24_3_hoan_thien.md`

## Bàn giao / phê duyệt cần thiết

1. Người quản lý xác nhận project, branch, database đích; xác minh backup/khôi phục và cung cấp môi trường PostgreSQL/Neon branch test tách biệt.
2. Chạy thử migration trên môi trường test, kiểm tra dữ liệu bác sĩ cũ và API CREATE/UPDATE/GET, test giao diện/đặt lịch và seed hai lần trên DB test.
3. Điền nguồn, nội dung được phép công khai và duyệt từng chứng chỉ trong file mẫu; không dựa vào tên hoặc học vị để suy đoán.
4. Chạy lại dry-run trên đúng database đã có schema tương thích; trình danh sách và số thay đổi, xin duyệt cụ thể trước khi chạy migration/seed trên database chung. Kiểm tra toàn bộ migration pending trước khi chọn lệnh triển khai.
5. Với PC `main`: sau khi nhóm review và hợp nhất thay đổi theo quy trình của nhóm, triển khai migration đã duyệt **trước** backend dùng trường mới; sau đó triển khai FE/BE tương thích và kiểm thử lại. Không chạy seeder tổng hoặc chia sẻ file `.env`/mật khẩu.
