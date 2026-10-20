# Hướng dẫn dùng Gemini cho gợi ý thuốc an toàn

## 1. Mục tiêu

Gemini **không kê đơn thay bác sĩ**. Gemini chỉ diễn giải cảnh báo và các phương án thay thế đã được hệ thống kiểm tra, để bác sĩ đọc nhanh hơn trước khi tự quyết định đơn thuốc.

## 2. Kiến trúc đề xuất: Rule-based trước, Gemini sau

```text
Bác sĩ chọn thuốc
        ↓
Backend kiểm tra dị ứng, hoạt chất, tồn kho và trạng thái thuốc
        ↓
Không có cảnh báo: tiếp tục quy trình kê đơn
Có cảnh báo: lấy thuốc thay thế đã duyệt từ CSDL
        ↓
Gemini diễn giải ngắn, dễ hiểu từ dữ liệu đã lọc
        ↓
Bác sĩ quyết định giữ, đổi thuốc hoặc bỏ qua cảnh báo có lý do
```

Các rule an toàn vẫn là nguồn quyết định chính. Gemini tắt, lỗi hoặc trả lời chậm thì cảnh báo dị ứng vẫn phải hoạt động bình thường.

## 3. Dữ liệu cần thêm khi triển khai

Tạo bảng `goi_y_thuoc_thay_the` để quản lý phương án thay thế có kiểm soát.

| Trường | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `thuoc_can_tranh_id` | Thuốc cần tránh, nếu cảnh báo theo thuốc |
| `hoat_chat_can_tranh_id` | Hoạt chất cần tránh, nếu cảnh báo theo hoạt chất |
| `thuoc_thay_the_id` | Thuốc được phép hiện để bác sĩ tham khảo |
| `ghi_chu_chuyen_mon` | Điều kiện/ghi chú đã được duyệt |
| `trang_thai` | Có còn được dùng làm gợi ý hay không |
| `nguoi_duyet_id` | Người chịu trách nhiệm duyệt cấu hình |
| `ngay_hieu_luc` | Ngày bắt đầu áp dụng |

Không lưu liều dùng, số ngày dùng hoặc chỉ định bắt buộc trong bảng này. Liều dùng là quyết định chuyên môn của bác sĩ.

## 4. Dữ liệu Backend được phép gửi cho Gemini

Ví dụ khi bệnh nhân dị ứng Amoxicillin:

```json
{
  "canhBao": "Bệnh nhân có tiền sử dị ứng Amoxicillin",
  "thuocDangChon": "Amoxicillin 500mg",
  "hoatChat": "Amoxicillin",
  "goiYDaDuyet": [
    {
      "tenThuoc": "Azithromycin 250mg",
      "ghiChu": "Chỉ là phương án tham khảo; bác sĩ cần tự kiểm tra chống chỉ định."
    }
  ]
}
```

Gemini chỉ nhận đúng các thuốc đã được Backend lọc từ bảng `goi_y_thuoc_thay_the`; không được tự truy vấn Prisma, SQL hoặc tự tìm thuốc trên Internet.

## 5. Prompt và giới hạn bắt buộc

Prompt cần buộc Gemini:

- Giải thích ngắn lý do cảnh báo bằng tiếng Việt dễ hiểu.
- Chỉ nhắc lại các thuốc thay thế có trong danh sách `goiYDaDuyet`.
- Luôn ghi đây là thông tin tham khảo cho bác sĩ.
- Không tạo thêm tên thuốc, liều dùng, số ngày dùng hay hướng dẫn thay thuốc.
- Không khẳng định thuốc nào phù hợp tuyệt đối.

Ví dụ kết quả hợp lệ:

> Amoxicillin đang bị cảnh báo vì hồ sơ bệnh nhân có tiền sử dị ứng với hoạt chất này. Hệ thống có cấu hình Azithromycin 250mg là một phương án tham khảo. Bác sĩ cần kiểm tra chống chỉ định và quyết định cuối cùng trước khi kê đơn.

## 6. Giao diện đề xuất

Trong card cảnh báo dị ứng tại trang khám bệnh:

1. Hiện cảnh báo rule-based ngay lập tức.
2. Hiện nút **“Xem giải thích AI”** nếu Gemini đã được cấu hình.
3. Khi bấm, hiển thị diễn giải ngắn và nguồn “Gợi ý thuốc đã duyệt trong hệ thống”.
4. Bác sĩ vẫn tự chọn thuốc ở form kê đơn; không có nút “Gemini tự thay thuốc”.
5. Nếu Gemini lỗi, hiển thị: “Chưa thể tải diễn giải AI. Cảnh báo an toàn vẫn có hiệu lực.”

## 7. Khi bị hỏi: “Vì sao chưa dùng Vector RAG?”

Có thể trả lời:

> Phiên bản hiện tại dùng rule-based decision support vì phạm vi phòng khám chỉ cần kiểm tra dị ứng, hoạt chất và các phương án thay thế đã được người có thẩm quyền duyệt. Cách này cho kết quả xác định, có thể kiểm tra và không phụ thuộc vào mô hình AI. Vector RAG chỉ phù hợp khi có tập tài liệu chuyên môn/phác đồ điều trị chính thức, được kiểm duyệt, có phiên bản và quyền sử dụng rõ ràng.

Không nên nói hệ thống đã có RAG nếu chưa triển khai đủ các bước bên dưới.

<!-- ## 8. Nếu mở rộng sang Vector RAG trong tương lai

RAG không nằm sẵn trong PostgreSQL/Neon và cũng không phải kiến thức tự có của Gemini. Cần triển khai đầy đủ:

```text
Tài liệu phác đồ đã được duyệt (PDF)
→ trích xuất và chia đoạn tài liệu
→ tạo embedding cho từng đoạn
→ lưu vector + nguồn + phiên bản
→ truy vấn các đoạn liên quan theo ngữ cảnh khám
→ gửi đoạn đã truy xuất cùng danh sách thuốc được phép cho Gemini
→ Gemini trả lời kèm trích dẫn tài liệu
```

Các bảng tối thiểu nếu triển khai RAG:

- `tai_lieu_chuyen_mon`: tên, nguồn, phiên bản, ngày hiệu lực, người duyệt.
- `doan_tai_lieu_chuyen_mon`: nội dung đoạn, trang nguồn, embedding/vector, tài liệu cha.
- `goi_y_thuoc_thay_the`: dữ liệu gợi ý đã duyệt theo thuốc/hoạt chất.

RAG chỉ dùng để tìm và trích dẫn nội dung từ phác đồ. Rule dị ứng, tồn kho, trạng thái thuốc và quyết định cuối cùng của bác sĩ luôn nằm ngoài Gemini. -->

## 9. Kết luận

Giai đoạn phù hợp hiện tại:

- Dùng rule-based để cảnh báo an toàn.
- Dùng bảng gợi ý thuốc thay thế đã duyệt để giới hạn phương án.
- Gemini chỉ diễn giải theo dữ liệu đã kiểm tra.

Chỉ triển khai Vector RAG khi có tài liệu chuyên môn được phê duyệt. Không dùng AI để tự tạo đơn thuốc hoặc tự đưa ra liều dùng.



## Tích hợp dữ liệu khám chuyên khoa

Hệ thống sử dụng bảng `chi_tiet_kham_chuyen_khoa` để lưu dữ liệu
đặc thù của từng chuyên khoa dưới dạng JSONB.

Dữ liệu này không trực tiếp quyết định thuốc được kê.

Khi bác sĩ yêu cầu hỗ trợ, Backend lấy các thông tin liên quan từ:

- chuyên khoa của lượt khám
- hồ sơ khám chung
- `chi_tiet_kham_chuyen_khoa.du_lieu`
- chẩn đoán / ICD-10
- dị ứng bệnh nhân
- thuốc đang được chọn
- hoạt chất
- tồn kho và trạng thái thuốc

Backend chỉ chọn các field chuyên khoa cần thiết làm ngữ cảnh.

Luồng:

TrangKhamBenh
→ KhamChuyenKhoa
→ chi_tiet_kham_chuyen_khoa.du_lieu JSONB
→ Service cảnh báo/gợi ý thuốc
→ Rule-based kiểm tra an toàn
→ goi_y_thuoc_thay_the
→ Gemini diễn giải
→ Bác sĩ quyết định

Gemini không được:
- truy cập trực tiếp Prisma/Database
- tự tạo tên thuốc ngoài danh sách Backend cung cấp
- tự quyết định liều dùng
- tự thêm thuốc vào đơn
- tự thay đổi đơn thuốc