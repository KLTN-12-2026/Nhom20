# RULE.md — Smart Clinic

## 1. Bối cảnh dự án

**Smart Clinic Management System** là hệ thống quản lý phòng khám thông minh.

Luồng nghiệp vụ chính:

```text
Đặt lịch
→ Check-in
→ Cấp số hàng chờ
→ Bác sĩ khám
→ Kê đơn
→ Dược sĩ xuất thuốc
→ Lập hóa đơn
→ Thanh toán
→ Nhắc tái khám
```

Vai trò:

```text
ADMIN
RECEPTIONIST
DOCTOR
PHARMACIST
PATIENT
```

Chức năng nổi bật:

* Quản lý bệnh nhân, bác sĩ và chuyên khoa.
* Đặt lịch khám.
* Hàng chờ realtime.
* Phiếu khám và đơn thuốc.
* Quản lý thuốc.
* Hóa đơn và thanh toán SePay.
* AI gợi ý lịch, bác sĩ, chuyên khoa.
* AI tóm tắt bệnh án.
* AI cảnh báo dị ứng và tương tác thuốc.
* AI nhắc tái khám.

AI chỉ hỗ trợ, không thay thế bác sĩ.

---

## 2. Công nghệ

### Frontend — `FE/`

* ReactJS
* TypeScript
* Vite
* React Router DOM
* Axios
* Zustand
* Bootstrap
* React Chart.js
* Lucide React
* Socket.IO Client

### Backend — `BE/`

* NestJS
* TypeScript
* PostgreSQL
* Prisma ORM
* JWT
* Class Validator
* Swagger
* Socket.IO
* Redis
* Gemini API
* SePay

### API Testing

```text
bruno/
```

---

## 3. Cấu trúc dự án

```text
smart-clinic/
├── BE/
├── FE/
├── bruno/
├── docs/
├── README.md
└── RULE.md
```

Không tạo nhiều website cho từng vai trò.

Tất cả vai trò dùng chung một React App, chỉ khác:

* Menu.
* Route.
* Permission.
* Dữ liệu.
* Nút thao tác.

---

## 4. Kiến trúc Frontend

Luồng bắt buộc:

```text
Page
→ Component
→ Hook
→ Module API
→ Axios Client
→ Backend
```

Không gọi Axios trực tiếp trong component.

Cấu trúc:

```text
FE/src/
├── app/
├── components/
├── layouts/
│   ├── PublicLayout/
│   ├── AuthLayout/
│   └── DashboardLayout/
├── modules/
├── routes/
├── services/
│   ├── axios-client.ts
│   └── socket-client.ts
├── stores/
├── config/
├── hooks/
├── types/
└── utils/
```

Mỗi module Frontend:

```text
modules/lich-hen/
├── api/
│   └── appointment.api.ts
├── components/
├── hooks/
├── pages/
├── types/
├── schemas/
└── index.ts
```

Quy tắc:

* Mỗi module có file API riêng.
* `axios-client.ts` chỉ cấu hình base URL, token và interceptor.
* Endpoint nghiệp vụ phải nằm trong module.
* Zustand chỉ dùng cho global state.
* Header, Footer và Sidebar đặt trong `layouts/`.
* Không viết lại layout trong từng page.
* Các page có cùng bộ khung phải dùng chung layout thông qua route `children` và `<Outlet />`.
* Không tạo `LayoutDangKy` hoặc `LayoutQuenMatKhau` riêng nếu chúng có cùng giao diện bao ngoài với trang đăng nhập; dùng chung `AuthLayout`.
* Chart dùng React Chart.js.
* UI dùng Bootstrap.
* Khi chức năng đã kết nối Backend, mọi thông báo phản hồi thao tác trên giao diện phải dùng **Toast** và ưu tiên hiển thị `message` do API trả về.
* Không dùng `window.alert()`, `window.confirm()` hoặc Bootstrap Alert để thông báo thành công, thất bại hay lỗi.
* Trong giai đoạn chỉ dựng giao diện, chưa kết nối API thì không tạo Toast giả hoặc hard-code message thành công.
* Thao tác xóa hoặc thao tác nguy hiểm phải xác nhận bằng Modal; khi đã kết nối Backend, kết quả sau thao tác phải hiển thị bằng Toast.
* Mọi màn hình có chức năng CRUD phải dùng Bootstrap Modal cho Thêm, Xem chi tiết, Sửa và xác nhận Xóa.
* Route và menu phải kiểm tra permission.

