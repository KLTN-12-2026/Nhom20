# Đánh giá v17 — Cảnh báo dị ứng và gợi ý thuốc bằng Gemini

Ngày cập nhật: 13/08/2026

## 1. Kết quả đã hoàn thành

- [x] Chỉ hiển thị card cảnh báo lớn cho xung đột dị ứng `DI_UNG_THUOC`.
- [x] Card rule-based hiển thị dị ứng đã ghi nhận, thuốc đang kê, hoạt chất xung đột và mức độ cảnh báo.
- [x] Card gợi ý Gemini chỉ xuất hiện sau khi bác sĩ bấm **Xem gợi ý AI**.
- [x] Nút chuyển ngay sang **Đang phân tích...**, bị vô hiệu hóa và có loading ngay trong card.
- [x] Backend gửi cho Gemini dữ liệu thật gồm lý do khám, chuyên khoa, chẩn đoán/ICD-10, JSONB khám chuyên khoa, dị ứng, thuốc đang kê và ứng viên đã lọc.
- [x] Gemini chỉ được xếp hạng tối đa 1–3 thuốc nằm trong danh sách Backend cho phép.
- [x] Không có ứng viên trả thông báo: `Chưa tìm thấy thuốc thay thế phù hợp trong dữ liệu hệ thống.`
- [x] Gemini lỗi trả thông báo: `Không thể tải gợi ý AI lúc này. Cảnh báo dị ứng vẫn có hiệu lực.`
- [x] Không dùng kết quả fallback khó hiểu khi Gemini lỗi.
- [x] Thiếu liều dùng/cách dùng được báo ngay tại dòng kê thuốc và bị chặn khi hoàn tất khám; không tạo card AI.
- [x] Nút **Đã xem** đã đổi sang màu xanh nhạt, ít chói hơn. Toast hiển thị ngay khi bấm, không đợi API hoàn tất.
- [x] Giữ nguyên `lan_chay_ai`, rule-based, JSONB chuyên khoa và luồng Bác sĩ → Dược sĩ.
- [x] Không sửa Prisma hoặc migration; đã bổ sung dữ liệu ứng viên thuốc thay thế có kiểm soát vào Neon.

## 2. Luồng nghiệp vụ sau khi sửa

```text
Bác sĩ kê thuốc
→ Backend đối chiếu thuốc/hoạt chất với dị ứng bệnh nhân
→ không trùng: không hiện card dị ứng, không gọi Gemini
→ có trùng: hiện CARD 1 — Cảnh báo dị ứng rule-based
→ bác sĩ bấm “Xem gợi ý AI”
→ Backend lọc ứng viên theo Database, tồn kho, hạn dùng, trạng thái và dị ứng
→ Gemini xếp hạng tối đa 1–3 ứng viên được phép
→ hiện CARD 2 — Gợi ý thuốc tham khảo
→ bác sĩ tự quyết định giữ hoặc sửa đơn
→ hoàn tất khám và chuyển Dược sĩ
```

Gemini không tự kê đơn, không tự thay thuốc, không thêm thuốc vào đơn và không tạo liều/số ngày dùng.

## 3. API sử dụng

| API | Quyền | Chức năng |
|---|---|---|
| `GET /api/v1/examinations/visit/:visitId/ai-explain?warningId=:id` | Bác sĩ phụ trách lượt khám | Lấy tối đa 1–3 gợi ý từ Gemini sau khi Backend lọc ứng viên. |
| API cập nhật trạng thái cảnh báo hiện có | Bác sĩ phụ trách lượt khám | Xác nhận đã xem hoặc bỏ qua cảnh báo rule-based. |

Tên endpoint `ai-explain` được giữ để không phá client cũ, nhưng dữ liệu trả về là danh sách gợi ý đã xếp hạng.

## 4. Quy tắc an toàn

- Rule-based là nguồn xác định xung đột dị ứng và vẫn có hiệu lực khi Gemini lỗi.
- Gemini không truy cập Prisma trực tiếp và không được tạo thuốc ngoài Database.
- ID lạ, trùng hoặc không thuộc danh sách ứng viên Backend cung cấp bị loại bỏ.
- Khi không có ứng viên, Backend không gọi Gemini.
- Chỉ lần gọi Gemini thật mới được ghi vào `lan_chay_ai`.
- Thiếu liều dùng/cách dùng là lỗi nhập liệu của đơn thuốc, không phải cảnh báo AI.

