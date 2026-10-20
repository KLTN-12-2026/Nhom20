# CHATBOX AI — KẾ HOẠCH THEO PHASE

> Blueprint V12 đã chốt. Mỗi phase làm xong → test → báo PASS/FAIL → DỪNG, không tự ý sang phase kế tiếp.

---

## 📍 PHASE 1 — Chatbox cơ bản

### Mục tiêu
Mở Chatbox → tạo phiên → gửi tin nhắn → Gemini trả lời → lưu DB → F5 vẫn load được lịch sử.

### Phạm vi
| Thành phần | Chi tiết |
|---|---|
| SDK | `@google/genai` |
| Model | `gemini-3.6-flash` |
| Auth | Optional JWT (parse thật cho user đăng nhập) |
| Guest | Có cơ chế bảo vệ session riêng (không chỉ dùng sessionId) |
| Context | 20 tin nhắn gần nhất, current message không lặp lại trong history |
| Giới hạn | Tối đa 2000 ký tự / tin nhắn |
| Backend | `ChatAIModule`, `GeminiService` |
| DB | `phien_chat`, `tin_nhan_chat`, `lan_chay_ai` |
| Frontend | Chatbox widget nổi góc màn hình |

### KHÔNG làm
- Tool calling
- Đặt lịch
- AI cảnh báo
- Sửa Prisma schema (nếu hiện tại đã đủ)
- Đụng module khám bệnh / dược sĩ / thu ngân

### Prompt Codex

Bắt đầu PHASE 1 theo CHATBOX.md và Blueprint V12 đã chốt.

Chỉ làm CHATBOX CƠ BẢN:
- Gemini connection
- tạo/tái sử dụng phiên chat
- gửi/nhận tin nhắn
- lưu phien_chat
- lưu tin_nhan_chat
- lưu lan_chay_ai
- load lịch sử
- FE Chatbox Widget

Áp dụng các chỉnh sửa đã chốt:
- dùng @google/genai
- Optional JWT thực sự parse token
- guest phải có cơ chế bảo vệ session riêng, không chỉ sessionId
- context = 20 tin gần nhất
- current message không được gửi trùng trong history
- max message = 2000
- model = gemini-3.6-flash

KHÔNG làm tool calling. KHÔNG đặt lịch. KHÔNG AI cảnh báo.
KHÔNG sửa Prisma nếu schema hiện tại đã đủ.
KHÔNG đụng module khám bệnh/dược sĩ/thu ngân.
```

### Checklist test
- [ ] Build FE + BE thành công
- [ ] Test guest chat
- [ ] Test bệnh nhân đăng nhập chat
- [ ] Neon có đủ `phien_chat`, `tin_nhan_chat`, `lan_chay_ai`
- [ ] Refresh vẫn load lịch sử
- [ ] Báo PASS/FAIL → DỪNG
    
---

## 📍 PHASE 2 — AI tra cứu dữ liệu thật

### Luồng
```
User hỏi ("Tôi muốn khám da liễu")
      ↓
   Gemini
      ↓
    Tool
      ↓
 Database thật
      ↓
 Gemini trả lời
```

### Tool cần thêm
- `tim_chuyen_khoa`
- `tim_bac_si`
- `tim_dich_vu`
- `xem_lich_bac_si`

### Quy tắc bắt buộc
- Gemini **không** truy cập Prisma trực tiếp
- Gemini **không** viết SQL
- Tool phải tái sử dụng Service/Repository hiện có
- Chỉ trả dữ liệu thật đang có trong DB
- Gemini không được bịa bác sĩ / chuyên khoa / dịch vụ / lịch

### Prompt Codex
```
PHASE 1 đã hoàn tất.

Tiếp tục PHASE 2 — TRA CỨU.

Chỉ bổ sung Tool/Function Calling:
- tim_chuyen_khoa
- tim_bac_si
- tim_dich_vu
- xem_lich_bac_si