Ví dụ nhóm route xác thực dùng chung layout:

```tsx
{
  element: <AuthLayout />,
  children: [
    { path: '/dang-nhap', element: <TrangDangNhap /> },
    { path: '/dang-ky', element: <TrangDangKy /> },
    { path: '/quen-mat-khau', element: <TrangQuenMatKhau /> },
  ],
}
```

Ví dụ:

```ts
// modules/lich-hen/api/appointment.api.ts

import { axiosClient } from '@/services/axios-client';

export const appointmentApi = {
  getAll: () => axiosClient.get('/appointments'),

  getById: (id: string) =>
    axiosClient.get(`/appointments/${id}`),

  create: (payload: CreateAppointmentPayload) =>
    axiosClient.post('/appointments', payload),

  update: (
    id: string,
    payload: UpdateAppointmentPayload,
  ) => axiosClient.patch(`/appointments/${id}`, payload),
};
```

### Chuyển từ dữ liệu giao diện mẫu sang API thật

* Dữ liệu bản ghi mẫu trong Frontend chỉ được dùng trong giai đoạn dựng và kiểm tra giao diện.
* Việc thay dữ liệu mẫu bằng API phải thực hiện theo từng chức năng hoặc từng module, không xóa hàng loạt dữ liệu mẫu của các module chưa được kết nối Backend.
* Chỉ xóa dữ liệu mẫu của một chức năng sau khi API tương ứng đã hoạt động và Frontend đã đọc dữ liệu thành công.
* Khi một chức năng đã kết nối Backend, phải xóa các danh sách bản ghi mẫu tương ứng khỏi Frontend, ví dụ:
  * `SAMPLE_USERS`
  * `INITIAL_PATIENTS`
  * `INITIAL_DOCTORS`
  * `INITIAL_MEDICINES`
* Không xóa các constant phục vụ hiển thị và hành vi giao diện, ví dụ:
  * Danh sách trạng thái.
  * Danh sách giới tính.
  * Nhãn, màu sắc và biểu tượng.
  * Cấu hình bộ lọc.
  * Giá trị mặc định của form.
* Dữ liệu nghiệp vụ mẫu phải được tạo bằng Backend Seeder và lưu trong PostgreSQL; Frontend không được import, đọc trực tiếp hoặc sao chép dữ liệu từ file Seeder.
* Frontend phải lấy dữ liệu nghiệp vụ theo luồng:

```text
Page
→ Hook
→ Module API
→ Axios Client
→ Backend
→ PostgreSQL
```

* Page và component không gọi Axios trực tiếp.
* Không phụ thuộc vào ID cố định của dữ liệu Seeder trong Frontend hoặc business logic.
* Seeder chỉ dùng cho môi trường development và test; không tự động chạy Seeder trên production.
* Seeder không được chứa mật khẩu thật, API key, token hoặc dữ liệu cá nhân nhạy cảm.
* Sau khi thay dữ liệu mẫu bằng API, page bắt buộc có:
  * Loading State.
  * Error State.
  * Empty State.
* Sau mutation thành công, phải đồng bộ lại dữ liệu bằng cập nhật cache/state có kiểm soát hoặc gọi lại API; không chỉ thay đổi danh sách tạm trong page.
* Message thành công hoặc thất bại ưu tiên lấy từ response của Backend và hiển thị bằng Toast. Chỉ dùng message dự phòng ở Frontend khi Backend không trả về message phù hợp.

---

## 5. Kiến trúc Backend

Luồng bắt buộc:

```text
Controller
→ Service
→ Repository
→ Prisma
→ PostgreSQL
```

Cấu trúc:

```text
BE/src/
├── common/
├── database/
├── integrations/
└── modules/
```

