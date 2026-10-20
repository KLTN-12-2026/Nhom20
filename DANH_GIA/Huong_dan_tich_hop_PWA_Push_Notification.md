📱 SMART CLINIC — PWA & WEB PUSH REMINDER V2

Mục tiêu: Bổ sung PWA + Web Push Notification cho Smart Clinic với 2 nhóm nhắc:

📅 Nhắc lịch khám trước 1 ngày.

💊 Nhắc uống thuốc theo đơn thuốc đã được kê, nhưng giờ nhắc do bệnh nhân tự chọn.

Không xây dựng App Android/iOS Native trong giai đoạn này.

Công nghệ chính:

React + Vite + PWA + Service Worker + Web Push API + VAPID + NestJS + Prisma + PostgreSQL/Neon + Cron Job

1. NGUYÊN TẮC NGHIỆP VỤ QUAN TRỌNG

1.1. Bác sĩ / dược sĩ quyết định gì?

Bác sĩ hoặc quy trình kê đơn hiện tại là nguồn dữ liệu nghiệp vụ của thuốc:

Đơn thuốc
+
Chi tiết đơn thuốc
+
Thuốc
+
Liều dùng
+
Số lần dùng/ngày nếu hệ thống hiện có
+
Cách dùng / hướng dẫn

Hệ thống nhắc thuốc không được thay đổi:

❌ Tên thuốc
❌ Liều dùng
❌ Số lượng thuốc
❌ Số lần dùng/ngày
❌ Cách dùng
❌ Chỉ định của bác sĩ

Dược sĩ có thể thực hiện nghiệp vụ phát thuốc theo hệ thống hiện tại, nhưng module reminder không được tự biến nghiệp vụ phát thuốc thành lịch uống thuốc nếu source không có dữ liệu tương ứng.

1.2. Bệnh nhân quyết định gì?

Bệnh nhân chỉ cấu hình thời điểm muốn được nhắc.

Ví dụ đơn thuốc ghi:

Paracetamol 500mg
1 viên/lần
2 lần/ngày
Sau ăn

Bệnh nhân có thể chọn:

08:00
20:30

hoặc:

07:30
21:00

Đây là giờ nhắc cá nhân, không phải hệ thống sửa đơn thuốc.

Luồng đúng:

Bác sĩ kê thuốc
↓
Đơn thuốc lưu DB
↓
Bệnh nhân xem đơn
↓
Bệnh nhân bật "Nhắc uống thuốc"
↓
Bệnh nhân chọn giờ muốn được nhắc
↓
Backend lưu cấu hình reminder
↓
Cron đến giờ
↓
Web Push
↓
🔔 Điện thoại bệnh nhân

2. NGUYÊN TẮC KHÔNG SUY DIỄN

Không được làm:

2 lần/ngày
↓
Backend tự quyết định 07:00 / 20:00 ❌

Không được dùng Gemini:

"Hãy đoán giờ uống thuốc phù hợp" ❌

Không được parse câu hướng dẫn tự do rồi coi đó là chỉ định y khoa chính xác:

"Sáng tối sau ăn"
↓
AI tự tạo lịch chính thức ❌

Nếu source hiện tại không đủ dữ liệu về tần suất sử dụng thì:

REPORT
↓
Đề xuất thay đổi dữ liệu kê đơn
↓
STOP

Không tự đoán.

3. QUYỀN CỦA BỆNH NHÂN KHI CẤU HÌNH REMINDER

Bệnh nhân được phép:

✅ Bật / tắt reminder cho từng thuốc
✅ Chọn giờ muốn được nhắc
✅ Sửa giờ nhắc
✅ Tạm dừng reminder
✅ Xóa cấu hình reminder
✅ Chọn khoảng ngày muốn nhận reminder

Bệnh nhân không được phép thông qua module reminder:

❌ Đổi thuốc
❌ Đổi liều
❌ Đổi số lần/ngày trên đơn
❌ Đổi cách dùng
❌ Sửa đơn thuốc gốc

4. CÁCH XÁC ĐỊNH SỐ GIỜ NHẮC

Trường hợp A — Đơn thuốc có soLanTrongNgay

Ví dụ:

2 lần/ngày

Frontend chỉ cho bệnh nhân cấu hình tối đa:

2 mốc giờ

Ví dụ:

08:00
20:30

Nếu:

3 lần/ngày

thì tối đa:

3 mốc giờ

Trường hợp B — Đơn thuốc không có dữ liệu tần suất có cấu trúc