Quy tắc:
- Gemini KHÔNG truy cập Prisma trực tiếp.
- Gemini KHÔNG viết SQL.
- Tool phải tái sử dụng Service/Repository hiện có.
- Chỉ trả dữ liệu thật đang có trong database.
- Không cho Gemini tự bịa bác sĩ, chuyên khoa, dịch vụ hoặc lịch.
```

### Test case
- [ ] "Tôi muốn khám da liễu"
- [ ] "Phòng khám có khoa mắt không?"
- [ ] "Bác sĩ nào khám tai mũi họng?"
- [ ] "Ngày mai bác sĩ X có lịch không?"
- [ ] "Khám da liễu bao nhiêu tiền?"
- [ ] Báo PASS/FAIL → DỪNG (chưa làm đặt lịch)

---

## 📍 PHASE 3 — Đặt lịch bằng Chatbox ⭐ (phần giá trị nhất)

### Luồng
```
"Tôi muốn khám da liễu chiều mai"
      ↓
  AI tìm khoa → tìm bác sĩ → tìm lịch trống
      ↓
    đề xuất
      ↓
  [Xác nhận]
      ↓
  tạo lich_hen
```

### Quy tắc
- Cả bệnh nhân **đã đăng nhập** và **khách vãng lai (Guest)** đều được đặt lịch
- Guest: được hỏi lịch, **được** tạo lịch dưới dạng khách vãng lai
- Gemini **tuyệt đối không** tự tạo `lich_hen` khi chưa xác nhận
- Backend phải validate lại trước khi ghi: lịch bác sĩ, lịch trùng, bệnh nhân từ JWT, bác sĩ/chuyên khoa có thật
- `nguonDatLich = AI_HO_TRO`

### Flow chi tiết
1. User yêu cầu
2. Gemini hiểu chuyên khoa/ngày/buổi
3. Tool tra dữ liệu thật
4. Đề xuất bác sĩ + giờ
5. Tạo bản nháp
6. FE hiển thị thông tin xác nhận
7. User bấm **XÁC NHẬN**
8. Backend validate lại
9. Tạo `lich_hen`

### Prompt Codex
```
PHASE 2 đã PASS.

Làm PHASE 3 — ĐẶT LỊCH QUA CHATBOX.

Cho phép cả bệnh nhân đã đăng nhập và khách vãng lai (Guest) đặt lịch.

Flow: User yêu cầu → Gemini hiểu chuyên khoa/ngày/buổi → tool tra dữ liệu thật
→ đề xuất bác sĩ + giờ → tạo bản nháp → FE hiển thị xác nhận → user bấm XÁC NHẬN
→ Backend validate lại → mới tạo lich_hen → nguonDatLich = AI_HO_TRO

Guest cũng được phép đặt lịch thông qua Chatbox.
Gemini tuyệt đối không tự tạo lich_hen khi user chưa xác nhận.

Phải kiểm tra: lịch bác sĩ, lịch trùng, bệnh nhân hiện tại từ JWT,
bác sĩ/chuyên khoa thực sự tồn tại.
```

### Test
- [ ] "Tôi muốn khám da liễu chiều mai."
- [ ] Kiểm tra `lich_hen` trên Neon
- [ ] Kiểm tra nguồn `AI_HO_TRO`
- [ ] PASS/FAIL → DỪNG (chưa làm AI cảnh báo)

---

## 📍 PHASE 4 — AI cảnh báo thuốc

### Nguyên tắc: Rule Database ưu tiên trước Gemini

| Loại kiểm tra | Nguồn |
|---|---|
| Dị ứng | ✓ Rule DB |
| Trùng hoạt chất | ✓ Rule DB |
| Thuốc hết hạn | ✓ Rule DB |
| Không đủ tồn kho | ✓ Rule DB |
| Thiếu liều dùng | ✓ Rule DB |
| Thiếu hướng dẫn | ✓ Rule DB |
| Tương tác thuốc / giải thích bổ trợ | △ Gemini (nếu cần) |

### AI tuyệt đối KHÔNG được
- Sửa đơn
- Xóa thuốc
- Tự kê thuốc
- Tự thay đổi liều
- Tự hoàn tất khám

→ Bác sĩ luôn là người quyết định.

### UI bác sĩ kê đơn cần hiển thị
- ⚠ Cảnh báo: mức độ / nội dung / xem chi tiết / xác nhận đã xem / bỏ qua
- Nếu bỏ qua cảnh báo quan trọng → **bắt buộc nhập lý do**

### Lưu vào
`canh_bao_don_thuoc`

### Prompt Codex
```
PHASE 3 đã PASS.

Làm PHASE 4 — CẢNH BÁO ĐƠN THUỐC.

Ưu tiên Rule Database trước Gemini.

Kiểm tra:
1. Dị ứng thuốc
2. Trùng hoạt chất
3. Thuốc hết hạn
4. Không đủ tồn kho
5. Thiếu liều dùng
6. Thiếu hướng dẫn
7. Tương tác thuốc dùng Gemini bổ trợ nếu cần

