# Báo cáo sửa seed chứng chỉ V24.3

## Cập nhật tiếp theo: bỏ chữ “cơ bản”

Theo yêu cầu người dùng, đổi ba tên đào tạo mô phỏng: “Đào tạo điện tâm đồ”, “Đào tạo siêu âm tim” và “Đào tạo siêu âm sản phụ khoa”. Các tên là dữ liệu demo, không xác nhận bác sĩ có chứng chỉ pháp lý; không tạo thông tin tổ chức cấp, ngày cấp hoặc số giấy phép.

- Neon `smart_clinic`, project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`: dry-run 21 ứng viên, 35 đã đúng, 0 conflict. APPLY thực tế cập nhật 21, bỏ qua 35.
- Đọc lại Neon: 56 bác sĩ, không còn giá trị kết thúc bằng “cơ bản”, tất cả 56 giá trị khớp file demo; các trường khác trong bảng bác sĩ khớp backup. Dry-run sau ghi: 0 ứng viên, 0 conflict, 56 đã đúng.
- Backup riêng bảng bác sĩ: `C:\Users\JUN\AppData\Local\Temp\smartclinic-training-backup-oTEqzM\doctors-before.json`; đã đọc lại và khôi phục thử vào bảng tạm PostgreSQL. Đây không phải backup toàn database.
- Test script 12/12 PASS. Chỉ thay cột `chung_chi` trong transaction khi giá trị cũ khớp; không chạy migration hay seeder tổng. Cập nhật danh sách demo, script seed, test và báo cáo này; file template đã bị xóa từ trước được giữ nguyên.

## Lịch sử trước lần bỏ chữ “cơ bản”

## Kết quả thực tế ngày 16/11/2026 — SEED PASS

- Đích Neon: database `smart_clinic`, project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`.
- Trước APPLY: 56 bác sĩ, 56 giá trị cũ sai khớp kế hoạch, 0 conflict. Chủ dự án đã phê duyệt tám nội dung mô phỏng không có tiền tố.
- Backup mới: `C:\Users\JUN\AppData\Local\Temp\smartclinic-correction-backup-I0ijOQ\doctors-before.json`; đọc lại và khôi phục thử 56 hồ sơ vào bảng tạm thành công. Đây là backup bảng bác sĩ, không phải backup toàn bộ database. Giữ bản sao ngoài thư mục tạm trước khi dọn máy.
- Dry-run thực tế: 56 ứng viên, 0 bỏ qua/conflict; APPLY chạy với mã đích và kế hoạch lấy từ dry-run, trong transaction, UPDATE chỉ `chung_chi` và so khớp chính xác giá trị cũ.
- APPLY cập nhật **56**, bỏ qua **0**, conflict **0**. Đọc lại: 56 bác sĩ; 56 giá trị mới khớp từng mã; **0** giá trị còn tiền tố seed sai; mọi trường khác trong bảng bác sĩ khớp backup.
- Dry-run sau APPLY: 0 ứng viên, 56 đã đúng, 0 conflict. Không chạy migration, reset, seeder tổng hay Git mutation.
- Test script: 11/11 PASS (giả lập); khôi phục backup vào bảng tạm PostgreSQL: PASS; đọc lại Neon: PASS. Nội dung là dữ liệu demo, không phải chứng chỉ pháp lý được xác minh.
- File thay đổi: `BE/prisma/seed-data/doctor-certificates.demo.json`, `BE/prisma/seed-data/seed-doctor-certificates.mjs`, `BE/prisma/seed-data/seed-doctor-certificates.test.mjs`, báo cáo này. `doctor-certificates.template.json` đã bị xóa trong working tree trước lượt này và được giữ nguyên, không tự khôi phục.

### Giá trị đã đọc lại theo từng bác sĩ