Không tự suy diễn.

Phase Audit phải xác định xem hiện tại chi_tiet_don_thuoc có field tương đương hay không.

Nếu không có:

Chưa bật reminder tự động cho thuốc đó

hoặc phải bổ sung cấu trúc kê đơn trước.

Trường hợp C — Thuốc "khi cần"

Ví dụ:

Uống khi đau

Không tạo lịch recurring tự động.

Có thể hiển thị:

Thuốc sử dụng khi cần — không hỗ trợ lịch nhắc cố định

trong scope hiện tại.

5. THỜI GIAN NHẮC KHÔNG PHẢI THỜI GIAN ĐIỀU TRỊ

Cần phân biệt:

Thời gian điều trị
≠
Thời gian bệnh nhân muốn nhận notification

Ví dụ bệnh nhân cấu hình:

Bắt đầu nhắc: 26/08/2026
Kết thúc nhắc: 30/08/2026

Hai field này chỉ điều khiển notification.

Không được cập nhật ngược vào đơn thuốc.

Nếu đơn thuốc hiện tại có ngày bắt đầu / ngày kết thúc chính thức, UI reminder nên dùng chúng làm giới hạn hợp lệ.

6. TRẢI NGHIỆM BỆNH NHÂN

6.1. Bật Web Push

Đăng nhập
↓
Cài PWA / mở website
↓
Bấm "Bật nhận thông báo"
↓
Browser hỏi Notification Permission
↓
Allow
↓
Browser tạo PushSubscription
↓
Backend lưu Subscription

6.2. Tạo lịch nhắc thuốc

Trang:

Đơn thuốc của tôi

Bệnh nhân chọn:

Paracetamol 500mg
1 viên/lần
2 lần/ngày
Sau ăn

[ Bật nhắc thuốc ]

Modal:

NHẮC UỐNG THUỐC

Thuốc:
Paracetamol 500mg

Theo đơn:
1 viên/lần
2 lần/ngày
Sau ăn

Giờ nhắc 1:
[08:00]

Giờ nhắc 2:
[20:30]

Bắt đầu nhắc:
[26/08/2026]

Kết thúc nhắc:
[30/08/2026]

[Hủy] [Lưu lịch nhắc]

7. NỘI DUNG NOTIFICATION

Ví dụ:

💊 Smart Clinic - Nhắc dùng thuốc

Đã đến giờ dùng thuốc theo lịch nhắc của bạn.

Paracetamol 500mg
1 viên - Sau ăn.

Vui lòng sử dụng thuốc theo đúng hướng dẫn trong đơn.

Không đưa vào Lock Screen:

❌ Chẩn đoán chi tiết
❌ Bệnh án
❌ Kết quả xét nghiệm
❌ Thông tin nhạy cảm không cần thiết

Có thể cân nhắc chế độ notification riêng tư:

💊 Smart Clinic

Đã đến giờ sử dụng thuốc theo lịch nhắc của bạn.

Sau khi người dùng bấm notification mới mở chi tiết trong app.

8. KIẾN TRÚC TỔNG THỂ

BÁC SĨ
↓
Kê đơn
↓
don_thuoc
+
chi_tiet_don_thuoc
        │
        ▼
BỆNH NHÂN
↓
Xem đơn thuốc
↓
Chọn giờ nhắc cá nhân
↓
cau_hinh_nhac_thuoc
+
thoi_gian_nhac_thuoc
        │
        ▼
NESTJS
↓
Cron / Reminder Service
↓
Push Subscription
↓
Web Push + VAPID
↓
🔔 Điện thoại

9. DOMAIN HIỆN TẠI

Frontend:

Local:
http://localhost:5173

Public:
https://smartclinic.io.vn

Backend:

Local:
http://localhost:3000

Public:
https://api.smartclinic.io.vn

Cloudflare Named Tunnel:

smartclinic.io.vn
→ localhost:5173

api.smartclinic.io.vn
→ localhost:3000

Swagger nếu source đang setup /api/docs:

https://api.smartclinic.io.vn/api/docs

10. DATABASE — NGUYÊN TẮC

BẮT BUỘC: Audit schema.prisma hiện tại trước khi tạo model.

Các model bên dưới chỉ là thiết kế đề xuất.

Nếu project đã có bảng tương đương thì phải reuse.

Không:

❌ Tạo trùng bảng
❌ prisma db push tùy tiện
❌ reset Neon
❌ sửa schema ngoài scope