Chỉ tạo `integrations/` khi bắt đầu tích hợp dịch vụ ngoài. Không tạo trước
thư mục rỗng chưa có chức năng sử dụng.

Mỗi module Backend:

```text
modules/lich-hen/
├── dto/
├── repositories/
│   ├── appointment.repository.interface.ts
│   └── prisma-appointment.repository.ts
├── appointment.controller.ts
├── appointment.service.ts
└── appointment.module.ts
```

Quy tắc:

### Controller

* Nhận request.
* Validate DTO.
* Gọi Service.
* Trả response.
* Khai báo Swagger và Permission.

Không gọi Prisma trong Controller.

### Service

* Xử lý business logic.
* Kiểm tra trạng thái nghiệp vụ.
* Gọi Repository.
* Gọi AI, Socket.IO hoặc SePay khi cần.

### Repository

* Chỉ xử lý Prisma và database.
* Không chứa HTTP hoặc logic giao diện.

Mọi API nhận body phải có DTO và `class-validator`.

---

## 6. Quy ước API

Base URL:

```text
/api/v1
```

Ví dụ:

```text
GET    /api/v1/appointments
GET    /api/v1/appointments/:id
POST   /api/v1/appointments
PATCH  /api/v1/appointments/:id

POST   /api/v1/appointments/:id/check-in
POST   /api/v1/queues/:id/call
POST   /api/v1/queues/:id/skip
POST   /api/v1/queues/:id/recall
```

Response chung:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {},
  "meta": {}
}
```

---

## 7. Coding Rules

### Quy ước ngôn ngữ và đặt tên

* Thành phần kiến trúc và kỹ thuật sử dụng tiếng Anh.
* Thư mục module nghiệp vụ trong cả Frontend và Backend dùng tiếng Việt không
  dấu, viết `kebab-case`, ví dụ:
  * `chuyen-khoa`
  * `bac-si`
  * `lich-hen`
  * `nguoi-dung`
  * `benh-nhan`
  * `thuoc`
  * `vai-tro`
* File kỹ thuật bên trong module vẫn dùng tiếng Anh, ví dụ:
  * `specialties.controller.ts`
  * `specialties.service.ts`
  * `create-specialty.dto.ts`
  * `prisma-specialty.repository.ts`
* Layout và các thành phần khung dùng tên tiếng Anh:
  * `PublicLayout`
  * `AuthLayout`
  * `DashboardLayout`
  * `Header`
  * `Footer`
  * `Sidebar`
  * `DashboardHeader`
* Component page nghiệp vụ và file page dùng tiếng Việt không dấu, viết `PascalCase` và ưu tiên bắt đầu bằng `Trang`:
  * `TrangChu.tsx` → `TrangChu`
  * `TrangDangNhap.tsx` → `TrangDangNhap`
  * `TrangDangKy.tsx` → `TrangDangKy`
  * `TrangQuenMatKhau.tsx` → `TrangQuenMatKhau`
  * `TrangNguoiDung.tsx` → `TrangNguoiDung`
  * `TrangBacSi.tsx` → `TrangBacSi`
* Tên page tiếng Việt chỉ áp dụng cho tầng giao diện nghiệp vụ. Hook, API, service, type, interface, biến, hàm và các thành phần kỹ thuật khác vẫn dùng tiếng Anh.
* Module Frontend được tổ chức theo nghiệp vụ. Khi page hoặc component chỉ dành cho một tác nhân, đặt trong thư mục con theo tác nhân bên trong `pages/` hoặc `components/`.
* Thư mục tác nhân dùng tiếng Việt không dấu, viết `kebab-case`; riêng `admin` giữ nguyên tiếng Anh:
  * `admin`
  * `benh-nhan`
  * `bac-si`
  * `le-tan`
  * `duoc-si`
  * `thu-ngan`
* Không dùng dấu tiếng Việt trong tên thư mục hoặc đường dẫn import. Tên hiển thị trên giao diện vẫn phải viết đầy đủ dấu: `Bệnh nhân`, `Bác sĩ`, `Lễ tân`, `Dược sĩ`, `Thu ngân`.
* Ví dụ tổ chức page theo nghiệp vụ và tác nhân:

```text
modules/lich-hen/
├── components/
│   ├── benh-nhan/
│   ├── bac-si/
│   ├── le-tan/
│   └── admin/
└── pages/
    ├── benh-nhan/
    │   └── TrangDatLich.tsx
    ├── bac-si/
    │   └── TrangLichKham.tsx
    ├── le-tan/
    │   └── TrangTiepNhanLichHen.tsx
    └── admin/
        └── TrangQuanLyLichHen.tsx