| Mã | Bác sĩ | Nội dung đào tạo mô phỏng |
| --- | --- | --- |
| 2001 | Nguyễn Văn Hòa | Đào tạo điện tâm đồ cơ bản |
| 2002 | Trần Thị Mai | Đào tạo cấp cứu nhi khoa |
| 2003 | Lê Hoàng Nam | Đào tạo soi da và nhận diện tổn thương da |
| 2004 | Phan Minh Đức | Đào tạo siêu âm tim cơ bản |
| 2005 | Nguyễn Thanh Tùng | Đào tạo nội soi Tai Mũi Họng |
| 2006 | Đinh Quốc Huy | Đào tạo siêu âm cơ xương khớp |
| 2007 | Đỗ Hoàng Phúc | Đào tạo điện tâm đồ cơ bản |
| 2008 | Phạm Gia Hân | Đào tạo cấp cứu nhi khoa |
| 2009 | Nguyễn Ngọc Thảo | Đào tạo soi da và nhận diện tổn thương da |
| 2010 | Võ Thành Luân | Đào tạo siêu âm tim cơ bản |
| 2011 | Lâm Minh Khoa | Đào tạo nội soi Tai Mũi Họng |
| 2012 | Trương Như Quỳnh | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2013 | Bùi Khánh Linh | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2014 | Trịnh Anh Dũng | Đào tạo siêu âm cơ xương khớp |
| 2015 | Tạ Ngọc Diệp | Đào tạo siêu âm tim cơ bản |
| 2016 | Nguyễn Minh Anh | Đào tạo điện tâm đồ cơ bản |
| 2017 | Lê Thu Trang | Đào tạo cấp cứu nhi khoa |
| 2018 | Phạm Hoàng Long | Đào tạo soi da và nhận diện tổn thương da |
| 2019 | Trần Quốc Bảo | Đào tạo siêu âm tim cơ bản |
| 2020 | Vũ Ngọc Mai | Đào tạo nội soi Tai Mũi Họng |
| 2021 | Đặng Hải Yến | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2022 | Hoàng Đức Nam | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2023 | Bùi Thanh Sơn | Đào tạo siêu âm cơ xương khớp |
| 2024 | Đinh Tuấn Tài | Đào tạo điện tâm đồ cơ bản |
| 2025 | Lê Thảo My | Đào tạo điện tâm đồ cơ bản |
| 2026 | Trần Gia Bảo | Đào tạo cấp cứu nhi khoa |
| 2027 | Ngô Tường Vy | Đào tạo cấp cứu nhi khoa |
| 2028 | Phạm Đức Trí | Đào tạo soi da và nhận diện tổn thương da |
| 2029 | Bùi Thị Hà | Đào tạo soi da và nhận diện tổn thương da |
| 2030 | Hoàng Nhật Minh | Đào tạo siêu âm tim cơ bản |
| 2031 | Lý Lan Hương | Đào tạo siêu âm tim cơ bản |
| 2032 | Đoàn Hữu Quốc | Đào tạo nội soi Tai Mũi Họng |
| 2033 | Vũ Ngọc Hân | Đào tạo nội soi Tai Mũi Họng |
| 2034 | Lưu Tiến Đạt | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2035 | Trần Bích Liên | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2036 | Tô Vĩnh Kiên | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2037 | Dương Cẩm Tú | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2038 | Khúc Cảnh Tùng | Đào tạo siêu âm cơ xương khớp |
| 2039 | Hồ Ánh Tuyết | Đào tạo siêu âm cơ xương khớp |
| 2040 | Nguyễn Thùy Dương | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2041 | Phạm Minh Ngọc | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2042 | Trần Minh Quang | Đào tạo điện tâm đồ cơ bản |
| 2043 | Võ Thu Hà | Đào tạo điện tâm đồ cơ bản |
| 2044 | Nguyễn Hải Đăng | Đào tạo cấp cứu nhi khoa |
| 2045 | Phan Ngọc Diễm | Đào tạo cấp cứu nhi khoa |
| 2046 | Lê Tuấn Kiệt | Đào tạo soi da và nhận diện tổn thương da |
| 2047 | Đặng Minh Châu | Đào tạo soi da và nhận diện tổn thương da |
| 2048 | Nguyễn Hoài Phương | Đào tạo siêu âm tim cơ bản |
| 2049 | Trương Đức Anh | Đào tạo nội soi Tai Mũi Họng |
| 2050 | Bùi Thanh Thảo | Đào tạo nội soi Tai Mũi Họng |
| 2051 | Hoàng Ngọc Trâm | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2052 | Nguyễn Mỹ Linh | Đào tạo siêu âm sản phụ khoa cơ bản |
| 2053 | Phạm Quốc Khánh | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2054 | Lê Khánh Vy | Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2055 | Nguyễn Trung Hiếu | Đào tạo siêu âm cơ xương khớp |
| 2056 | Trần Thảo Nguyên | Đào tạo siêu âm cơ xương khớp |

