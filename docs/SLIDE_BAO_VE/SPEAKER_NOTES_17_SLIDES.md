# SPEAKER NOTES — BẢO VỆ KLTN SMART CLINIC (THEO TEMPLATE MẪU 17 SLIDE)

## Slide 01
Kính chào Quý Thầy/Cô trong Hội đồng đánh giá Khóa luận Tốt nghiệp.
Chúng em là Nhóm 20, Khoa Công nghệ Thông tin, Đại học Duy Tân. Dưới sự hướng dẫn của ThS. Nguyễn Thanh Trung, nhóm xin phép trình bày đề tài: Xây dựng hệ thống quản lý và điều phối khám bệnh đa chuyên khoa tích hợp trí tuệ nhân tạo — Smart Clinic.

## Slide 02
Nhóm 20 gồm 5 thành viên: Phan Thị Minh Trâm (Nhóm trưởng / Quản lý dự án), Trần Nguyên Khanh, Nguyễn Hữu Thọ, Vũ Đức Nguyên và Doãn Nam Duy. Chân dung các thành viên sẽ được nhóm bổ sung vào các khung ảnh giữ chỗ trước giờ trình bày.

## Slide 03
Nội dung bảo vệ của nhóm gồm 5 phần chính bám sát mạch trình bày: (01) Giới thiệu đề tài và thực trạng bài toán; (02) Hệ sinh thái Smart Clinic cùng luồng AI an toàn và realtime; (03) Kiến trúc hệ thống và cơ sở dữ liệu thực tế; (04) Chiến lược triển khai theo khung Agile/Scrum; và (05) Demo sản phẩm, kết quả kiểm thử, hạn chế và hướng phát triển.

## Slide 04
Qua khảo sát thực tế quy trình phòng khám đa chuyên khoa, nhóm chia các tồn tại hiện nay thành hai nhóm: Về quản lý & vận hành, dữ liệu rời rạc giữa các khâu, hàng chờ ùn tắc và đặt lịch ngoài giờ còn hạn chế. Về an toàn & thanh toán, có rủi ro kê nhầm thuốc dị ứng hoặc cấp sai lô, đối soát chuyển khoản thủ công dễ nhầm và thiếu phân quyền RBAC chi tiết.

## Slide 05
Smart Clinic mang lại 4 giá trị cốt lõi xoay quanh chuyển đổi số y tế phòng khám: Một là tiện ích đặt lịch và Chatbox AI 24/7 cho bệnh nhân; Hai là liên thông dữ liệu xuyên suốt 5 vai trò trên một hệ thống; Ba là nâng cao an toàn chuyên môn nhờ bộ lọc dị ứng và xuất thuốc FEFO; Bốn là cập nhật trạng thái tức thì qua WebSocket và đối soát thanh toán SePay.

## Slide 06
Về cơ chế an toàn y tế và trí tuệ nhân tạo, nhóm thiết kế kiến trúc Human-in-the-loop gồm 3 lớp bảo vệ: Lớp 1 là Rule-based lọc cứng toàn bộ thuốc dị ứng và lô hết hạn; Lớp 2 là Gemini AI chỉ xếp hạng gợi ý tham khảo trên tập ứng viên an toàn và Bác sĩ là người quyết định cuối cùng; Lớp 3 tại Nhà thuốc đảm bảo xuất đúng lô theo nguyên tắc FEFO.

## Slide 07
Quy trình nghiệp vụ 4 bước liên thông theo thời gian thực: Bước 1 Lễ tân tiếp đón và phát sự kiện queue lên bảng chờ công khai; Bước 2 Bác sĩ khám chuyên khoa, chỉ định dịch vụ và kê đơn; Bước 3 nếu có đơn thuốc thì Dược sĩ cấp theo FEFO rồi mới mở khóa hóa đơn; Bước 4 Thu ngân thu tiền mặt hoặc quét VietQR để SePay gửi webhook cập nhật trạng thái kèm pháo hoa.

## Slide 08
Hệ thống phục vụ đồng thời 5 nhóm người dùng với cơ chế phân quyền RBAC riêng biệt: Bệnh nhân (đặt lịch, theo dõi đơn và dùng Chatbox AI); Bác sĩ và Trưởng khoa (khám chuyên môn, kê đơn và duyệt lịch trực); Lễ tân và Thu ngân (tiếp đón, thanh toán SePay và bàn giao ca); cùng Dược sĩ (cấp thuốc FEFO) và Quản trị viên Admin.

## Slide 09
Chatbox AI của Smart Clinic sử dụng Google Gemini SDK với 6 Function Calling Tools do Backend cung cấp. Bệnh nhân hỏi bằng tiếng Việt tự nhiên, Gemini gọi tool qua tầng trung gian để lấy chuyên khoa, bác sĩ, lịch trống hoặc tạo lịch hẹn nháp, mọi lượt chạy được ghi log token và độ trễ vào bảng lan_chay_ai.

