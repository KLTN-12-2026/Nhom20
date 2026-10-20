# 📋 ĐÁNH GIÁ v21 — Smart Clinic Pre-deployment Audit

> **Ngày audit:** 2026-08-25
> **Phiên bản:** v21
> **Trạng thái:** AUDIT ONLY — CHƯA SỬA CODE

---

## A. CURRENT ARCHITECTURE

```
┌───────────────────────────────────────────────────────────────┐
│  Browser (localhost hoặc Cloudflare domain)                   │
│  └── React SPA (Vite)                                        │
│       ├── axiosClient → baseURL: "/api/v1"                   │
│       │   (Tất cả request đều dùng relative path)            │
│       └── socket.io-client → SOCKET_URL (derived from env)   │
│                                                               │
│  ▼ Vite Dev Server Proxy (vite.config.ts)                    │
│  /api/*     → http://localhost:3000 (changeOrigin)           │
│  /realtime  → ws://localhost:3000   (ws: true)               │
│                                                               │
│  ▼ NestJS Backend (port 3000)                                │
│  ├── Global prefix: "api/v1"                                 │
│  ├── CORS: FRONTEND_URL (comma-separated origins)            │
│  ├── Swagger: /api/docs                                      │
│  ├── WebSocket Gateway: /realtime (cors: origin: true)       │
│  ├── JWT Auth (Bearer token, localStorage)                   │
│  └── SePay Webhook: POST /api/v1/thanh-toan/sepay-webhook    │
│       (xác thực bằng Apikey header)                          │
│                                                               │
│  ▼ Prisma ORM → PostgreSQL (Neon cloud)                      │
└───────────────────────────────────────────────────────────────┘
```

### Cloudflare hiện tại

```
Named Tunnel "smartclinic" (Healthy)
├── https://smartclinic.io.vn     → http://localhost:5173  (Vite FE)
└── https://api.smartclinic.io.vn → http://localhost:3000  (NestJS BE)
```

### SePay hiện tại

```
SePay Dashboard
├── Webhook URL: CHƯA CẬP NHẬT (trước đó dùng trycloudflare.com)
├── API Token: được lưu trong BE/.env (SEPAY_API_TOKEN)
└── Flow: SePay → POST webhook → NestJS controller → Prisma → PostgreSQL
```

### Điểm quan trọng về kiến trúc proxy

Dự án hiện tại dùng **Vite Dev Server Proxy** (`vite.config.ts`) để chuyển tiếp tất cả request `/api/*` và `/realtime` từ FE sang BE. Điều này nghĩa là:

- FE **KHÔNG gọi trực tiếp** đến `http://localhost:3000`
- FE dùng `VITE_API_BASE_URL=/api/v1` (relative path)
- Vite proxy chuyển `/api/*` → `http://localhost:3000`

> [!IMPORTANT]
> Khi chạy qua Cloudflare Tunnel với **2 domain riêng** (FE ≠ BE), cơ chế proxy của Vite dev server **KHÔNG hoạt động** cho browser bên ngoài. Browser truy cập `https://smartclinic.io.vn/api/v1/...` → Cloudflare route request về `localhost:5173` → Vite proxy chuyển sang `localhost:3000`. Điều này **VẪN HOẠT ĐỘNG** vì proxy chạy ở server-side.
>
> **Tuy nhiên**, WebSocket (`/realtime`) qua Cloudflare tunnel sẽ bị vấn đề nếu Cloudflare không hỗ trợ WebSocket upgrade trên route FE. Cần xác nhận.

---

## B. PROBLEMS FOUND

### Problem 1: FRONTEND_URL chứa URL trycloudflare cũ

```
File:     BE/.env (line 3)
Code:     FRONTEND_URL=http://localhost:5173,https://chester-promising-lens-possession.trycloudflare.com
Vấn đề:  URL Quick Tunnel cũ đã không còn hoạt động. Thiếu domain chính thức smartclinic.io.vn.
Ảnh hưởng: CORS sẽ reject request từ https://smartclinic.io.vn
Cần sửa:  YES
```

### Problem 2: APP_URL chứa URL trycloudflare cũ