## Lịch sử trước APPLY

## Kết luận hiện tại

**Neon correction: BLOCKED / chưa apply.** Đã chuẩn bị 56 nội dung đào tạo mô phỏng, kiểm tra nguồn/giá trị cũ và chạy dry-run chỉ đọc. Chưa có phê duyệt danh sách cụ thể theo yêu cầu mới; `daPheDuyet=false` cho toàn bộ kế hoạch. Chưa có database thử nghiệm riêng được xác minh để test bước trước khi ghi Neon chung. Không coi yêu cầu sửa seed là bỏ qua hai điều kiện này.

## Nguyên nhân và phạm vi

Seed trước do tôi tạo đã sao chép chuyên khoa vào trường chứng chỉ, nên sai ý nghĩa nội dung dù có nhãn mô phỏng. Bản sửa sử dụng nội dung đào tạo cụ thể theo ví dụ người dùng, vẫn gắn nhãn “Dữ liệu đào tạo mô phỏng”, không tạo số giấy phép, mã chứng chỉ, đơn vị cấp hoặc ngày cấp giả. Người dùng đã xác nhận cả 56 hồ sơ là demo ở lượt trước.

Không sửa FE, API tạo/sửa bác sĩ, Prisma, migration hay các phân hệ khác. Git branch `Tram`, working tree sạch lúc bắt đầu lượt sửa này; không thực hiện Git mutation.

## Neon và backup

- Database `smart_clinic`, project `solitary-firefly-31944589`, branch `br-shiny-art-az888jre`: metadata được đọc trực tiếp từ Neon.
- Cột `bac_si.chung_chi` có sẵn, kiểu VARCHAR(255). Không tạo migration mới.
- Tổng 56 bác sĩ; 56 giá trị có tiền tố seed sai; 0 giá trị khác tiền tố tại thời điểm audit. Toàn bộ 56 mã khớp danh sách đầu vào.
- Backup phạm vi bảng bác sĩ trước V24.3 tại `C:\Users\JUN\AppData\Local\Temp\smartclinic-v243-backup-QkGhAQ\doctors-before.json` còn tồn tại, đọc được 56 bản ghi và khớp metadata đích. Đây là backup cũ trước khi thêm chứng chỉ, không phải snapshot hiện tại hay backup toàn database. Trước apply correction cần chụp snapshot mới và kiểm tra khôi phục. Không khẳng định đã xác minh PITR Neon.

## Script correction

`seed-doctor-certificates.mjs` thêm chế độ `--replace-demo`, giữ nguyên chế độ seed bổ sung cũ làm mặc định. Chế độ correction yêu cầu xác nhận demo, nguồn DEMO, nhãn mô phỏng và giá trị cũ cụ thể trong từng dòng. Kiểm tra mã và tên/chuyên khoa nếu có; dữ liệu nhập thủ công hoặc không khớp giá trị cũ thành conflict, không cập nhật. UPDATE dùng điều kiện mã bác sĩ và `chung_chi IS NOT DISTINCT FROM <giá trị cũ>` trong transaction, chỉ sửa `chung_chi`.