## Slide 10
6 điểm nổi bật nâng cao trải nghiệm người dùng trên Smart Clinic bao gồm: đặt lịch linh hoạt cả khách vãng lai lẫn bệnh nhân có tài khoản, bảng chờ cập nhật thời gian thực, phân quyền động 18 phân hệ, Chatbox AI 6 tools, đối soát SePay QR kèm hiệu ứng pháo hoa cho thu ngân, và bàn giao ca trực minh bạch.

## Slide 11
Tổng quan kiến trúc 3 tầng của hệ thống: Tầng 01 Frontend sử dụng React 19, TypeScript, Vite 8 và Bootstrap 5; Tầng 02 Trí tuệ nhân tạo & Dữ liệu gồm Google Gemini API, Prisma ORM v7 trên Neon PostgreSQL và Cloudinary; Tầng 03 Backend Core & Realtime là NestJS 11 với 24 module phân tầng, JWT/RBAC, Socket.IO và SePay Webhook.

## Slide 12
Đây là sơ đồ kiến trúc công nghệ chi tiết của dự án Smart Clinic Nhóm 20, được thiết kế theo đúng bố cục mẫu nhưng sử dụng 100% công nghệ thực tế đang chạy trong mã nguồn:
- Bên trái là Frontend Web (React 19, TypeScript, Vite 8, Bootstrap 5, Zustand, Chart.js) giao tiếp qua Axios REST (Passport JWT + RBAC) và Socket.IO Client.
- Trung tâm là Backend Core dùng NestJS 11 phân tầng Controller → Service → Repository với 24 module và Prisma ORM v7 kết nối PostgreSQL trên Neon Cloud (44 bảng).
- Phía trên là Real-time Communication Service sử dụng NestJS WebSockets + Socket.IO (/realtime) phát sự kiện queue.*, invoice.*, payment.*.
- Phía dưới và bên phải là các dịch vụ tích hợp: Google Gemini API (@google/genai) cho Chatbox 6 tools & gợi ý thuốc, Cloudinary lưu ảnh, Nodemailer SMTP, SePay + VietQR Webhook qua Cloudflare Tunnel (smartclinic.io.vn).

## Slide 13
Đây là sơ đồ thực thể liên kết (ERD) đầy đủ của Smart Clinic trích từ tài liệu Database của nhóm. Hệ thống sử dụng PostgreSQL trên Neon Cloud với Prisma ORM v7, gồm 44 bảng dữ liệu, 40 kiểu Enum và 29 migration đã triển khai, bao phủ toàn bộ phân hệ RBAC, ca trực, lịch hẹn, hàng chờ, khám chuyên khoa, chỉ định dịch vụ, kho thuốc FEFO, thanh toán SePay và Chatbox AI.

## Slide 14
Nhóm tổ chức thực hiện dự án theo khung Agile/Scrum chia làm 3 Sprint chính trong giai đoạn 28/09 đến 15/12/2026: Sprint 1 hoàn thiện xác thực JWT/RBAC, danh mục, đặt lịch vãng lai và bảng chờ realtime; Sprint 2 xây dựng luồng khám đa chuyên khoa, chỉ định dịch vụ, kê đơn an toàn và xuất kho thuốc FEFO; Sprint 3 tích hợp Google Gemini AI, thanh toán SePay Webhook qua Cloudflare Tunnel, báo cáo và chạy hồi quy 238/238 Jest tests.

## Slide 15
Trên slide minh họa giao diện thực tế và QR SePay của Smart Clinic vận hành qua tên miền smartclinic.io.vn. Về kiểm thử, bộ 22 test suites Backend đạt 238/238 PASS (trên dữ liệu mock), kiểm thử trình duyệt Chrome phát hiện lỗi hóa đơn đã hủy trước đó đã được sửa ở PR #86, và toàn bộ bước kiểm tra TypeScript BE/FE đều đạt.

## Slide 16
Nhóm nhìn nhận trung thực 3 hạn chế hiện tại gồm: thiếu môi trường PostgreSQL staging để kiểm thử đồng thời thực tế, kết quả cận lâm sàng còn dừng ở mức mô phỏng văn bản, và chưa có bảng hàng chờ đối soát riêng cho webhook nhận tiền trước cấp thuốc. Từ đó, nhóm đề xuất 3 hướng phát triển trọng tâm gồm chuẩn hóa HL7/BHYT, mở rộng PWA/Mobile Push cùng CI/CD, và nâng cao AI tóm tắt bệnh án.

## Slide 17
Phần trình bày của Nhóm 20 đến đây là kết thúc. Chúng em xin chân thành cảm ơn ThS. Nguyễn Thanh Trung và Quý Thầy/Cô trong Hội đồng đã lắng nghe. Nhóm rất mong nhận được câu hỏi và ý kiến đóng góp của Quý Thầy/Cô để hoàn thiện hệ thống Smart Clinic.