11. TABLE 1 — PUSH SUBSCRIPTION

Mục đích

Lưu thiết bị/browser đã cho phép Web Push.

Đề xuất

model DangKyThongBaoDay {
  id            String   @id @default(uuid())
  nguoiDungId   String
  endpoint      String   @unique
  p256dh        String
  auth          String

  trinhDuyet    String?
  thietBi       String?
  dangHoatDong  Boolean  @default(true)

  ngayTao       DateTime @default(now())
  ngayCapNhat   DateTime @updatedAt

  // Relation phải map theo schema.prisma thật.
}

Ý nghĩa

Field

Ý nghĩa

id

ID subscription

nguoiDungId

User đang sở hữu thiết bị

endpoint

Endpoint do browser Push API tạo

p256dh

Web Push key

auth

Web Push auth secret

trinhDuyet

Chrome / Edge / Safari...

thietBi

Thông tin thiết bị nếu cần

dangHoatDong

Subscription còn dùng được

ngayTao

Ngày tạo

ngayCapNhat

Ngày cập nhật

Một user có thể có nhiều thiết bị.

12. TABLE 2 — CẤU HÌNH NHẮC THUỐC

Mục đích

Liên kết một cấu hình reminder với một chi tiết đơn thuốc cụ thể.

Đề xuất

model CauHinhNhacThuoc {
  id                 String   @id @default(uuid())

  nguoiDungId        String
  chiTietDonThuocId  String

  ngayBatDauNhac     DateTime?
  ngayKetThucNhac    DateTime?

  dangHoatDong       Boolean  @default(true)

  ngayTao            DateTime @default(now())
  ngayCapNhat        DateTime @updatedAt

  // Relations phải map theo schema thật.
}

Ý nghĩa

Field

Ý nghĩa

id

ID cấu hình

nguoiDungId

Bệnh nhân sở hữu reminder

chiTietDonThuocId

Thuốc trong đơn được nhắc

ngayBatDauNhac

Ngày bắt đầu notification

ngayKetThucNhac

Ngày dừng notification

dangHoatDong

Bật/tắt reminder

ngayTao

Ngày tạo

ngayCapNhat

Ngày chỉnh sửa

Quy tắc

Không nhận nguoiDungId tùy ý từ FE.

Backend lấy user từ JWT và verify:

chi_tiet_don_thuoc
↓
don_thuoc
↓
thuộc bệnh nhân đang đăng nhập

13. TABLE 3 — THỜI GIAN NHẮC THUỐC

Mục đích

Một cấu hình thuốc có thể có nhiều giờ nhắc.

Ví dụ:

CauHinhNhacThuoc #A
├── 08:00
└── 20:30

Đề xuất

model ThoiGianNhacThuoc {
  id                 String   @id @default(uuid())

  cauHinhNhacThuocId String
  gioNhac            String

  dangHoatDong       Boolean  @default(true)

  ngayTao            DateTime @default(now())
  ngayCapNhat        DateTime @updatedAt

  // Relation phải map theo schema thật.
}

gioNhac

Có thể lưu:

08:00
20:30

nhưng trước khi code phải xem convention/timezone hiện tại của project.

Nếu project có chuẩn lưu timezone khác thì phải theo chuẩn hiện tại.

Constraint logic

Ví dụ đơn:

soLanTrongNgay = 2

thì:

COUNT(ThoiGianNhacThuoc)
<= 2

Validation đặt ở Backend Service.

Không tin validation FE.

14. TABLE 4 — LỊCH SỬ NHẮC

Mục đích

Chống gửi notification trùng.

Có thể dùng chung cho:

APPOINTMENT_REMINDER
MEDICINE_REMINDER

Đề xuất

model LichSuNhac {
  id             String   @id @default(uuid())

  nguoiDungId    String
  loaiNhac       String
  doiTuongId     String

  thoiDiemNhac   DateTime

  daGui          Boolean  @default(false)
  ngayGui        DateTime?

  ngayTao        DateTime @default(now())

  // Unique/idempotency phải thiết kế sau khi audit DB thật.
}

Idempotency:

nguoiDungId
+
loaiNhac
+
doiTuongId
+
thoiDiemNhac

Ví dụ:

MEDICINE_REMINDER
+
cau_hinh_nhac_thuoc_id
+
2026-08-26 20:30

Nếu đã gửi:

Không gửi lại

15. QUAN HỆ TABLE ĐỀ XUẤT