```
File:     BE/.env (line 25)
Code:     APP_URL="https://chester-promising-lens-possession.trycloudflare.com"
Vấn đề:  Email xác minh và đặt lại mật khẩu sẽ chứa link trycloudflare không hoạt động.
Ảnh hưởng: Bệnh nhân click link email → 404 (domain không tồn tại)
Cần sửa:  YES
```

### Problem 3: Vite allowedHosts chỉ có trycloudflare.com

```
File:     FE/vite.config.ts (line 16)
Code:     allowedHosts: ['.trycloudflare.com'],
Vấn đề:  Thiếu domain smartclinic.io.vn. Vite dev server sẽ reject request với Host header là smartclinic.io.vn.
Ảnh hưởng: Truy cập https://smartclinic.io.vn sẽ bị Vite chặn (Invalid Host header)
Cần sửa:  YES
```

### Problem 4: Fallback URL trong axios-client.ts và socket-client.ts

```
File:     FE/src/services/axios-client.ts (line 3)
Code:     const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

File:     FE/src/services/socket-client.ts (line 3-4)
Code:     const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

Vấn đề:  Fallback trỏ đến http://localhost:3000 — nếu env bị thiếu, FE sẽ gọi localhost.
          Tuy nhiên, FE/.env hiện đang đúng: VITE_API_BASE_URL=/api/v1
          Fallback chỉ là safety net, KHÔNG phải lỗi active.
Ảnh hưởng: Không ảnh hưởng runtime vì env đã set đúng. Chỉ ảnh hưởng nếu ai đó xóa .env.
Cần sửa:  NO (nice-to-have, nhưng nằm ngoài scope minimal changes)
```

### Problem 5: WebSocket Gateway CORS quá mở

```
File:     BE/src/modules/thoi-gian-thuc/realtime.gateway.ts (line 32)
Code:     cors: { origin: true, credentials: true },
Vấn đề:  origin: true chấp nhận mọi origin. Không phải lỗi bảo mật nghiêm trọng vì
          WebSocket vẫn yêu cầu JWT token, nhưng không theo best practice.
Ảnh hưởng: Không ảnh hưởng trực tiếp (JWT vẫn bảo vệ). Chỉ concern ở góc độ audit.
Cần sửa:  NO (nằm ngoài scope minimal changes, WebSocket đã bảo vệ bởi JWT)
```

### Problem 6: BE/.env chứa dữ liệu thừa

```
File:     BE/.env (lines 32-35)
Code:      Nguyễn Thị Lan | 0905111222 | nguyenthilan.patient@gmail.com | Lan@123456 |
           | Trần Văn Minh | 0905333444 | tranvanminh.patient@gmail.com | Minh@123456 |
           | Lê Thị Hương | 0905555666 | lethihuong.patient@gmail.com | Huong@123456 |
Vấn đề:  Dữ liệu test paste nhầm vào file .env (không có key=value, không gây lỗi parse nhưng bừa bộn).
Ảnh hưởng: Không ảnh hưởng runtime. Nhưng trông unprofessional khi review.
Cần sửa:  YES (cleanup)
```

### Problem 7: .env.example thiếu SEPAY_API_TOKEN

```
File:     BE/.env.example
Code:     (không có dòng SEPAY_API_TOKEN)
Vấn đề:  Thiếu key SEPAY_API_TOKEN trong file mẫu. Người mới clone project sẽ không biết cần config.
Ảnh hưởng: Không ảnh hưởng runtime hiện tại. Documentation concern.
Cần sửa:  YES (nice-to-have, bổ sung vào .env.example)
```

---

## C. DOMAIN CHANGES

| Thành phần | Hiện tại | Cần đổi thành |
|---|---|---|
| `BE/.env` → `FRONTEND_URL` | `http://localhost:5173,https://chester-...trycloudflare.com` | `http://localhost:5173,https://smartclinic.io.vn` |
| `BE/.env` → `APP_URL` | `https://chester-...trycloudflare.com` | `https://smartclinic.io.vn` |
| `FE/vite.config.ts` → `allowedHosts` | `['.trycloudflare.com']` | `['.trycloudflare.com', '.smartclinic.io.vn']` |
| SePay Dashboard → Webhook URL | *(cũ/chưa cập nhật)* | `https://api.smartclinic.io.vn/api/v1/thanh-toan/sepay-webhook` |

