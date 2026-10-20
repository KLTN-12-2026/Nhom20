# 🧭 HƯỚNG DẪN ĐỌC KIẾN TRÚC SMART CLINIC VÀ GIAO TIẾP VỚI AI (Bản Chi Tiết)

Tài liệu này được thiết kế dành riêng cho Quản lý dự án / Chủ phòng khám (không chuyên code). Nó giúp bạn hiểu rõ "phần mềm đang được xây dựng như thế nào" để dễ dàng điều phối, kiểm soát lỗi và đưa ra yêu cầu (prompt) chính xác cho các AI Lập trình (Codex, Cursor, v.v.).

---

## 🏛️ PHẦN 1: MÔ HÌNH "NHÀ HÀNG" (TỔNG QUAN)
Phần mềm Smart Clinic hoạt động y hệt một nhà hàng:
1. **Frontend (ReactJS)** = *Khu vực Bàn ăn*. Giao diện bác sĩ, lễ tân thao tác, click chuột.
2. **Backend (NestJS)** = *Khu vực Nhà bếp*. Đầu bếp xử lý tính toán, luật lệ, giá tiền. Bàn ăn gọi món, bếp làm xong mới bê ra.
3. **Database (Prisma)** = *Nhà kho*. Lưu trữ toàn bộ nguyên liệu (hồ sơ, toa thuốc, doanh thu).
4. **Realtime (Websocket)** = *Chuông báo / Bộ đàm*. Bếp vừa ra món, cái chuông réo lên, lễ tân lập tức biết để ra nhận mà không cần đi vào bếp hỏi "xong chưa".

---

## 💻 PHẦN 2: CHI TIẾT BẢN ĐỒ FRONTEND (GIAO DIỆN)
**Vị trí thư mục:** `d:\smart-clinic\FE`
**Công nghệ:** ReactJS, Vite, TypeScript.

Frontend của phòng khám được chia thành các **Modules** (Phân hệ) độc lập để dễ quản lý. Hãy vào `FE/src/modules/` để tìm:
- `tiep-don/`: Giao diện lễ tân đón khách, xếp hàng.
- `kham-benh/`: Giao diện bác sĩ, màn hình điền sinh hiệu, chỉ định thuốc.
- `thu-ngan/`: Màn hình thanh toán, in hóa đơn.
- `thong-bao/`: Chức năng chuông báo, nhắc việc.

**Trong mỗi phân hệ (Module), sẽ có 4 thư mục con mà AI rất hay sửa:**
1. **`pages/`**: Cấu trúc màn hình to toàn cảnh (Ví dụ: `TrangKhamBenh.tsx`).
2. **`components/`**: Các mảnh ghép nhỏ trên màn hình (Ví dụ: cái nút bấm `NotificationBell.tsx`, hay khung nhập `KhamSanPhuKhoa.tsx`).
3. **`api/`**: File chứa đoạn mã dùng để "Gọi món" xuống nhà bếp Backend (Ví dụ: `kham-benh.api.ts`).
4. **`hooks/`**: Chứa logic vòng lặp, tự động cập nhật của React (Ví dụ: `use-notifications.ts`).

---

## ⚙️ PHẦN 3: CHI TIẾT BẢN ĐỒ BACKEND (XỬ LÝ NGHIỆP VỤ)
**Vị trí thư mục:** `d:\smart-clinic\BE`
**Công nghệ:** NestJS, TypeScript, Prisma.

Đây là trái tim của hệ thống. Bất kỳ tính toán tiền bạc, số lượng thuốc nào cũng phải nằm ở đây để chống Hacker đổi giá trên giao diện.

**1. Kho dữ liệu (Database)**
- Nằm tại: `BE/prisma/schema.prisma`. 
- **CỰC KỲ QUAN TRỌNG:** Đây là file "Khai sinh" của dự án. File này định nghĩa bảng `HoaDon`, bảng `Thuoc`, bảng `BenhNhan` có những cột dữ liệu gì. AI muốn hiểu dự án, BẮT BUỘC phải đọc file này đầu tiên.