## 5. File đã sửa trong đợt này

### Backend

- `BE/prisma/seed-data/seed-drug-alternatives.mjs` (mới)
- `BE/package.json`
- `BE/src/modules/kham-benh/goi-y-thuoc-ai.service.ts`
- `BE/src/modules/kham-benh/prescription-safety.service.ts`
- `BE/src/modules/kham-benh/examinations.service.ts`
- `BE/src/modules/kham-benh/repositories/dien-giai-canh-bao-ai.repository.interface.ts`
- `BE/src/modules/kham-benh/repositories/prisma-dien-giai-canh-bao-ai.repository.ts`

### Frontend

- `FE/src/modules/kham-benh/pages/bac-si/TrangKhamBenh.tsx`
- `FE/src/modules/kham-benh/types/examination.types.ts`
- `FE/src/modules/bac-si/doctor-workspace.css`

## 6. Database

- Không đổi Prisma.
- Không tạo/chạy migration, không `db push` và không reset Database.
- Giữ nguyên cấu trúc `goi_y_thuoc_thay_the` và `lan_chay_ai`.
- Đã seed idempotent hai quan hệ ứng viên vào `goi_y_thuoc_thay_the`:
  - `Aspirin 81mg / Acid acetylsalicylic` → `Clopidogrel 75mg` (lô hợp lệ còn 440).
  - `Amoxicillin 500mg / Amoxicillin` → `Azithromycin 500mg` (lô hợp lệ còn 300).
- Đây chỉ là danh sách ứng viên để Backend lọc và Gemini xếp hạng. Hệ thống không tự đổi thuốc; bác sĩ quyết định cuối cùng.
- Trường `nguoiDuyetId` hiện là khóa bắt buộc của schema cũ nên seed dùng tài khoản hệ thống làm dấu vết tạo dữ liệu, không phát sinh nghiệp vụ Admin duyệt thuốc.

## 7. Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| FE chỉ render cảnh báo dị ứng trong vùng card an toàn | PASS |
| Gemini chỉ chạy khi bấm nút | PASS |
| Loading và trạng thái nút xuất hiện trước khi chờ response | PASS |
| Thiếu liều/cách dùng hiển thị inline | PASS |
| Không còn fallback ứng viên khi Gemini lỗi | PASS |
| Build Backend | PASS |
| Build Frontend | PASS |
| Seed quan hệ thuốc thay thế lên Neon | PASS |
| Kiểm tra ứng viên có lô còn hạn và còn tồn | PASS |

Frontend còn cảnh báo bundle lớn sẵn có của Vite; không ảnh hưởng chức năng này.

## 8. Cách test thủ công

1. Đăng nhập bác sĩ phụ trách lượt khám của bệnh nhân có khai báo dị ứng.
2. Kê một thuốc có hoạt chất trùng dị ứng và chờ card cảnh báo rule-based xuất hiện.
3. Kiểm tra card có dị ứng, thuốc kê, hoạt chất xung đột và mức độ.
4. Bấm **Xem gợi ý AI**; nút phải chuyển ngay thành **Đang phân tích...**.
5. Nếu có ứng viên, kiểm tra card Gemini chỉ hiển thị 1–3 thuốc thật và lý do ngắn.
6. Nếu không có ứng viên hoặc Gemini lỗi, kiểm tra đúng thông báo tiếng Việt đã quy định.
7. Bấm **Đã xem**; toast phải hiện ngay và nút có màu xanh nhạt.
8. Bỏ trống liều hoặc cách dùng rồi hoàn tất khám; lỗi phải nằm ngay tại dòng thuốc.

Chưa thực hiện bài test Gemini end-to-end bằng trình duyệt trong báo cáo này; kết quả thực tế còn phụ thuộc BE đang chạy, khóa Gemini hợp lệ và lượt khám có xung đột dị ứng.