> [!NOTE]
> **FE/.env** (`VITE_API_BASE_URL=/api/v1`) **KHÔNG CẦN THAY ĐỔI**. Relative path `/api/v1` hoạt động đúng vì Vite proxy chuyển tiếp tất cả `/api/*` requests sang `http://localhost:3000`. Khi browser truy cập qua Cloudflare (`https://smartclinic.io.vn`), Cloudflare route về `localhost:5173`, Vite proxy vẫn hoạt động server-side.

---

## D. FILES CODEX NEEDS TO MODIFY

| # | File | Thay đổi |
|---|---|---|
| 1 | [.env](file:///d:/smart-clinic/BE/.env) | Cập nhật `FRONTEND_URL`, `APP_URL`, xóa dữ liệu thừa |
| 2 | [.env.example](file:///d:/smart-clinic/BE/.env.example) | Cập nhật `FRONTEND_URL`, `APP_URL`, thêm `SEPAY_API_TOKEN` |
| 3 | [vite.config.ts](file:///d:/smart-clinic/FE/vite.config.ts) | Thêm `.smartclinic.io.vn` vào `allowedHosts` |

> [!IMPORTANT]
> **Chỉ 3 file.** Không cần sửa code FE (axios-client.ts, socket-client.ts) vì chúng đã dùng relative path đúng. Không sửa code BE (main.ts, controller, service) vì chúng đã đọc ENV đúng cách.

---

## E. ENV CHANGES

### FE (.env)

```env
# KHÔNG CẦN THAY ĐỔI — Giữ nguyên (relative path hoạt động ở cả 2 chế độ)
VITE_API_BASE_URL=/api/v1
VITE_SEPAY_ACCOUNT=8447223292674
VITE_SEPAY_BANK=MBBank
VITE_SEPAY_HOLDER=PHAN THI MINH TRAM
VITE_SEPAY_STORE=Smart_Clinic
```

> [!NOTE]
> FE không cần chuyển chế độ. `VITE_API_BASE_URL=/api/v1` là relative path, Vite proxy sẽ chuyển tiếp sang `localhost:3000` ở cả local lẫn production (qua Cloudflare Tunnel).

### BE (.env) — Cấu trúc mới: DUAL-MODE (comment-toggle)

Mục tiêu: Giáo viên/bạn bè nhận source code, chỉ cần **comment 2 dòng + uncomment 2 dòng** là chạy local.

```env
# ╔══════════════════════════════════════════════════════════════╗
# ║  CHUYỂN CHẾ ĐỘ: Comment/Uncomment 2 dòng bên dưới          ║
# ║  PRODUCTION = smartclinic.io.vn (Cloudflare Tunnel)         ║
# ║  LOCAL      = localhost (chạy trên máy tính cá nhân)        ║
# ╚══════════════════════════════════════════════════════════════╝

# === CHẾ ĐỘ PRODUCTION (đang bật) ===
FRONTEND_URL=http://localhost:5173,https://smartclinic.io.vn
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL=http://localhost:5173
# APP_URL="http://localhost:5173"
```

> [!TIP]
> **Cách chuyển sang LOCAL:** Comment 2 dòng PRODUCTION bằng `#`, bỏ `#` ở 2 dòng LOCAL.
> **Cách chuyển về PRODUCTION:** Làm ngược lại.
>
> Tất cả key khác (`JWT_SECRET`, `DATABASE_URL`, v.v.) giữ nguyên không đổi.

### BE (.env.example) — Cập nhật mẫu (cùng cấu trúc dual-mode)

```env
# === CHẾ ĐỘ PRODUCTION (Cloudflare Tunnel) ===
FRONTEND_URL="http://localhost:5173,https://smartclinic.io.vn"
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL="http://localhost:5173"
# APP_URL="http://localhost:5173"

SEPAY_API_TOKEN="your-sepay-api-token"
```

> [!WARNING]
> **KHÔNG hiển thị hoặc thay thế** giá trị thật của `JWT_SECRET`, `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `SEPAY_API_TOKEN`, `SMTP_PASSWORD`, `GEMINI_API_KEY`. Chúng đã có trong `.env` và phải giữ nguyên.

---

## F. SEPAY

### Webhook cũ

```
Trước đó dùng: trycloudflare.com Quick Tunnel (domain thay đổi mỗi lần restart)
Hiện tại trong code: KHÔNG CÒN ngrok hay trycloudflare URL nào hard-coded trong source code.
```

### Webhook endpoint BE (đọc trực tiếp từ source code)

Xác định từ 2 file:

1. **Global prefix:** `api/v1` — [main.ts:18](file:///d:/smart-clinic/BE/src/main.ts#L18)
   ```ts
   app.setGlobalPrefix('api/v1');
   ```

2. **Controller path:** `thanh-toan` — [thanh-toan.controller.ts:22](file:///d:/smart-clinic/BE/src/modules/thanh-toan/thanh-toan.controller.ts#L22)
   ```ts
   @Controller('thanh-toan')
   ```

3. **Webhook route:** `sepay-webhook` — [thanh-toan.controller.ts:28](file:///d:/smart-clinic/BE/src/modules/thanh-toan/thanh-toan.controller.ts#L28)
   ```ts
   @Post('sepay-webhook')
   ```

### Webhook path chính xác

```
POST /api/v1/thanh-toan/sepay-webhook
```

### Webhook mới (cần cập nhật trên SePay Dashboard)

```
https://api.smartclinic.io.vn/api/v1/thanh-toan/sepay-webhook
```

### Xác thực webhook

- SePay gửi header: `Authorization: Apikey <SEPAY_API_TOKEN>`
- Controller kiểm tra: `authHeader === 'Apikey ${apiToken}'` hoặc `'Bearer ${apiToken}'`
- Token lưu tại: `BE/.env` → `SEPAY_API_TOKEN`

### Full SePay Flow (đã xác nhận từ code)

```
Bệnh nhân/Thu ngân
  ↓
FE: Tạo QR từ vietqr.app/img (với nội dung = mã hóa đơn, VD: "HD-xxx")
  ↓
Bệnh nhân quét QR và chuyển khoản MBBank
  ↓
Ngân hàng xác nhận giao dịch
  ↓
SePay nhận webhook từ ngân hàng
  ↓
SePay gửi POST → https://api.smartclinic.io.vn/api/v1/thanh-toan/sepay-webhook
  (Header: Authorization: Apikey <token>)
  (Body: SePayWebhookDto)
  ↓
NestJS ThanhToanController.handleWebhook()
  → Xác thực Apikey
  → Gọi ThanhToanService.handleSePayWebhook()
  ↓
Service:
  → Kiểm tra transferType === 'in'
  → Trích xuất mã hóa đơn từ content (regex: /HD[-\d]+/i)
  → Tìm hóa đơn trong DB (exact match hoặc normalized)
  → Tạo bản ghi ThanhToan (CHUYEN_KHOAN, THANH_CONG)
  → Cập nhật HoaDon → DA_THANH_TOAN
  ↓
RealtimeService → emit 'payment.success' đến room RECEPTIONIST
  ↓
FE Thu ngân: useRealtimeEvent('payment.success')
  → Reload danh sách hóa đơn
  → Hiển thị toast thành công
  → Bắn confetti 🎉
```

> [!NOTE]
> Logic thanh toán **HOÀN TOÀN ĐÚNG** và **KHÔNG CẦN SỬA**. Chỉ cần cập nhật webhook URL trên SePay Dashboard.

---

## G. CODEX IMPLEMENTATION PLAN

### Bước 1: Cập nhật `BE/.env` (dual-mode)

Thay thế dòng `FRONTEND_URL` và `APP_URL` hiện tại thành cấu trúc dual-mode:

```env
# ╔══════════════════════════════════════════════════════════════╗
# ║  CHUYỂN CHẾ ĐỘ: Comment/Uncomment 2 dòng bên dưới          ║
# ║  PRODUCTION = smartclinic.io.vn (Cloudflare Tunnel)         ║
# ║  LOCAL      = localhost (chạy trên máy tính cá nhân)        ║
# ╚══════════════════════════════════════════════════════════════╝

# === CHẾ ĐỘ PRODUCTION (đang bật) ===
FRONTEND_URL=http://localhost:5173,https://smartclinic.io.vn
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL=http://localhost:5173
# APP_URL="http://localhost:5173"
```

Và xóa dữ liệu test thừa ở cuối file (lines 32-35).

### Bước 2: Cập nhật `BE/.env.example` (dual-mode)

Thay thế `FRONTEND_URL` và `APP_URL` thành cấu trúc dual-mode tương tự, và thêm `SEPAY_API_TOKEN`:

```env
# === CHẾ ĐỘ PRODUCTION (Cloudflare Tunnel) ===
FRONTEND_URL="http://localhost:5173,https://smartclinic.io.vn"
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL="http://localhost:5173"
# APP_URL="http://localhost:5173"

SEPAY_API_TOKEN="your-sepay-api-token"
```

### Bước 3: Cập nhật `FE/vite.config.ts`

```diff
  server: {
    host: '0.0.0.0',
-   allowedHosts: ['.trycloudflare.com'],
+   allowedHosts: ['.trycloudflare.com', '.smartclinic.io.vn'],
```

### Bước 4: (THỦ CÔNG — Không phải Codex) Cập nhật SePay Dashboard

Đăng nhập SePay → Cài đặt Webhook → Cập nhật URL:

```
https://api.smartclinic.io.vn/api/v1/thanh-toan/sepay-webhook
```

### Bước 5: (THỦ CÔNG) Xác nhận Cloudflare Tunnel config

Đảm bảo tunnel config có:

```yaml
tunnel: smartclinic
credentials-file: <path>

ingress:
  - hostname: smartclinic.io.vn
    service: http://localhost:5173
  - hostname: api.smartclinic.io.vn
    service: http://localhost:3000
  - service: http_status:404
```

### Bước 6: Restart services

```bash
# Terminal 1 — Backend
cd BE
npm run dev

# Terminal 2 — Frontend
cd FE
npm run dev -- --host 0.0.0.0

# Cloudflare Tunnel
# Đã chạy sẵn dưới dạng Windows Service
```

---

## H. TEST PLAN

| # | Test | Cách kiểm tra | Expected |
|---|---|---|---|
| 1 | FE local | Mở `http://localhost:5173` | Hiện trang chủ Smart Clinic |
| 2 | BE local | Mở `http://localhost:3000/api/docs` | Hiện Swagger UI |
| 3 | FE production | Mở `https://smartclinic.io.vn` | Hiện trang chủ (HTTPS, không lỗi) |
| 4 | BE production | Mở `https://api.smartclinic.io.vn/api/docs` | Hiện Swagger UI (HTTPS) |
| 5 | FE → BE API | Đăng nhập trên `smartclinic.io.vn` | Login thành công, không CORS error |
| 6 | JWT Auth | Sau đăng nhập, chuyển trang | Không bị redirect về login |
| 7 | API chính | Vào Quản lý bệnh nhân, tải danh sách | Dữ liệu hiển thị đúng |
| 8 | WebSocket | Mở 2 tab (Thu ngân + Bác sĩ) | Thông báo realtime hoạt động |
| 9 | QR thanh toán | Tạo hóa đơn → chọn chuyển khoản | QR VietQR hiển thị đúng |
| 10 | SePay webhook | Chuyển khoản test → SePay gọi webhook | Hóa đơn tự chuyển "Đã thanh toán" + confetti |
| 11 | Laptop khác | Laptop review mở `smartclinic.io.vn` | Full chức năng, không lỗi |

---

## I. REVIEW DAY CHECKLIST

### Checklist cho bạn (chế độ PRODUCTION — Cloudflare Tunnel)

```
╔══════════════════════════════════════════════════════════╗
║                 🎯 NGÀY BẢO VỆ KHÓA LUẬN              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ☐ 1. Bật PC Server                                     ║
║                                                          ║
║  ☐ 2. Kiểm tra BE/.env đang ở CHẾ ĐỘ PRODUCTION        ║
║     FRONTEND_URL có chứa smartclinic.io.vn               ║
║     APP_URL = https://smartclinic.io.vn                  ║
║                                                          ║
║  ☐ 3. Kiểm tra Cloudflare Tunnel                        ║
║     PowerShell: sc.exe query cloudflared                 ║
║     → STATE = RUNNING                                    ║
║                                                          ║
║  ☐ 4. Mở Terminal 1 — Backend                           ║
║     cd d:\smart-clinic\BE                                ║
║     npm run dev                                          ║
║     → "Nest application successfully started"            ║
║                                                          ║
║  ☐ 5. Mở Terminal 2 — Frontend                          ║
║     cd d:\smart-clinic\FE                                ║
║     npm run dev -- --host 0.0.0.0                        ║
║     → "Local: http://localhost:5173/"                    ║
║                                                          ║
║  ☐ 6. Test nhanh trên PC Server                         ║
║     Mở browser → http://localhost:5173                   ║
║     → Đăng nhập → Trang chủ hiện OK                     ║
║                                                          ║
║  ☐ 7. Test từ Laptop Review                             ║
║     Mở browser → https://smartclinic.io.vn               ║
║     → Đăng nhập → Trang chủ hiện OK                     ║
║     → Kiểm tra ổ khóa HTTPS (Cloudflare cert)           ║
║                                                          ║
║  ☐ 8. Test SePay (nếu cần demo thanh toán)              ║
║     Thu ngân → Chọn hóa đơn → Quét QR → Chuyển tiền     ║
║     → Hóa đơn tự chuyển xanh + confetti 🎉              ║
║                                                          ║
║  ☐ 9. Sẵn sàng bảo vệ!                                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Checklist cho giáo viên / bạn bè (chế độ LOCAL)

```
╔══════════════════════════════════════════════════════════╗
║          📦 CHẠY DỰ ÁN TRÊN MÁY CÁ NHÂN               ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ☐ 1. Mở file BE/.env                                   ║
║                                                          ║
║  ☐ 2. CHUYỂN SANG CHẾ ĐỘ LOCAL:                        ║
║     Comment 2 dòng PRODUCTION (thêm # ở đầu):           ║
║       # FRONTEND_URL=http://localhost:5173,...            ║
║       # APP_URL="https://smartclinic.io.vn"              ║
║                                                          ║
║     Uncomment 2 dòng LOCAL (bỏ # ở đầu):                ║
║       FRONTEND_URL=http://localhost:5173                  ║
║       APP_URL="http://localhost:5173"                     ║
║                                                          ║
║  ☐ 3. Terminal 1 — Backend                               ║
║     cd BE                                                ║
║     npm install                                          ║
║     npm run dev                                          ║
║                                                          ║
║  ☐ 4. Terminal 2 — Frontend                              ║
║     cd FE                                                ║
║     npm install                                          ║
║     npm run dev                                          ║
║                                                          ║
║  ☐ 5. Mở browser                                        ║
║     http://localhost:5173                                ║
║     → Đăng nhập → Trang chủ hiện OK                     ║
║                                                          ║
║  ✅ XONG! Không cần Cloudflare, không cần domain.       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Xử lý sự cố nhanh

| Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|
| "Invalid Host header" trên smartclinic.io.vn | `allowedHosts` thiếu domain | Thêm `.smartclinic.io.vn` vào `vite.config.ts` |
| CORS error trên console | `FRONTEND_URL` chưa có `smartclinic.io.vn` | Kiểm tra `BE/.env` đang ở chế độ PRODUCTION |
| CORS error khi chạy local | `FRONTEND_URL` chưa có `localhost:5173` | Kiểm tra `BE/.env` đang ở chế độ LOCAL |
| SePay không gọi webhook | URL webhook trên SePay Dashboard sai | Cập nhật lại URL trên SePay |
| WebSocket không kết nối | Cloudflare không upgrade WS | Kiểm tra `cloudflared` config |
| Trang trắng | Vite chưa start hoặc tunnel chưa healthy | Restart `npm run dev` + kiểm tra `cloudflared` |
| Email link sai domain | `APP_URL` chưa đúng chế độ | Kiểm tra `BE/.env` → `APP_URL` |

---

## J. CODEX EXECUTION PROMPT

> Dưới đây là prompt hoàn chỉnh. Copy nguyên khối và dán vào Codex.

---

````
Bạn là Codex. Thực hiện CHÍNH XÁC các thay đổi sau trong project Smart Clinic.

## NGUYÊN TẮC
- CHỈ sửa 3 file được liệt kê bên dưới
- KHÔNG refactor, KHÔNG đổi logic, KHÔNG đổi tên function
- KHÔNG sửa bất kỳ file nào khác
- KHÔNG thêm package mới
- KHÔNG đổi Prisma schema, Controller, Service, DTO
- GIỮ NGUYÊN tất cả key/value khác trong .env (JWT_SECRET, DATABASE_URL, v.v.)

---

## FILE 1: BE/.env

### Thay đổi 1.1 — Thay FRONTEND_URL và APP_URL thành cấu trúc dual-mode

Tìm 2 dòng này (có thể KHÔNG liền nhau):
```
FRONTEND_URL=http://localhost:5173,https://chester-promising-lens-possession.trycloudflare.com
```
và
```
APP_URL="https://chester-promising-lens-possession.trycloudflare.com"
```

Thay dòng FRONTEND_URL bằng khối sau (đặt ở đúng vị trí dòng FRONTEND_URL cũ):
```
# ╔══════════════════════════════════════════════════════════════╗
# ║  CHUYỂN CHẾ ĐỘ: Comment/Uncomment 2 dòng bên dưới          ║
# ║  PRODUCTION = smartclinic.io.vn (Cloudflare Tunnel)         ║
# ║  LOCAL      = localhost (chạy trên máy tính cá nhân)        ║
# ╚══════════════════════════════════════════════════════════════╝

# === CHẾ ĐỘ PRODUCTION (đang bật) ===
FRONTEND_URL=http://localhost:5173,https://smartclinic.io.vn
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL=http://localhost:5173
# APP_URL="http://localhost:5173"
```

Và XÓA dòng APP_URL cũ (vì nó đã được gộp vào khối trên).

### Thay đổi 1.2 — Xóa dữ liệu thừa cuối file

Xóa hoàn toàn các dòng sau (nằm ở cuối file, sau PATIENT_REVIEW_PASSWORD):
```
 Nguyễn Thị Lan | 0905111222 | nguyenthilan.patient@gmail.com | Lan@123456 |
| Trần Văn Minh | 0905333444 | tranvanminh.patient@gmail.com | Minh@123456 |
| Lê Thị Hương | 0905555666 | lethihuong.patient@gmail.com | Huong@123456 |
```

---

## FILE 2: BE/.env.example

### Thay đổi 2.1 — Thay FRONTEND_URL và APP_URL thành cấu trúc dual-mode

Tìm:
```
FRONTEND_URL="http://localhost:5173"
```
và
```
APP_URL="http://localhost:5173"
```

Thay cả 2 dòng trên bằng khối sau (đặt ở vị trí dòng FRONTEND_URL cũ):
```
# === CHẾ ĐỘ PRODUCTION (Cloudflare Tunnel) ===
FRONTEND_URL="http://localhost:5173,https://smartclinic.io.vn"
APP_URL="https://smartclinic.io.vn"

# === CHẾ ĐỘ LOCAL (bỏ comment 2 dòng dưới, comment 2 dòng trên) ===
# FRONTEND_URL="http://localhost:5173"
# APP_URL="http://localhost:5173"
```

Và XÓA dòng APP_URL cũ (vì đã gộp vào khối trên).

### Thay đổi 2.2 — Thêm SEPAY_API_TOKEN vào cuối file

Thêm dòng sau vào cuối file (sau GEMINI_MAX_RETRIES):
```
SEPAY_API_TOKEN="your-sepay-api-token"
```

---

## FILE 3: FE/vite.config.ts

### Thay đổi 3.1 — allowedHosts
Tìm:
```ts
    allowedHosts: ['.trycloudflare.com'],
```
Thay bằng:
```ts
    allowedHosts: ['.trycloudflare.com', '.smartclinic.io.vn'],
```

---

## KẾT QUẢ MONG ĐỢI

Sau khi sửa xong:
- BE/.env có khối dual-mode với PRODUCTION đang bật
- BE/.env.example có khối dual-mode tương tự
- FE/vite.config.ts chấp nhận cả trycloudflare.com và smartclinic.io.vn
- Dữ liệu thừa cuối BE/.env đã bị xóa
- Tất cả key/value khác GIỮ NGUYÊN

Trả về danh sách chính xác các dòng đã thay đổi.
KHÔNG sửa thêm bất kỳ file nào khác.
````