```

* URL giao diện được phép dùng tiếng Việt không dấu và `kebab-case`, ví dụ:
  * `/dang-nhap`
  * `/quen-mat-khau`
  * `/admin/nguoi-dung`
  * `/admin/bac-si`
* Không dịch URL đang tồn tại sang tiếng Anh nếu không có yêu cầu thay đổi route.
* Giao diện hiển thị tiếng Việt.
* Biến và hàm: `camelCase`.
* Class, Type, Interface: `PascalCase`.
* Constant: `UPPER_SNAKE_CASE`.
* File kỹ thuật thông thường: `kebab-case`.
* File React Component: `PascalCase.tsx`.
* Không dùng `any` nếu có thể xác định type.
* Không hard-code API URL, token hoặc API key.
* Không commit `.env`.
* Không tạo component hoặc service trùng chức năng.
* Không import sâu giữa các module.
* Ưu tiên alias:

```ts
import { axiosClient } from '@/services/axios-client';
```

Mọi page gọi API phải có:

```text
Loading State
Error State
Empty State
```

### Quản lý avatar, hình ảnh và tệp tải lên

* Avatar, logo và hình ảnh giao diện do người dùng tải lên được phép lưu trên Cloudinary.
* Không lưu file ảnh dạng Base64 hoặc binary trực tiếp trong PostgreSQL nếu không có yêu cầu nghiệp vụ đặc biệt.
* Database chỉ lưu thông tin cần thiết của tài nguyên, ví dụ:

```text
imageUrl
imagePublicId
imageResourceType
imageFormat
```

* Phải lưu `publicId` cùng URL để có thể thay thế, biến đổi hoặc xóa tài nguyên trên Cloudinary.
* Không đưa `CLOUDINARY_API_SECRET` hoặc secret của bất kỳ dịch vụ lưu trữ nào vào Frontend.
* Secret Cloudinary chỉ được đặt trong biến môi trường của Backend.
* Frontend upload file thông qua Backend, hoặc dùng signed upload với chữ ký do Backend tạo.
* Không sử dụng unsigned upload preset công khai cho chức năng quản trị nếu chưa có biện pháp giới hạn và kiểm soát lạm dụng.
* Backend phải kiểm tra trước khi upload:
  * MIME type.
  * Định dạng file.
  * Dung lượng tối đa.
  * Quyền của người upload.
  * Loại tài nguyên được phép theo từng chức năng.
* Khi người dùng thay avatar, phải xử lý tài nguyên cũ để tránh file rác trên Cloudinary.
* Khi xóa bản ghi có hình ảnh, phải xác định rõ hình ảnh cần giữ hay xóa; không tự động xóa khi chưa kiểm tra tài nguyên có đang được dùng chung hay không.
* Phải có ảnh mặc định hoặc fallback khi URL ảnh bị lỗi.
* Nên tổ chức folder Cloudinary theo môi trường và nghiệp vụ:

```text
smart-clinic/
├── development/
│   ├── avatars/
│   ├── doctors/
│   └── specialties/
└── production/
    ├── avatars/
    ├── doctors/
    └── specialties/