**2. Các phân hệ xử lý (Modules)**
- Nằm tại: `BE/src/modules/` (Cũng chia theo tên như Frontend). Trong mỗi module sẽ có:
  - **`*.controller.ts` (Bồi bàn)**: Nhận yêu cầu từ giao diện (FE), kiểm tra xem người này có quyền (Token JWT) gọi món không, rồi chuyển xuống Bếp.
  - **`*.service.ts` (Đầu bếp chính)**: Chứa toàn bộ luật nghiệp vụ. Ví dụ: Hàm trừ đi số lượng thuốc tồn kho, tính tổng tiền hóa đơn, tạo bệnh án.
  - **`dto/` (Sổ kiểm định)**: Thư mục chứa các file quy định dữ liệu gửi lên phải là dạng gì (Ví dụ: Số lượng thuốc phải là số dương, tên bệnh nhân không được để trống). Nó tự động chặn Hacker gửi dữ liệu rác (Mass Assignment).

---

## 🔔 PHẦN 4: HỆ THỐNG REALTIME (THỜI GIAN THỰC)
**Công nghệ:** Server-Sent Events (SSE) hoặc WebSocket (Socket.io).

Realtime giải quyết bài toán: "Khi bác sĩ lưu bệnh án xong, làm sao màn hình thu ngân tự động hiện thông báo chờ thanh toán mà thu ngân không cần bấm F5?"
- **Phía Backend:** Sau khi `service.ts` lưu bệnh án thành công vào Database, nó sẽ gọi thêm 1 lệnh qua Gateway (hoặc Event Emitter) để "Bắn" (Emit) một sự kiện (Ví dụ: `NEW_PRESCRIPTION`) kèm id của thu ngân.
- **Phía Frontend:** Khối giao diện (như `NotificationBell.tsx`) sẽ luôn luôn mở một "ống nghe" (Socket Listener) trực diện với Backend. Khi thấy tín hiệu `NEW_PRESCRIPTION` dội tới, Frontend tự động cập nhật con số màu đỏ lên +1 và hiển thị popover.

---

## 🎯 PHẦN 5: PROMPT "THẦN CHÚ" ĐỂ SAI BẢO AI (CODEX/CURSOR)

Vì dự án rất đồ sộ, nếu bạn chỉ ra lệnh "Thêm cho tôi tính năng tính thuế VAT", AI thường sẽ code đại vào một file nào đó làm hỏng cấu trúc. Hãy copy toàn bộ đoạn Prompt dưới đây và dán vào AI trước khi giao việc cho nó:

> **[BẮT ĐẦU PROMPT]**
> Chào AI. Tôi là Quản lý dự án của Smart Clinic (Hệ thống Y tế dùng ReactJS + NestJS + Prisma). Tôi cần bạn [Xây dựng tính năng / Sửa lỗi] phần: **[Điền tên tính năng vào đây - VD: Thông báo Realtime cho Thu ngân]**.
> 
> Trước khi viết bất kỳ dòng code nào, BẠN BẮT BUỘC phải làm bước Khảo sát (Discovery) theo thứ tự sau:
> 1. Đọc file `BE/prisma/schema.prisma` để hiểu cấu trúc các bảng liên quan.
> 2. Quét thư mục `BE/src/modules/[tên_tính_năng]` để xem API và Service xử lý nghiệp vụ hiện tại. (Chú ý các chuẩn bảo mật DTO, kiểm tra quyền User).
> 3. Quét thư mục `FE/src/modules/[tên_tính_năng]` để xem file giao diện (.tsx), hàm gọi API (.api.ts).
> 4. (Nếu có realtime): Kiểm tra các Gateway/Events ở BE và Listener ở FE.
> 
> Yêu cầu công việc của bạn:
> - Tóm tắt lại luồng đi của dữ liệu từ FE -> BE -> Database và trả ngược lại FE.
> - Báo cáo các file bạn dự định sửa đổi.
> - CAM KẾT (Zero Regression): Tuyệt đối không được xóa/sửa làm vỡ các tính năng đang chạy bình thường ở Backend. Mọi thay đổi Frontend (Giao diện) phải bám sát cấu trúc Minimalist hiện có.
> 
> Hãy xác nhận bạn đã hiểu kiến trúc và đưa ra kế hoạch (Implementation Plan) để tôi duyệt trước khi bạn bắt tay vào code!
> **[KẾT THÚC PROMPT]**
