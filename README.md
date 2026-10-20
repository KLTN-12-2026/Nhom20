# 🏥 Hệ thống quản lý và điều phối khám bệnh đa chuyên khoa tích hợp trí tuệ nhân tạo

**Tên Tiếng Anh:** AI-Integrated Multi-Specialty Clinic Management and Coordination System
(Tên dự án thực tế: Smart Clinic Management System)

Hệ thống hỗ trợ điều phối khám bệnh theo thời gian thực, số hóa quy trình y tế và tích hợp AI Gemini để phân tích ngữ cảnh, gợi ý thuốc.

---

## 📋 Mục lục
- [1. Giới thiệu](#1-giới-thiệu)
- [2. Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
- [3. Cấu trúc dự án](#3-cấu-trúc-dự-án)
- [4. Bắt đầu nhanh](#4-bắt-đầu-nhanh)
- [5. Cấu hình ENV](#5-cấu-hình-env)
- [6. Chức năng chính](#6-chức-năng-chính)
- [7. Kiến trúc AI (Gemini)](#7-kiến-trúc-ai-gemini)
- [8. Quy tắc phát triển](#8-quy-tắc-phát-triển)

---

## 🌟 1. Giới thiệu

**Smart Clinic** được thiết kế để số hóa và tối ưu hóa quy trình làm việc tại các phòng khám đa khoa. Hệ thống đảm bảo luồng thông tin thông suốt từ lúc bệnh nhân bước vào đến khi nhận thuốc ra về.

**Luồng nghiệp vụ chính:**
> **Lễ tân** (Tiếp nhận/Xếp hàng) ➔ **Bác sĩ** (Khám/Kê đơn + Cảnh báo an toàn + AI gợi ý) ➔ **Dược sĩ** (Cấp thuốc) ➔ **Thu ngân** (Thanh toán)

---

## 🛠 2. Công nghệ sử dụng

### 🎨 Frontend
- **React 18** / **TypeScript** / **Vite**
- **Bootstrap 5** / **Lucide React** (UI & Icons)
- **React Router** / **Zustand** (State & Routing)
- **Axios** / **Socket.IO Client** / **React Chart.js 2** & **Chart.js**

### ⚙️ Backend
- **NestJS** / **TypeScript**
- **Prisma ORM** / **PostgreSQL**
- **Class Validator** / **Class Transformer**
- **JWT** / **RBAC** / **Socket.IO**

### 🔌 Tích hợp (3rd-party)
- **Neon PostgreSQL** (Database Hosting)
- **Google Gemini API** (AI Assistant)
- **Cloudinary** (Lưu trữ hình ảnh)
- **SePay** / **VietQR** / **Webhook** (Thanh toán)

---

## 📂 3. Cấu trúc dự án

```text
Smart-Clinic/
├── FE/                 # Frontend React + Vite
├── BE/                 # Backend NestJS + Prisma
└── README.md           # Tài liệu dự án
```

**Kiến trúc Backend:**
> `Controller` ➔ `Service` ➔ `Repository` ➔ `Prisma` ➔ `PostgreSQL`

---

## 🚀 4. Bắt đầu nhanh

### Yêu cầu môi trường
- Node.js 20+
- npm 10+
- Git
- PostgreSQL/Neon đã được cấu hình

Kiểm tra phiên bản:
```bash
node -v
npm -v
git --version
```

### Cài đặt Package

**Clone project:**
```bash
git clone <URL_GITHUB>
cd <TEN_FOLDER_DU_AN>
```

**Frontend:**
```bash
cd FE
npm install
```

**Backend & Database:**
```bash
cd ../BE
npm install
npx prisma generate
npx prisma validate
npx prisma migrate status
```
*(Lưu ý: Không dùng `prisma migrate reset` hoặc `db push` trên Neon nếu không có chủ đích rõ ràng. Dùng `npx prisma migrate deploy` để áp dụng migration).*

### Chạy dự án

**Chạy riêng lẻ (Khuyến nghị):**
- Terminal 1 (Backend): `cd BE && npm run dev`
- Terminal 2 (Frontend): `cd FE && npm run dev` (Thường chạy tại http://localhost:5173)

---

## ⚙️ 5. Cấu hình ENV

Tạo hoặc cập nhật các file `.env`:

**Backend (`BE/.env`):**
```env
DATABASE_URL=
JWT_SECRET=
GEMINI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SEPAY_API_KEY=
```

**Frontend (`FE/.env`):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## ✨ 6. Chức năng chính

### 👩‍💼 Lễ tân / Thu ngân
- Tiếp nhận bệnh nhân mới/cũ.
- Quản lý lịch hẹn & Phân luồng xếp hàng chờ realtime.
- Thanh toán, quét QR SePay, in hóa đơn.

### 👨‍⚕️ Bác sĩ
- Xem hàng chờ khám & Hồ sơ bệnh nhân.
- Ghi nhận sinh hiệu, Chẩn đoán bệnh (ICD-10).
- Kê đơn thuốc (Cảnh báo an toàn, dị ứng, tương tác thuốc).
- **Gemini hỗ trợ:** Gợi ý thuốc tham khảo.
- Hẹn tái khám & Hoàn tất khám.

### 💊 Dược sĩ
- Nhận đơn thuốc điện tử.
- Cấp phát thuốc.
- Quản lý kho thuốc & lô thuốc (Nguyên tắc FEFO).

### 🛡️ Admin
- Quản lý Nhân sự / Người dùng / Phân quyền (RBAC).
- Quản lý Chuyên khoa / Phòng khám / Danh mục thuốc.
- Báo cáo, thống kê, cấu hình hệ thống.

### 👤 Bệnh nhân
- Đăng nhập & Hồ sơ cá nhân.
- Đặt lịch khám & Xem lịch sử khám.
- Xem đơn thuốc / hóa đơn & Đánh giá bác sĩ.
- Chatbox AI tư vấn cơ bản.

---

## 🧠 7. Kiến trúc AI (Gemini)

AI Gemini không truy cập trực tiếp Database và không có quyền ra quyết định cuối cùng.

**Luồng xử lý gợi ý thuốc:**
1. Bác sĩ kê thuốc.
2. Backend phát hiện cảnh báo & Rule-based lọc thuốc.
3. Gemini phân tích ngữ cảnh và xếp hạng gợi ý.
4. Bác sĩ quyết định cuối cùng.

> **Lưu ý:** Gemini không tự kê đơn, tự thay thuốc hoặc tự tạo liều dùng.

---

## 🛡️ 8. Quy tắc phát triển

Trước khi sửa đổi chức năng, bạn cần:
1. Đọc kỹ file `RULE.md`.
2. Đọc module liên quan và ưu tiên tái sử dụng code.
3. Không tự ý đổi Prisma/API/Kiến trúc.
4. Sau khi sửa phải build và **test runtime API thật**.

**Workflow:**
> `READ` ➔ `EXPLAIN` ➔ `CODE` ➔ `TEST` ➔ `REPORT` ➔ `STOP`

---

## 📝 9. Lệnh thường dùng & Lưu ý khác

**Build dự án:**
```bash
# Frontend
cd FE && npm run build

# Backend
cd BE && npm run build
```

**Lưu ý quan trọng:**
- **Không** commit file `.env`.
- **Không** reset Neon tùy ý.
- **Không** dùng dữ liệu mock ở Frontend khi API thật đã hoạt động.
- File Seeder chỉ dùng cho môi trường development/test.
- **Agent Hallmark**: Các câu lệnh thiết kế / kiểm tra giao diện bằng Agent Hallmark (nếu có) được thực thi bằng `npx` / runner của agent độc lập với quy trình phát triển dự án.