```

* Avatar và hình ảnh quảng bá có thể dùng tài nguyên công khai.
* Ảnh bệnh án, kết quả xét nghiệm, chẩn đoán hình ảnh và giấy tờ bệnh nhân là dữ liệu nhạy cảm:
  * Không được dùng URL public không bảo vệ.
  * Phải sử dụng chế độ private/authenticated hoặc giải pháp lưu trữ riêng có kiểm soát truy cập.
  * Backend phải kiểm tra permission trước khi cấp quyền xem hoặc tải xuống.
  * Không ghi URL chứa thông tin nhạy cảm vào log.
* Tích hợp Cloudinary đặt tại Backend:

```text
BE/src/integrations/cloudinary/
├── cloudinary.module.ts
├── cloudinary.service.ts
└── cloudinary.config.ts
```

Luồng upload mặc định:

```text
React
→ Gửi multipart/form-data hoặc yêu cầu signed upload
→ NestJS Backend
→ Kiểm tra file và permission
→ Cloudinary
→ Lưu secureUrl + publicId vào PostgreSQL
```

---

## 8. Git Commit

Dùng Conventional Commits:

```text
feat
fix
docs
style
refactor
test
chore
```

Ví dụ:

```bash
git commit -m "feat(auth): add JWT login"
git commit -m "feat(queue): add realtime queue"
git commit -m "fix(appointment): prevent duplicate booking"
git commit -m "refactor(patient): add repository layer"
```

---

## 9. Quy trình AI phải thực hiện

Trước khi code, AI phải:

```text
1. Đọc RULE.md.
2. Kiểm tra cấu trúc FE và BE.
3. Đọc module liên quan.
4. Tái sử dụng code hiện có.
5. Liệt kê file tạo mới và file chỉnh sửa.
6. Sau đó mới triển khai.
```

AI không được:

* Tự ý đổi kiến trúc.
* Tự ý đổi Prisma field.
* Tự ý đổi route API.
* Gọi Axios trực tiếp trong component.
* Gọi Prisma trực tiếp trong Controller.
* Đặt business logic trong Controller.
* Chỉnh sửa module không liên quan.

Sau khi hoàn thành phải chạy:

```text
BE:
npm run lint
npm run build

FE:
npm run lint
npm run build
```

---

## 10. Quy trình tạo module mới

```text
1. Prisma model và migration.
2. Backend DTO.
3. Backend Repository.
4. Backend Service.
5. Backend Controller.
6. Test API bằng Bruno hoặc Swagger.
7. Frontend types.
8. Frontend module API.
9. Frontend hooks.
10. Frontend components và pages.
11. Route, menu và permission.
12. Lint và build.
```

Kiến trúc mặc định:

```text
Frontend:
Page → Hook → Module API → Axios Client

Backend:
Controller → Service → Repository → Prisma
```


## 11.1 Quy trình triển khai theo Phase

Khi task được chia thành nhiều Phase, AI phải làm từng Phase riêng biệt.

KHÔNG được tự động chuyển sang Phase tiếp theo.

Mỗi Phase bắt buộc theo thứ tự:

1. GIẢI THÍCH TRƯỚC KHI CODE
   - Mục tiêu Phase.
   - Luồng dữ liệu.
   - File dự kiến tạo.
   - File dự kiến sửa.
   - API liên quan.
   - Database/bảng liên quan.
   - Module cũ có thể bị ảnh hưởng.
   - Kết quả người dùng sẽ thấy trên giao diện.

2. CODE
   - Chỉ code đúng phạm vi Phase hiện tại.
   - Không làm trước chức năng của Phase sau.
   - Không refactor module ngoài phạm vi nếu không cần.

3. COMMENT CODE
   Chỉ comment các đoạn logic quan trọng bằng tiếng Việt:
   - Business logic.
   - Authentication/Authorization.
   - Database transaction.
   - AI/Gemini.
   - Tool calling.
   - Socket.IO.
   - Thanh toán.
   - Cảnh báo.
   - Đặt lịch.

   Không comment từng dòng đơn giản hoặc comment vô nghĩa.

4. TEST
   Sau khi code phải:
   - Build BE.
   - Build FE.
   - Test API liên quan.
   - Kiểm tra dữ liệu database nếu có.
   - Kiểm tra giao diện nếu có.
   - Kiểm tra chức năng cũ liên quan không bị regression.

   Không được đánh dấu PASS chỉ vì build thành công.

5. BÁO CÁO
   Sau mỗi Phase phải báo:

   ### Đã làm
   - ...

   ### File tạo mới
   - ...

   ### File đã sửa
   - ...

   ### Luồng hiện tại
   User
   → FE
   → API
   → Service
   → Repository
   → Database / Integration
   → Response

   ### Test
   - PASS:
   - FAIL:

   ### Database
   - Bảng sử dụng:
   - Có thay Prisma hay không:

   ### Hướng dẫn test thủ công
   - Bước 1:
   - Bước 2:
   - ...

   ### Chưa làm
   - ...

   ### Phase tiếp theo
   - Mô tả ngắn.

6. DỪNG
   Sau khi báo cáo Phase hiện tại, AI phải dừng và chờ người dùng yêu cầu Phase tiếp theo.

Quy tắc cuối:

GIẢI THÍCH
→ CODE
→ TEST
→ BÁO CÁO
→ DỪNG

Không tự động:
PHASE 1 → PHASE 2 → PHASE 3
nếu người dùng chưa yêu cầu.

## 11.2 Khi cần sửa ngoài phạm vi

Nếu trong lúc làm Phase hiện tại phát hiện cần sửa file/module ngoài phạm vi:

- Không tự ý sửa ngay.
- Giải thích lý do.
- Nêu file cần sửa.
- Nêu ảnh hưởng.
- Chờ người dùng xác nhận nếu thay đổi có thể ảnh hưởng nghiệp vụ cũ.

Ngoại lệ:
Chỉ được tự sửa lỗi nhỏ bắt buộc để build/test Phase hiện tại nếu không thay đổi nghiệp vụ.


## COMMENT CODE NGHIỆP VỤ

Khi tạo hoặc chỉnh sửa code nghiệp vụ quan trọng, phải thêm `// comment` tiếng Việt ngắn gọn để người đọc hiểu chức năng.