nguoi_dung
│
├── dang_ky_thong_bao_day
│      ├── Chrome Android
│      └── Edge Laptop
│
└── don_thuoc
       │
       └── chi_tiet_don_thuoc
              │
              └── cau_hinh_nhac_thuoc
                     │
                     ├── thoi_gian_nhac_thuoc: 08:00
                     └── thoi_gian_nhac_thuoc: 20:30

lich_su_nhac
└── ghi nhận notification đã gửi

16. TẠI SAO KHÔNG LƯU GIỜ NHẮC VÀO chi_tiet_don_thuoc?

Không nên thêm trực tiếp:

gio_nhac_1
gio_nhac_2
gio_nhac_3

vào chi_tiet_don_thuoc.

Vì:

Đơn thuốc = dữ liệu y khoa do bác sĩ kê

Reminder = sở thích/cấu hình cá nhân của bệnh nhân

Hai nghiệp vụ phải tách nhau.

Lợi ích:

✅ Không sửa dữ liệu kê đơn
✅ Bệnh nhân thay đổi reminder thoải mái
✅ Có thể bật/tắt reminder
✅ Một thuốc có nhiều mốc giờ
✅ Dễ audit
✅ Dễ mở rộng

17. API ĐỀ XUẤT — PUSH SUBSCRIPTION

Phải audit route hiện tại trước.

Ví dụ:

POST   /api/v1/push-subscriptions
GET    /api/v1/push-subscriptions/me
DELETE /api/v1/push-subscriptions/:id

Không nhận user ID tùy ý.

User lấy từ JWT.

18. API ĐỀ XUẤT — MEDICINE REMINDER

Ví dụ:

GET    /api/v1/medicine-reminders/available-prescriptions
GET    /api/v1/medicine-reminders/me
POST   /api/v1/medicine-reminders
PATCH  /api/v1/medicine-reminders/:id
DELETE /api/v1/medicine-reminders/:id
PATCH  /api/v1/medicine-reminders/:id/status

Tên route cuối cùng phải theo convention source hiện tại.

Không tự tạo /api/v1 nếu project không dùng prefix đó.

19. PAYLOAD TẠO REMINDER

Ví dụ FE gửi:

{
  "chiTietDonThuocId": "{{chiTietDonThuocId}}",
  "ngayBatDauNhac": "2026-08-26",
  "ngayKetThucNhac": "2026-08-30",
  "gioNhac": [
    "08:00",
    "20:30"
  ]
}

Backend:

JWT
↓
nguoiDungId
↓
Verify đơn thuốc thuộc user
↓
Verify thuốc hợp lệ
↓
Verify số giờ không vượt quá tần suất cho phép
↓
Create CauHinhNhacThuoc
↓
Create ThoiGianNhacThuoc[]

20. UPDATE REMINDER

Bệnh nhân đổi:

08:00 → 08:30
20:30 → 21:00

Chỉ update:

cau_hinh_nhac_thuoc
thoi_gian_nhac_thuoc

Không update:

don_thuoc
chi_tiet_don_thuoc

21. CRON JOB

Đề xuất:

Cron mỗi 1–5 phút

Nếu hiện tại project chưa có scheduler thì audit trước.

Luồng:

Cron Trigger
↓
Medicine Reminder Service
↓
Tìm cấu hình đang hoạt động
↓
Kiểm tra ngày bắt đầu/kết thúc
↓
Match giờ hiện tại
↓
Kiểm tra LichSuNhac
↓
Tìm PushSubscription
↓
Gửi Web Push
↓
Ghi LichSuNhac

22. TIMEZONE

Đây là phần bắt buộc phải xử lý rõ.

Smart Clinic demo ở Việt Nam nên business time có thể là:

Asia/Ho_Chi_Minh
UTC+07:00

Nhưng không hard-code tùy tiện trước khi audit convention ngày giờ hiện tại.

Backend phải tránh lỗi:

Bệnh nhân chọn 20:30
↓
DB / server đổi timezone
↓
Push thành 13:30 ❌

Phase Audit phải xác định:

DB đang lưu UTC hay local?
NestJS xử lý Date thế nào?
Frontend format giờ thế nào?
Server PC timezone gì?

23. NHẮC LỊCH KHÁM

Giữ chức năng:

📅 Nhắc lịch khám trước 1 ngày

Nguồn:

lich_hen

Backend tự lấy lịch ngày hôm sau.

Không gửi cho trạng thái không hợp lệ.