Mã kế hoạch ràng buộc toàn bộ chi tiết cũ/mới/trạng thái và đích; thay đổi dữ liệu sau dry-run làm mã xác nhận cũ không còn hợp lệ. Nếu conflict phát sinh giữa các UPDATE thì rollback cả transaction. Giá trị đã đúng nội dung mới được bỏ qua khi chạy lại. `--apply --approved` và các mã xác nhận chỉ là hàng rào kỹ thuật, không thay thế duyệt nội dung của người quản lý.

## Kết quả dry-run và test

- Lệnh đã chạy: `node prisma/seed-data/seed-doctor-certificates.mjs --dry-run --replace-demo --file=prisma/seed-data/doctor-certificates.template.json`.
- Schema sẵn sàng; tổng 56; chờ duyệt 56; conflict 0; ứng viên được phép ghi hiện tại 0; đã cập nhật 0.
- 56 dòng khớp điều kiện dữ liệu cũ nhưng chưa có phê duyệt nội dung nên chưa được đưa vào nhóm UPDATE. Khi được duyệt phải dry-run lại và lấy mã kế hoạch mới.
- Node tests: **11 PASS, 0 FAIL**, bao gồm tương thích seed cũ, chọn đúng seed sai, bảo vệ chứng chỉ nhập tay, mã không khớp, giá trị cũ thay đổi sau dry-run, từ chối mã trùng/nội dung rỗng/quá dài/thiếu xác nhận demo, idempotency, rollback và bảo toàn các trường ngoài chứng chỉ. Các test dùng client giả lập, không phải test database riêng.
- Prettier hai file script/test PASS; `node --check` PASS.
- Apply/đọc lại sau correction và idempotency trên Neon sau correction: **NOT RUN**. Số bác sĩ cập nhật correction: **0**. Không báo thành công cho phần chưa chạy. Chưa kiểm thử ở database riêng; không thay bằng thử trên bảng thật của Neon dùng chung.

## Danh sách cũ/mới để người quản lý duyệt

Nguồn tất cả dòng: DEMO; trạng thái tất cả: **chờ duyệt**. Các giá trị mới là đào tạo minh họa, không phải chứng chỉ đã xác minh.