### Bắt buộc comment tại:

* Controller / API endpoint mới
* DTO nghiệp vụ mới
* Service nghiệp vụ quan trọng
* Repository method quan trọng
* Guard / phân quyền
* Transaction
* Rule kiểm tra nghiệp vụ
* Logic cảnh báo
* Gemini / AI
* Socket.IO / realtime
* Thanh toán / webhook
* Logic lưu JSONB chuyên khoa

Ví dụ:

```ts
// API lưu dữ liệu khám chuyên khoa của lượt khám
```

```ts
// DTO kiểm tra dữ liệu khám chuyên khoa Mắt trước khi lưu JSONB
```

```ts
// Kiểm tra bác sĩ có quyền cập nhật lượt khám trước khi lưu hồ sơ
```

```ts
// Lấy thuốc thay thế đã được duyệt để bác sĩ tham khảo
```

```ts
// Gemini chỉ diễn giải dữ liệu đã được Backend kiểm tra, không tự kê thuốc
```

### Không comment dư thừa

KHÔNG giải thích từng dòng code hoặc cú pháp đơn giản.

Không viết:

```ts
// Gán biến
// Kiểm tra if
// Return dữ liệu
// Gọi hàm
```

Comment phải giải thích **mục đích chức năng/nghiệp vụ**, không phải mô tả cú pháp.

### Ngôn ngữ

Comment nghiệp vụ sử dụng **tiếng Việt**, ngắn gọn, dễ đọc.

Tên framework và thuật ngữ kỹ thuật như React, NestJS, Prisma, DTO, API, JSONB, JWT, Socket.IO, Gemini được giữ nguyên.

---

## 14. Zero Regression — Chống sinh bug mới khi code chức năng mới

> Chức năng đang chạy tốt = KHÔNG ĐƯỢC ĐỤNG VÀO.
> Code mới = TẠO file mới + THÊM dòng. KHÔNG SỬA hoặc XÓA code đang chạy tốt.

### 14.1 Chỉ sửa file liên quan trực tiếp

Được làm:

* Tạo file MỚI cho chức năng mới.
* Sửa file mà chức năng mới BẮT BUỘC phải sửa (route, module import, schema).
* Thêm code MỚI vào file cũ (thêm method, thêm route) mà KHÔNG đổi code cũ.

Không được làm:

* Rename biến, hàm, file đang chạy tốt.
* Refactor code cũ "cho đẹp hơn" khi không ai yêu cầu.
* Đổi kiểu import (alias ↔ relative).
* Đổi format code cũ (thêm/bớt dấu cách, đổi quotes).
* Di chuyển file sang thư mục khác.
* Gộp/tách file đang hoạt động.
* Sửa comment/docstring file không liên quan.

### 14.2 Liệt kê file trước khi sửa

Trước khi bắt đầu code, AI phải liệt kê:

```text
📋 DANH SÁCH FILE SẼ THAY ĐỔI:

[NEW]    BE/src/modules/xxx/xxx.service.ts
[NEW]    FE/src/modules/xxx/pages/TrangXxx.tsx
[MODIFY] BE/src/modules/xxx/xxx.module.ts       ← Thêm import
[MODIFY] FE/src/routes/AppRouter.tsx             ← Thêm 1 route
[MODIFY] BE/prisma/schema.prisma                 ← Thêm 1 model

⛔ KHÔNG SỬA: Tất cả file không có trong danh sách trên
```

Nếu AI không liệt kê được thì CHƯA ĐỦ HIỂU, phải đọc code trước.

### 14.3 Thêm, không sửa

Khi cần thêm tính năng vào file đã tồn tại:

* Thêm method mới vào cuối class/object.
* Thêm route mới vào cuối file route.
* Thêm import ở đầu file.
* Thêm model mới vào cuối schema.prisma.

Không sửa tên method cũ, không đổi thứ tự, không thêm parameter vào hàm cũ đang được gọi ở nhiều nơi, không đổi return type của API cũ.

### 14.4 Không sửa API response cũ

API đang trả `{ message, data: { id, fullName } }`:

* Được thêm field mới: `{ id, fullName, newField }`.
* Không đổi tên field cũ.
* Không đổi cấu trúc object.
* Không đổi status code.
* Không đổi error message format.

### 14.5 Không sửa schema cột cũ

* Được thêm model MỚI.
* Được thêm cột MỚI vào model cũ (phải có default hoặc optional).
* Được thêm relation MỚI.
* Không rename cột cũ, không đổi type cột cũ, không xóa cột cũ, không đổi tên model cũ, không đổi enum value cũ.

### 14.6 Build kiểm tra sau khi code

Sau khi code xong chức năng mới:

```bash
cd BE && npm run build
cd FE && npm run build
cd BE && npx prisma generate   # nếu sửa schema
```

Nếu build fail thì sửa chức năng mới, KHÔNG sửa code cũ để adapt.

### 14.7 File dùng chung chỉ thêm dòng

Khi sửa file dùng chung (AppRouter.tsx, menu.config.ts, xxx.module.ts):

* Chỉ thêm dòng mới (import, route, menu item).
* Không xóa dòng cũ.
* Không sắp xếp lại thứ tự.
* Không format lại file.

### 14.8 Chức năng mới phải độc lập

Chức năng mới nên có module riêng (NestJS Module), service riêng, controller riêng, repository riêng, DTO riêng, page/component FE riêng. Import service cũ qua DI, không copy code cũ.

Không nhét code mới vào service cũ đang phức tạp. Không thêm hàng trăm dòng vào file đã rất dài. Không sửa logic cũ để "tái sử dụng" cho chức năng mới.

### 14.9 Báo cáo thay đổi

Sau mỗi chức năng, AI phải báo cáo:

```text
📊 BÁO CÁO THAY ĐỔI:
Files tạo mới: X
Files sửa: Y (chỉ thêm import/route)
Files xóa: 0
Build BE: ✅ PASS
Build FE: ✅ PASS
Chức năng cũ bị ảnh hưởng: KHÔNG CÓ
```

### 14.10 Phát hiện bug cũ → ghi nhận, không sửa âm thầm

Nếu phát hiện bug ở code cũ trong lúc code chức năng mới:

* Ghi nhận bug vào báo cáo.
* Không sửa ngay.
* Hỏi user trước khi sửa.
* Nếu user đồng ý thì tạo task RIÊNG để sửa bug cũ, không gộp chung.