Lưu cảnh báo vào canh_bao_don_thuoc.
Nếu bỏ qua cảnh báo quan trọng → bắt buộc nhập lý do.

AI KHÔNG được: sửa đơn, xóa thuốc, tự kê thuốc, tự thay đổi liều, tự hoàn tất khám.
Không đổi flow kê đơn hiện tại nếu không cần.
```

### Test
- [ ] Test từng loại cảnh báo (7 mục trên)
- [ ] PASS/FAIL → DỪNG

---

## 📍 PHASE 5 — Socket Realtime + Thông báo + Nhật ký

### Ví dụ sự kiện
| Sự kiện | Kết quả |
|---|---|
| AI đặt lịch thành công | Thông báo lễ tân realtime |
| Cảnh báo đơn thuốc | Bác sĩ thấy ngay |
| AI lỗi | Ghi `lan_chay_ai` |
| User bỏ qua cảnh báo | Ghi nhật ký |

### Nguyên tắc
- Tái sử dụng Socket.IO hiện tại — **không tạo hệ thống Socket thứ hai**
- Chỉ tạo event mới khi thật sự thiếu

### Bảng liên quan
`lan_chay_ai`, `thong_bao`, `nhat_ky_he_thong`

### Prompt Codex
```
PHASE 4 đã PASS.

Làm PHASE 5 — REALTIME + LOG.

Tái sử dụng Socket.IO hiện tại. Kiểm tra và chỉ tạo event mới khi thật sự thiếu.

Cần xử lý:
- Chat notification nếu cần
- Lịch hẹn AI mới → thông báo Lễ tân
- Cảnh báo thuốc → realtime
- lan_chay_ai
- thong_bao
- nhat_ky_he_thong

Không tạo hệ thống Socket thứ hai.
```

### Test
- [ ] AI đặt lịch → lễ tân nhận thông báo không cần F5
- [ ] Cảnh báo đơn thuốc → giao diện cập nhật đúng
- [ ] Kiểm tra reconnect Socket
- [ ] PASS/FAIL → DỪNG

---

## 📍 PHASE 6 — Test toàn bộ Chatbox (Regression + E2E)

> Không thêm tính năng mới, chỉ sửa bug tìm thấy khi test.

### Luồng test tổng
```
Guest → Chat → Tra cứu khoa/bác sĩ

Bệnh nhân login → Chat → Tìm khoa → Tìm bác sĩ → Tìm lịch
→ Đặt lịch → Xác nhận → Neon → Lễ tân nhận realtime

Bác sĩ kê đơn → Rule cảnh báo → Gemini bổ trợ → Bác sĩ xử lý → DB lưu
```

### Prompt Codex
```
Không code chức năng mới.

PHASE 6 — REGRESSION + END-TO-END TEST.

Chỉ sửa bug tìm thấy khi test. Không refactor lớn.
Cuối cùng tạo báo cáo PASS/FAIL từng mục.
```

### Checklist 20 mục
- [ ] 1. Guest chat
- [ ] 2. Guest tra cứu
- [ ] 3. Guest được phép đặt lịch
- [ ] 4. Patient login chat
- [ ] 5. Lịch sử chat
- [ ] 6. Refresh vẫn còn lịch sử
- [ ] 7. Tra cứu chuyên khoa
- [ ] 8. Tra cứu bác sĩ
- [ ] 9. Tra lịch
- [ ] 10. Đặt lịch
- [ ] 11. Confirm booking
- [ ] 12. Neon lưu đúng
- [ ] 13. Lễ tân nhận realtime
- [ ] 14. Dị ứng thuốc
- [ ] 15. Trùng hoạt chất
- [ ] 16. Tồn kho
- [ ] 17. Cảnh báo Gemini (nếu có)
- [ ] 18. Ghi lan_chay_ai
- [ ] 19. Ghi thong_bao
- [ ] 20. Không ảnh hưởng luồng khám cũ

---

## 🔗 Thứ tự chốt

```
PHASE 1 — Chat cơ bản
    ↓
PHASE 2 — Tra cứu bằng Tool
    ↓
PHASE 3 — Đặt lịch AI
    ↓
PHASE 4 — Cảnh báo thuốc
    ↓
PHASE 5 — Realtime + Log
    ↓
PHASE 6 — Test toàn bộ
```