| Mã | Bác sĩ | Chuyên khoa | Giá trị cũ chính xác | Giá trị đề xuất |
| --- | --- | --- | --- | --- |
| 2001 | Nguyễn Văn Hòa | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2002 | Trần Thị Mai | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2003 | Lê Hoàng Nam | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2004 | Phan Minh Đức | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2005 | Nguyễn Thanh Tùng | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2006 | Đinh Quốc Huy | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2007 | Đỗ Hoàng Phúc | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2008 | Phạm Gia Hân | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2009 | Nguyễn Ngọc Thảo | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2010 | Võ Thành Luân | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2011 | Lâm Minh Khoa | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2012 | Trương Như Quỳnh | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2013 | Bùi Khánh Linh | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2014 | Trịnh Anh Dũng | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2015 | Tạ Ngọc Diệp | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2016 | Nguyễn Minh Anh | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2017 | Lê Thu Trang | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2018 | Phạm Hoàng Long | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2019 | Trần Quốc Bảo | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2020 | Vũ Ngọc Mai | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2021 | Đặng Hải Yến | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2022 | Hoàng Đức Nam | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2023 | Bùi Thanh Sơn | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2024 | Đinh Tuấn Tài | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2025 | Lê Thảo My | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2026 | Trần Gia Bảo | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2027 | Ngô Tường Vy | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2028 | Phạm Đức Trí | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2029 | Bùi Thị Hà | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2030 | Hoàng Nhật Minh | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2031 | Lý Lan Hương | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2032 | Đoàn Hữu Quốc | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2033 | Vũ Ngọc Hân | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2034 | Lưu Tiến Đạt | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2035 | Trần Bích Liên | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2036 | Tô Vĩnh Kiên | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2037 | Dương Cẩm Tú | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2038 | Khúc Cảnh Tùng | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2039 | Hồ Ánh Tuyết | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2040 | Nguyễn Thùy Dương | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2041 | Phạm Minh Ngọc | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2042 | Trần Minh Quang | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2043 | Võ Thu Hà | Nội tổng quát | Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát | Dữ liệu đào tạo mô phỏng: Đào tạo điện tâm đồ cơ bản |
| 2044 | Nguyễn Hải Đăng | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2045 | Phan Ngọc Diễm | Nhi khoa | Mô phỏng, chưa xác minh: chuyên môn Nhi khoa | Dữ liệu đào tạo mô phỏng: Đào tạo cấp cứu nhi khoa |
| 2046 | Lê Tuấn Kiệt | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2047 | Đặng Minh Châu | Da liễu | Mô phỏng, chưa xác minh: chuyên môn Da liễu | Dữ liệu đào tạo mô phỏng: Đào tạo soi da và nhận diện tổn thương da |
| 2048 | Nguyễn Hoài Phương | Tim mạch | Mô phỏng, chưa xác minh: chuyên môn Tim mạch | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm tim cơ bản |
| 2049 | Trương Đức Anh | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2050 | Bùi Thanh Thảo | Tai Mũi Họng | Mô phỏng, chưa xác minh: chuyên môn Tai Mũi Họng | Dữ liệu đào tạo mô phỏng: Đào tạo nội soi Tai Mũi Họng |
| 2051 | Hoàng Ngọc Trâm | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2052 | Nguyễn Mỹ Linh | Sản Phụ khoa | Mô phỏng, chưa xác minh: chuyên môn Sản Phụ khoa | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm sản phụ khoa cơ bản |
| 2053 | Phạm Quốc Khánh | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2054 | Lê Khánh Vy | Mắt | Mô phỏng, chưa xác minh: chuyên môn Mắt | Dữ liệu đào tạo mô phỏng: Đào tạo khám mắt và sử dụng sinh hiển vi |
| 2055 | Nguyễn Trung Hiếu | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |
| 2056 | Trần Thảo Nguyên | Cơ Xương Khớp | Mô phỏng, chưa xác minh: chuyên môn Cơ Xương Khớp | Dữ liệu đào tạo mô phỏng: Đào tạo siêu âm cơ xương khớp |

## File thay đổi trong lượt này

- `BE/prisma/seed-data/doctor-certificates.template.json`: kế hoạch chính, giá trị hiện tại/đề xuất, xác nhận demo, chưa duyệt.
- `BE/prisma/seed-data/doctor-certificates.demo.json`: đồng bộ để không tiếp tục sử dụng nội dung cũ sai.
- `BE/prisma/seed-data/seed-doctor-certificates.mjs`: chế độ thay thế seed sai có điều kiện.
- `BE/prisma/seed-data/seed-doctor-certificates.test.mjs`: thêm test correction và giữ test seed bổ sung.
- `DANH_GIA/bao_cao_sua_seed_chung_chi_v24_3.md`: báo cáo này.

Script triển khai migration cũ không được chạy lại; đường triển khai correction là script seed với `--replace-demo` sau khi đủ điều kiện. Không gọi migration hoặc seeder tổng. Không ghi đè chứng chỉ có nguồn khác.

## Bước tiếp theo và rủi ro

Cần người quản lý duyệt danh sách trên và xác định database thử nghiệm riêng. Sau đó test correction, chụp/kiểm tra backup hiện tại, dry-run lại trên đích, duyệt số bản ghi và mã kế hoạch, mới apply; đọc lại giá trị, tổng bác sĩ, các trường ngoài chứng chỉ và dry-run lần nữa. Chứng chỉ hiển thị vẫn phải giữ nhãn mô phỏng; không sửa FE để che nhãn. Các báo cáo V24.3 trước là lịch sử, không phải kết quả correction này.