Status phải lấy từ source thật.

Notification ví dụ:

🏥 Smart Clinic - Nhắc lịch khám

Bạn có lịch khám vào 09:00 ngày 26/08/2026.
Vui lòng đến trước giờ khám khoảng 15 phút.

24. PWA + SERVICE WORKER

Frontend:

manifest
service worker
notification permission
push subscription
notification click handler

Domain production:

https://smartclinic.io.vn

Web Push production sử dụng HTTPS.

25. VAPID

BE ENV:

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@smartclinic.io.vn

Frontend chỉ được dùng:

VAPID_PUBLIC_KEY

Không expose:

VAPID_PRIVATE_KEY

26. PHASE TRIỂN KHAI MỚI

PHASE 0 — AUDIT SOURCE

Đọc:

RULE.md
FE/
BE/
BE/prisma/schema.prisma

Auth / JWT / RBAC
Appointments
Prescriptions
Prescription details
Medicines
Patients / Users
Notifications
ScheduleModule / Cron nếu có
Axios config
CORS
Swagger

Audit đặc biệt:

1. don_thuoc hiện có field gì?
2. chi_tiet_don_thuoc có field gì?
3. Có soLanTrongNgay hoặc field tương đương không?
4. Có cách dùng / liều dùng không?
5. Có ngày bắt đầu/kết thúc không?
6. Có thuốc "khi cần" không?
7. Có notification module chưa?
8. Có bảng device/subscription chưa?
9. Có ScheduleModule chưa?
10. Timezone convention hiện tại là gì?

Output:

CURRENT ARCHITECTURE
PROBLEMS FOUND
TABLES REUSE
TABLES NEED CREATE
FILES NEED MODIFY
MIGRATION PLAN
API PLAN
TEST PLAN

REPORT → STOP

Chưa code.

PHASE 1 — PWA FOUNDATION

Manifest
PWA Icons
Service Worker
Register Service Worker

Test trên:

https://smartclinic.io.vn

REPORT → STOP.

PHASE 2 — VAPID + PUSH SUBSCRIPTION

web-push
VAPID ENV
Push Subscription DB
Repository
Service
Controller
DTO
FE Permission Flow

Test:

Login bệnh nhân
↓
Bật Notification
↓
Allow
↓
Subscription thật
↓
DB

REPORT → STOP.

PHASE 3 — TEST PUSH THẬT

Backend
↓
Subscription thật
↓
Điện thoại thật
↓
Lock Screen
↓
🔔 Notification

Nếu chưa PASS:

STOP

Chưa làm reminder.

PHASE 4 — NHẮC LỊCH KHÁM

lich_hen
↓
Reminder Service
↓
Push
↓
LichSuNhac

Test chống gửi trùng.

REPORT → STOP.

PHASE 5 — MEDICINE REMINDER DATABASE

Chỉ thực hiện sau khi Phase 0 xác nhận dữ liệu đơn thuốc đủ.

Tạo/reuse:

CauHinhNhacThuoc
ThoiGianNhacThuoc
LichSuNhac

Không sửa logic kê đơn.

REPORT → STOP.

PHASE 6 — PATIENT MEDICINE REMINDER UI

Trang bệnh nhân:

Đơn thuốc của tôi
↓
Chọn thuốc
↓
Bật reminder
↓
Chọn giờ
↓
Lưu

Validation:

Số mốc giờ <= số lần/ngày trên đơn

Nếu đơn không có tần suất có cấu trúc:

Không cho tạo tự động

REPORT → STOP.

PHASE 7 — MEDICINE REMINDER CRON

Cron
↓
Cấu hình reminder của bệnh nhân
↓
Giờ đã chọn
↓
Push
↓
History

Không dùng AI.

Không tự map khung giờ.

REPORT → STOP.

PHASE 8 — DOMAIN / DEVICE TEST

Test:

Android Chrome
Android Edge
PWA
Notification khi đóng tab
Lock Screen
Click Notification
Mạng 4G / Wi-Fi khác

REPORT → STOP.

PHASE 9 — DEMO DATA

Gần ngày bảo vệ.

Seed:

Bệnh nhân
Đơn thuốc
Chi tiết đơn thuốc
Lịch khám

Không seed:

PushSubscription giả

Reminder time phải được tạo qua UI bệnh nhân để demo đúng nghiệp vụ.

27. TEST CASE NHẮC THUỐC

TC01 — 2 lần/ngày

Đơn:

Paracetamol
2 lần/ngày

Bệnh nhân chọn:

08:00
20:30

Expected:

08:00 → push
20:30 → push

TC02 — Vượt quá số lần

Đơn:

2 lần/ngày

Bệnh nhân chọn:

08:00
14:00
20:00

Expected:

400 Bad Request

Message:

Số khung giờ nhắc không được vượt quá tần suất sử dụng trong đơn.

TC03 — Sửa giờ

Old:

08:00
20:30

New:

08:30
21:00

Expected:

Đơn thuốc không thay đổi.
Reminder được update.

TC04 — Tắt reminder

dangHoatDong = false

Expected:

Không push.

TC05 — Thuốc không thuộc bệnh nhân

User A gửi:

chiTietDonThuocId của User B

Expected:

403 / 404

Không lộ dữ liệu đơn thuốc user khác.

TC06 — Chống gửi trùng

Cron chạy lại cùng slot:

20:30
20:30

Expected:

Chỉ 1 notification.

TC07 — Subscription hết hạn

Web Push trả về:

404 / 410

Expected:

Disable hoặc xóa subscription tương ứng.

28. REVIEW DAY FLOW

PC Server:

FE:
npm run dev -- --host 0.0.0.0

BE:
npm run dev

Cloudflared:
Running

Laptop:

https://smartclinic.io.vn

Swagger:

https://api.smartclinic.io.vn/api/docs

Demo reminder thuốc:

1. Login bệnh nhân
2. Mở đơn thuốc
3. Chọn thuốc 2 lần/ngày
4. Chọn 2 giờ nhắc gần thời điểm demo
5. Lưu
6. Khóa điện thoại
7. Đợi Cron
8. 🔔 Notification

29. CÂU GIẢI THÍCH KHI BẢO VỆ

Nếu giảng viên hỏi:

"Hệ thống lấy đâu ra giờ uống thuốc?"

Trả lời:

Hệ thống không tự quyết định giờ uống thuốc.

Bác sĩ chịu trách nhiệm về đơn thuốc, liều dùng và tần suất sử dụng.
Sau khi có đơn, bệnh nhân có thể tự cấu hình các mốc giờ muốn được
hệ thống nhắc trong giới hạn tần suất trên đơn.

Các mốc giờ này chỉ là cấu hình notification cá nhân và không làm
thay đổi dữ liệu đơn thuốc của bác sĩ.

Nếu hỏi:

"Tại sao không dùng AI chọn giờ?"

Trả lời:

Đây là dữ liệu liên quan đến sử dụng thuốc nên hệ thống không để AI
suy diễn giờ sử dụng. Reminder chỉ dựa trên dữ liệu đơn thuốc và cấu
hình chủ động của bệnh nhân.

30. QUY TRÌNH AI BẮT BUỘC

Mỗi Phase:

READ
↓
EXPLAIN
↓
CODE
↓
TEST
↓
REPORT
↓
STOP

Không tự chuyển Phase.

Build PASS chưa đủ.

Nếu sửa BE:

npm run build
↓
Start Backend thật
↓
NestJS startup PASS
↓
Test API thật
↓
Runtime PASS

31. KHÔNG ĐƯỢC LÀM

❌ Không reset Neon
❌ Không db push tùy tiện
❌ Không đổi schema ngoài scope
❌ Không sửa đơn thuốc khi chỉnh reminder
❌ Không cho bệnh nhân đổi liều qua reminder
❌ Không tự map 2 lần/ngày = 07:00/20:00
❌ Không dùng Gemini chọn giờ
❌ Không hard-code userId
❌ Không hard-code ngày bảo vệ
❌ Không seed PushSubscription giả
❌ Không gửi dữ liệu bệnh án nhạy cảm qua notification
❌ Không refactor module không liên quan
❌ Không tự chuyển Phase

32. MỤC TIÊU CUỐI

Bác sĩ
↓
Kê đơn
↓
Database

Bệnh nhân
↓
Xem đơn
↓
Tự chọn giờ muốn được nhắc
↓
Reminder Configuration
↓
Cron
↓
Web Push
↓
🔔 Notification

Phân quyền rõ ràng:

BÁC SĨ
→ Thuốc / liều / tần suất / hướng dẫn

BỆNH NHÂN
→ Giờ notification cá nhân

HỆ THỐNG
→ Validate + lưu + Cron + gửi Push

GEMINI
→ Không tham gia quyết định giờ uống thuốc