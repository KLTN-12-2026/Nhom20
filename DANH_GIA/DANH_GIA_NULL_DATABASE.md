# Đánh giá các cột thường xuyên `NULL` trong Database

**Thời điểm audit:** 13/08/2026  
**Phạm vi:** Prisma schema → Backend WRITE/READ → Frontend → dữ liệu Neon hiện tại.  
**Cam kết lần audit này:** chỉ dùng truy vấn `SELECT`; không sửa source, không migration, không reset và không thay đổi dữ liệu Neon.

## 1. Cách đọc báo cáo

- `NULL_HOP_LE`: cột tùy chọn theo trạng thái hoặc nghiệp vụ, để `NULL` là đúng.
- `NULL_SAI_LOGIC`: dữ liệu hiện có thiếu giá trị mà luồng nghiệp vụ đã hoàn tất đáng ra phải ghi.
- `COT_KHONG_SU_DUNG`: chưa thấy Backend/Frontend hiện tại đọc hoặc ghi trực tiếp; chỉ là **ứng viên xem xét**, chưa được phép xóa.
- `CHUA_RO`: schema/source có khả năng dùng nhưng dữ liệu hiện tại chưa đủ để kết luận, cần kiểm thử luồng thật.

Ngưỡng “thường xuyên `NULL`” trong bảng bên dưới là từ **50% số dòng trở lên**. Ngoại lệ: FK nghiệp vụ quan trọng như `chi_tiet_hoa_don.thuoc_id` vẫn được nêu dù tỷ lệ tổng thấp hơn vì cần phân tích theo loại dòng hóa đơn.

> Không thể kết luận “nhiều NULL thì phải xóa”. Một cột lịch sử, trạng thái hoặc liên kết tùy chọn có thể đúng khi NULL.

## 2. Kết luận ưu tiên: `chi_tiet_hoa_don`

### Số liệu Neon

- Tổng `chi_tiet_hoa_don`: **357** dòng.
- `dich_vu_id`: **357/357 NULL (100%)**.
- `thuoc_id`: **155/357 NULL (43,4%)**.
- `ghi_chu`: **357/357 NULL (100%)**.
- Nhóm `PHI_KHAM`: **130** dòng; `dich_vu_id` và `thuoc_id` đều NULL.
- Nhóm `TIEN_THUOC`: **227** dòng; **202** có `thuoc_id`, **25** thiếu `thuoc_id`.

### Đối chiếu Prisma → Backend → FE → Neon

1. Prisma cho phép `dichVuId`, `thuocId`, `ghiChu`, `maMuc` là tùy chọn; `tenMuc`, `donGia`, `thanhTien` là snapshot bắt buộc.
2. Backend tại `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts` tạo hóa đơn như sau:
   - Dòng `PHI_KHAM` lấy mã/tên/phí từ `ChuyenKhoa` (`maChuyenKhoa`, `tenChuyenKhoa`, `phiKham`), không lấy từ `DichVu`.
   - Mỗi dòng `TIEN_THUOC` được tạo **theo từng thuốc** và ghi `thuocId` của `ChiTietDonThuoc`.
3. Backend thanh toán tại `BE/src/modules/thanh-toan/thanh-toan.service.ts` và FE tại `FE/src/modules/thanh-toan/pages/thu-ngan/TrangQuanLyThanhToan.tsx` hiển thị từ snapshot `tenMuc`, `soLuong`, `donGia`, `thanhTien`, không phụ thuộc FK để in/lưu lịch sử hóa đơn.
4. Neon xác nhận mô hình hiện tại **không gom cả đơn thuốc vào một dòng**: 202 dòng thuốc có `thuoc_id` riêng.

### Quyết định nghiệp vụ nên giữ

- **Giữ** `ma_muc`, `ten_muc`, `so_luong`, `don_gia`, `thanh_tien`: đây là snapshot lịch sử. Nếu sau này đổi giá/tên thuốc hoặc chuyên khoa thì hóa đơn cũ vẫn đúng tại thời điểm thu tiền.
- **Giữ** `thuoc_id`: đây là liên kết nguồn của dòng thuốc. Không thay nó bằng `don_thuoc_id`, vì `don_thuoc_id` chỉ nói “thuộc đơn nào”, còn `thuoc_id` mới xác định đúng thuốc của dòng đó.
- Có thể **bổ sung `don_thuoc_id` trong tương lai** nếu cần truy vết báo cáo từ dòng hóa đơn về đơn thuốc gốc; đây là thông tin bổ sung, không thay thế `thuoc_id`.
- `dich_vu_id` **không tự động phải ghi** cho `PHI_KHAM` hiện tại, vì phí khám đang là phí của `ChuyenKhoa`, không phải bản ghi `DichVu`. Nếu sau này nghiệp vụ quyết định “mỗi phí khám phải là một dịch vụ”, cần tạo/link `DichVu` tương ứng hoặc bổ sung FK `chuyen_khoa_id`; đây là quyết định thiết kế, không phải lỗi bắt buộc ở dữ liệu hiện tại.

## 3. Bảng audit các cột NULL

| Bảng | Cột | Tỷ lệ NULL | Phân loại | Nguyên nhân | Hướng xử lý |
|---|---:|---:|---|---|---|
| `chi_tiet_hoa_don` | `dich_vu_id` | 357/357 (100%) | `NULL_HOP_LE` | `PHI_KHAM` hiện lấy giá từ `chuyen_khoa`, Backend không dùng catalog `dich_vu`; `TIEN_THUOC` cũng không phải dịch vụ. FE dùng snapshot hóa đơn. | Giữ cột. Chỉ ghi khi có nghiệp vụ dịch vụ thật; nếu cần truy vết phí khám, xem xét FK `chuyen_khoa_id` ở đợt thiết kế riêng. |
| `chi_tiet_hoa_don` | `thuoc_id` | 155/357 (43,4%) | `CHUA_RO` | NULL đúng ở 130 dòng `PHI_KHAM`; nhưng **25/227 dòng `TIEN_THUOC`** cũng NULL, trong khi luồng cấp thuốc hiện tại phải ghi từng thuốc. | Giữ cột. Rà 25 dòng lịch sử và luồng tạo hóa đơn cũ; các dòng thuốc mới phải luôn có `thuoc_id`. |
| `chi_tiet_hoa_don` | `ghi_chu` | 357/357 (100%) | `NULL_HOP_LE` | Ghi chú dòng hóa đơn là tùy chọn; luồng hiện tại không yêu cầu FE nhập. | Giữ nếu cần ghi chú điều chỉnh sau này; không cần ghi ép. |
| `don_thuoc` | `nguoi_cap_thuoc_id` | 123/131 (93,9%) | `NULL_SAI_LOGIC` theo trạng thái | Trong 116 đơn `DA_CAP_THUOC`, có **112** đơn có `thoi_gian_cap_thuoc` nhưng thiếu người cấp. Repository hiện tại đã ghi người cấp, nên đây là dữ liệu lịch sử/luồng cũ thiếu. | Không xóa cột. Khi triển khai sửa dữ liệu, rà `cap-thuoc` để luôn gắn dược sĩ; cân nhắc script backfill có kiểm soát, không chạy trong audit. |
| `don_thuoc` | `thoi_gian_cap_thuoc` | 15/131 (11,5%) | `NULL_HOP_LE` | Đơn chưa được cấp hoặc đang xử lý không có thời gian cấp. | Giữ. Kiểm tra theo trạng thái thay vì tỷ lệ tổng. |
| `don_thuoc` | `ly_do_tu_choi`, `nguoi_tu_choi_id`, `thoi_gian_tu_choi` | 129/131 (98,5%) | `NULL_HOP_LE` | Chỉ có ý nghĩa với `TU_CHOI_CAP_THUOC`; Neon có 2 đơn từ chối và đã có dữ liệu. | Giữ cột theo trạng thái. |
| `don_thuoc` | `ghi_chu_bac_si` | 126/131 (96,2%) | `NULL_HOP_LE` | Ghi chú của bác sĩ không bắt buộc. | Giữ, không ép người dùng nhập. |
| `hoa_don` | `thoi_gian_thanh_toan` | 7/132 (5,3%) | `NULL_HOP_LE` | Chỉ hóa đơn chưa thanh toán mới NULL. | Giữ. |
| `thanh_toan` | `ma_giao_dich` | 9/125 (7,2%) | `NULL_HOP_LE` | Chuyển khoản thành công đã có mã; tiền mặt có thể không cần mã giao dịch ngân hàng. | Giữ, chỉ bắt buộc với phương thức chuyển khoản khi tích hợp cổng thanh toán. |
| `thanh_toan` | `nguoi_thu_tien_id` | 9/125 (7,2%) | `CHUA_RO` | Có một số giao dịch thành công thiếu người thu; giao dịch webhook/chuyển khoản tự động có thể hợp lệ, nhưng tiền mặt thiếu người thu cần rà riêng. | Phân loại theo `phuong_thuc`; chỉ ghi thiếu là lỗi với tiền mặt/thu trực tiếp. |
| `thanh_toan` | `ghi_chu` | 29/125 (23,2%) | `NULL_HOP_LE` | Ghi chú thanh toán tùy chọn. | Giữ. |
| `lich_hen` | `nguoi_xac_nhan_id`, `thoi_gian_xac_nhan` | 346/490 (70,6%) | `NULL_HOP_LE` | Lịch đặt ở nhà/chờ xác nhận/chưa được xử lý không có người xác nhận. | Giữ; kiểm tra các lịch `DA_XAC_NHAN` mà vẫn NULL khi triển khai kiểm soát dữ liệu. |
| `lich_hen` | `ly_do_tu_choi_hoac_huy` | 488/490 (99,6%) | `NULL_HOP_LE` | Chỉ dùng với lịch hủy/từ chối. | Giữ. |
| `lich_hen` | `bac_si_id` | 19/490 (3,9%) | `NULL_HOP_LE` | Một số lịch đang chờ lễ tân phân bác sĩ. | Giữ; không gán ép trước khi xác nhận. |
| `luot_kham` | `thoi_gian_hen`, `trieu_chung_ban_dau` | 32/154 (20,8%) | `NULL_HOP_LE` | Lượt khám tạo trực tiếp hoặc dữ liệu lịch sử có thể không đi qua lịch hẹn đầy đủ. | Giữ; không phải cột thường xuyên NULL. |
| `luot_kham` | `thoi_gian_hoan_tat` | 31/154 (20,1%) | `NULL_HOP_LE` | Lượt chưa hoàn tất không có thời gian hoàn tất. | Giữ. |
| `benh_nhan` | `nguoi_dung_id` | 76/80 (95%) | `NULL_HOP_LE` | Phần lớn là khách vãng lai/chưa có tài khoản đăng nhập; chỉ bệnh nhân đăng ký mới gắn `nguoi_dung`. | Giữ. Không tạo tài khoản bắt buộc cho khách vãng lai. |
| `benh_nhan` | `so_can_cuoc`, `ma_the_bao_hiem_y_te` | 53/80 (66,3%) mỗi cột | `NULL_HOP_LE` | CCCD/BHYT được thu thập khi có, không nên bắt buộc ở lần tiếp đón đầu. | Giữ. |
| `benh_nhan` | `nguoi_lien_he_khan_cap`, `so_dien_thoai_khan_cap` | 55/80 (68,8%) mỗi cột | `NULL_HOP_LE` | Thông tin liên hệ khẩn cấp tùy chọn; UI đã có chỗ cập nhật. | Giữ. |
| `benh_nhan` | `ghi_chu_di_ung`, `ghi_chu_tien_su_benh` | 72/80 (90%) mỗi cột | `COT_KHONG_SU_DUNG` | Không thấy BE/FE hiện tại đọc/ghi trực tiếp hai chuỗi tổng hợp này; nghiệp vụ đang dùng bảng `di_ung_benh_nhan` và `tien_su_benh` có cấu trúc. | Ứng viên xóa **sau** khi xác nhận không còn dữ liệu cần giữ/migration kế thừa. Hiện chưa xóa. |
| `benh_nhan` | `email` | 17/80 (21,3%) | `NULL_HOP_LE` | Khách vãng lai có thể chỉ cung cấp SĐT. | Giữ. |
| `di_ung_benh_nhan` | `thuoc_id` | 1/5 (20%) | `NULL_HOP_LE` | Có thể ghi nhận dị ứng theo hoạt chất/tên tự do, chưa chắc map được thuốc cụ thể. | Giữ; ưu tiên map hoạt chất khi biết. |
| `di_ung_benh_nhan` | `nguoi_ghi_nhan_id` | 3/5 (60%) | `CHUA_RO` | Một phần dữ liệu seed/lịch sử không có nhân sự ghi nhận; luồng tiếp đón mới có ngữ cảnh người dùng. | Giữ. Kiểm thử luồng thêm/sửa dị ứng thật để quyết định bắt buộc hóa ở dữ liệu mới. |
| `tien_su_benh` | `nguoi_ghi_nhan_id`, `ngay_ket_thuc` | 5/5 (100%) mỗi cột | `NULL_HOP_LE` | Tiền sử có thể do bệnh nhân tự khai/seed và bệnh mạn tính chưa có ngày kết thúc. | Giữ. Không suy ra lỗi chỉ từ NULL. |
| `tien_su_benh` | `ma_icd_10`, `ngay_bat_dau` | 1/5 (20%) mỗi cột | `NULL_HOP_LE` | Không phải hồ sơ nào cũng xác định ICD-10/ngày bắt đầu. | Giữ. |
| `ho_so_kham` | `noi_dung_chuyen_khoa` | 128/134 (95,5%) | `CHUA_RO` | Source khám bệnh hiện vẫn ghi/đọc JSON cũ làm fallback, đồng thời có bảng mới `chi_tiet_kham_chuyen_khoa`; Neon chưa có bản ghi mới để chứng minh FE gửi dữ liệu chuyên khoa. | Không xóa JSON cũ. Cần test một lượt khám theo khoa và xác nhận ghi được cả luồng mới theo kế hoạch. |
| `ho_so_kham` | `sinh_hieu` | 126/134 (94%) | `CHUA_RO` | Source có ghi `vitals`, nhưng phần lớn hồ sơ lịch sử chưa có dữ liệu sinh hiệu. | Giữ; kiểm thử form khám và không ép dữ liệu cũ. |
| `ho_so_kham` | `ghi_chu_bac_si`, `ngay_tai_kham` | 103/134 (76,9%); 113/134 (84,3%) | `NULL_HOP_LE` | Ghi chú và tái khám là tùy chỉ định. | Giữ. |
| `chi_tiet_kham_chuyen_khoa` | toàn bảng | 0 dòng | `CHUA_RO` | Prisma/Repository đã có upsert khi FE gửi `specialtyId` + `specialtyData`, nhưng Neon hiện chưa có dữ liệu xác nhận luồng end-to-end. | Không kết luận cột thừa. Test sau khi hoàn thiện form khám chuyên khoa. |
| `canh_bao_don_thuoc` | `hoat_chat_id`, `du_lieu_bang_chung` | 3/3 (100%) mỗi cột | `CHUA_RO` | Service an toàn đơn thuốc có khả năng ghi hoạt chất/evidence; các cảnh báo hiện tại có thể là cảnh báo mức thuốc, nhưng evidence trống cần kiểm thử. | Giữ. Rà payload cảnh báo khi tạo đơn mới trước khi coi là lỗi ghi. |
| `canh_bao_don_thuoc` | `nguoi_xu_ly_id`, `thoi_gian_xu_ly` | 1/3 (33,3%) mỗi cột | `NULL_HOP_LE` | Cảnh báo chưa xử lý/bỏ qua thì phải NULL. | Giữ. |
| `canh_bao_don_thuoc` | `ly_do_xu_ly` | 3/3 (100%) | `NULL_HOP_LE` | Bác sĩ chưa nhập lý do xử lý/bỏ qua cảnh báo. | Giữ. |
| `phan_cong_ca` | `ly_do_tu_choi`, `ghi_chu` | 6403/6403 (100%) mỗi cột | `COT_KHONG_SU_DUNG` | Không thấy luồng hiện tại dùng cơ chế từ chối phân ca hay ghi chú ở các trường này. | Ứng viên xóa sau khi xác nhận không có yêu cầu “từ chối ca”. Chưa migration. |
| `ban_giao_ca` | `thoi_gian_bat_dau_thuc_te`, `thoi_gian_ket_thuc_thuc_te`, `ghi_chu`, `ly_do_chenh_lech` | 2/2 (100%) | `CHUA_RO` | Service bàn giao ghi tiền, trạng thái, thời gian gửi; chưa ghi mốc bắt đầu/kết thúc ca thực tế. | Giữ tạm. Cần chốt có quản lý chấm công thực tế hay không trước khi xóa/triển khai ghi. |
| `ban_giao_ca` | `thoi_gian_ban_giao` | 1/2 (50%) | `NULL_HOP_LE` | Bản nháp chưa gửi bàn giao không có thời gian gửi. | Giữ. |
| `dich_vu` | `chuyen_khoa_id`, `thoi_gian_du_kien_phut` | 3/11 (27,3%) mỗi cột | `NULL_HOP_LE` | Có dịch vụ dùng chung toàn phòng khám; thời lượng có thể chưa cấu hình. | Giữ. Không phải NULL thường xuyên. |
| `don_vi_lam_viec` | `chuyen_khoa_id` | 3/11 (27,3%) | `NULL_HOP_LE` | Đơn vị Dược/Lễ tân không thuộc một chuyên khoa bác sĩ. | Giữ. |
| `lo_thuoc` | `ghi_chu` | 68/69 (98,6%) | `NULL_HOP_LE` | Ghi chú lô thuốc tùy chọn. | Giữ. |
| `thuoc_hoat_chat` | `ham_luong` | 67/136 (49,3%) | `NULL_HOP_LE` | Không phải mọi liên kết thuốc–hoạt chất có hàm lượng riêng (hoặc hàm lượng nằm ở tên thuốc). | Giữ; chuẩn hóa sau nếu cần dữ liệu dược lý chi tiết. |
| `hoat_chat` | `mo_ta` | 34/99 (34,3%) | `NULL_HOP_LE` | Mô tả catalog là tùy chọn. | Giữ. |
| `nguoi_dung` | `gioi_tinh`, `ngay_sinh`, `so_can_cuoc`, `dia_chi` | 67/67 (100%) mỗi cột | `CHUA_RO` | Repository hồ sơ có map các trường này sang `nguoi_dung`, nhưng Neon chưa có dữ liệu; có khả năng UI/profile theo role chỉ lưu hồ sơ chi tiết khác. | Không xóa vì source vẫn có write. Test cập nhật thông tin cá nhân từng role trước khi quyết định chuẩn hóa. |
| `nguoi_dung` | `lan_dang_nhap_cuoi` | 42/67 (62,7%) | `NULL_HOP_LE` | Tài khoản chưa từng đăng nhập chưa có mốc này. | Giữ. |
| `phien_chat` | `tieu_de`, `thoi_gian_ket_thuc` | 20/20 (100%) mỗi cột | `CHUA_RO` | Repository hỗ trợ title và đóng phiên, nhưng UI hiện chưa tạo title/đóng phiên; tất cả 20 phiên đang hoạt động. | Giữ. Chỉ xem xét xóa khi xác nhận không cần quản trị phiên/lịch sử chat. |
| `phien_chat` | `nguoi_dung_id`, `benh_nhan_id` | 18/20 (90%); 19/20 (95%) | `NULL_HOP_LE` | Phần lớn là khách vãng lai; một phiên bệnh nhân đăng nhập mới gắn hồ sơ/tài khoản. | Giữ. |
| `phien_chat` | `guest_token_hash` | 13/20 (65%) | `NULL_HOP_LE` | Bệnh nhân đã đăng nhập không cần định danh guest token. | Giữ. |
| `phien_chat` | `tom_tat_ngu_canh` | 9/20 (45%) | `NULL_HOP_LE` | Chỉ xuất hiện khi luồng AI cần/tạo tóm tắt hội thoại. | Giữ. |
| `tin_nhan_chat` | `ten_cong_cu`, `ma_lan_goi_cong_cu`, `metadata` | 60/60 (100%) mỗi cột | `NULL_HOP_LE` | Phase hiện tại chưa gọi tool/function; tin nhắn chat cơ bản không cần metadata công cụ. | Giữ để chuẩn bị phase tool calling; không ghi giả dữ liệu. |
| `lan_chay_ai` | `benh_nhan_id` | 20/25 (80%) | `NULL_HOP_LE` | Chat khách vãng lai hoặc hội thoại chung không có bệnh nhân. | Giữ. |
| `lan_chay_ai` | `ma_loi`, `thong_bao_loi` | 25/25 (100%) mỗi cột | `NULL_HOP_LE` | Các lần chạy AI hiện không lỗi. | Giữ để log lỗi khi phát sinh. |
| `xac_thuc_token` | toàn bảng | 0 dòng | `CHUA_RO` | Chức năng quên mật khẩu/xác thực email đang tạm hoãn theo kế hoạch, nên không có token. | Giữ bảng cho phase xác thực sau; không coi là bảng thừa. |
| `goi_y_thuoc_thay_the` | toàn bảng | 0 dòng | `CHUA_RO` | Bảng được chuẩn bị cho gợi ý thuốc đã duyệt; chưa bật luồng gợi ý/không seed giả. | Giữ theo kế hoạch AI diễn giải có kiểm soát. |

## 4. Các cột nên giữ

1. Toàn bộ snapshot hóa đơn: `chi_tiet_hoa_don.ma_muc`, `ten_muc`, `so_luong`, `don_gia`, `thanh_tien`; bao gồm cả khi FK nguồn có thể thay đổi sau này.
2. Các FK tùy chọn theo luồng: `benh_nhan.nguoi_dung_id`, `lich_hen.bac_si_id`, `lich_hen.nguoi_xac_nhan_id`, `chi_tiet_hoa_don.dich_vu_id`, `chi_tiet_hoa_don.thuoc_id`.
3. Các trường chỉ sinh ở trạng thái cuối: thời gian cấp thuốc, từ chối đơn, thời gian thanh toán, xác nhận lịch, hoàn tất lượt khám, bàn giao ca.
4. Dữ liệu an toàn/lịch sử: `di_ung_benh_nhan`, `tien_su_benh`, `canh_bao_don_thuoc`, `chi_tiet_kham_chuyen_khoa`, `xac_thuc_token`, `goi_y_thuoc_thay_the`.
5. Các trường định danh phiên chat cho Guest/Patient và log AI; nhiều NULL là hệ quả hợp lệ của hai loại người dùng khác nhau.

## 5. Cột Backend đang ghi thiếu hoặc cần rà rõ

| Mức độ | Vấn đề | Bằng chứng Neon | File BE cần rà nếu triển khai |
|---|---|---|---|
| P0 | Người cấp thuốc bị thiếu ở đơn đã cấp | 112/116 `DA_CAP_THUOC` có thời gian cấp nhưng `nguoi_cap_thuoc_id = NULL`. | `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts`, `BE/src/modules/cap-thuoc/cap-thuoc.service.ts` |
| P1 | 25 dòng tiền thuốc thiếu thuốc nguồn | 25/227 `TIEN_THUOC` có `thuoc_id = NULL`; luồng mới phải tạo từng thuốc. | `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts`, dữ liệu/seed tạo hóa đơn cũ |
| P1 | Hồ sơ chuyên khoa chưa chứng minh ghi được dữ liệu mới | `chi_tiet_kham_chuyen_khoa` chưa có dòng; `noi_dung_chuyen_khoa` 128/134 NULL. | `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`, `BE/src/modules/kham-benh/examinations.service.ts`, FE `TrangKhamBenh.tsx` |
| P1 | Cá nhân chung của `nguoi_dung` chưa có dữ liệu | 4 trường profile chung NULL 67/67 dù Repository có map dữ liệu. | `BE/src/modules/nguoi-dung/repositories/prisma-user.repository.ts`, Service/FE thông tin cá nhân theo role |
| P2 | Mốc giờ thực tế bàn giao không được ghi | 2/2 bàn giao thiếu giờ bắt đầu/kết thúc thực tế. | `BE/src/modules/ca-lam-viec/work-schedules.service.ts`, repository bàn giao ca nếu có |
| P2 | Metadata cảnh báo thuốc thiếu evidence trong bản ghi cũ | 3/3 `du_lieu_bang_chung` NULL. | `BE/src/modules/kham-benh/prescription-safety.service.ts` và API tạo/cập nhật cảnh báo |
| P2 | Tiêu đề/kết thúc phiên chat chưa được kích hoạt | 20/20 phiên không title/kết thúc. | `BE/src/modules/chat-ai/repositories/*`, `BE/src/modules/chat-ai/chat-ai.service.ts`, UI quản lý phiên chat |

## 6. Ứng viên xóa thật sự không dùng — chưa được xóa

Không có cột nào đủ bằng chứng để xóa ngay. Các ứng viên dưới đây chỉ được đưa vào backlog sau khi xác nhận nghiệp vụ và kiểm tra backup:

| Ứng viên | Lý do nghi ngờ | Điều kiện bắt buộc trước khi xóa |
|---|---|---|
| `benh_nhan.ghi_chu_di_ung` | Không thấy luồng hiện tại dùng; dị ứng cấu trúc đã ở `di_ung_benh_nhan`. | Xác nhận không còn dữ liệu legacy cần hiển thị; export/backup; migration chuyển dữ liệu cần thiết. |
| `benh_nhan.ghi_chu_tien_su_benh` | Không thấy luồng hiện tại dùng; tiền sử cấu trúc đã ở `tien_su_benh`. | Như trên. |
| `phan_cong_ca.ly_do_tu_choi`, `phan_cong_ca.ghi_chu` | 100% NULL và chưa có luồng từ chối/ghi chú phân ca. | Chốt nghiệp vụ không cần bác sĩ từ chối ca/chú thích ca. |
| `ban_giao_ca.thoi_gian_bat_dau_thuc_te`, `thoi_gian_ket_thuc_thuc_te` | Source hiện chưa ghi/đọc. | Chốt có hoặc không triển khai chấm công thực tế. Không xóa chỉ vì đang NULL. |
| `phien_chat.tieu_de` | UI hiện chưa dùng, nhưng Repository đã hỗ trợ và Admin có thể cần quản trị hội thoại. | Chốt không cần title cho lịch sử chat/AI trước khi xem xét. |

## 7. Các file BE dự kiến sửa nếu được duyệt triển khai

- `BE/src/modules/cap-thuoc/repositories/prisma-dispensing.repository.ts`: đảm bảo tất cả đơn `DA_CAP_THUOC` mới luôn lưu `nguoiCapThuocId`; kiểm tra tạo dòng `TIEN_THUOC` luôn có `thuocId`.
- `BE/src/modules/cap-thuoc/cap-thuoc.service.ts`: validate trạng thái/chủ thể trước khi cấp thuốc và phục vụ backfill có kiểm soát nếu được duyệt.
- `BE/src/modules/kham-benh/repositories/prisma-examination.repository.ts`: kiểm thử dữ liệu khám chuyên khoa mới, duy trì fallback JSON cũ cho đến khi có kế hoạch chuyển đổi.
- `BE/src/modules/kham-benh/examinations.service.ts`: kiểm tra payload dữ liệu chuyên khoa từ FE và quyền bác sĩ.
- `BE/src/modules/nguoi-dung/repositories/prisma-user.repository.ts`: kiểm thử/làm rõ một nguồn dữ liệu profile chung `nguoi_dung` và hồ sơ role.
- `BE/src/modules/ca-lam-viec/work-schedules.service.ts`: chỉ sửa nếu nghiệp vụ quyết định cần lưu giờ thực tế ca/bàn giao.
- `BE/src/modules/kham-benh/prescription-safety.service.ts`: chuẩn hóa evidence/hoạt chất của cảnh báo nếu kiểm thử tạo đơn mới tiếp tục cho ra NULL ngoài mong đợi.
- `BE/src/modules/chat-ai/chat-ai.service.ts` và repository chat: chỉ sửa khi bật title/đóng phiên/tool calling.
- `BE/src/modules/thanh-toan/thanh-toan.service.ts`: chỉ cần rà người thu tiền cho giao dịch tiền mặt/thu trực tiếp; không gán nhân viên giả cho webhook chuyển khoản.

## 8. Kết luận audit

1. `chi_tiet_hoa_don` đang dùng snapshot lịch sử đúng hướng. Không nên xóa `ma_muc`, `ten_muc`, `don_gia`; không thay `thuoc_id` bằng `don_thuoc_id`.
2. `dich_vu_id = NULL` 100% hiện phản ánh thiết kế “phí khám từ chuyên khoa”, chưa đủ căn cứ gọi là bug. Cần quyết định nghiệp vụ trước khi sửa.
3. Hai vấn đề dữ liệu cần ưu tiên khi được phép code là: người cấp thuốc bị thiếu ở đơn đã cấp và một phần dòng tiền thuốc thiếu FK thuốc.
4. Nhiều NULL khác là hợp lệ vì dữ liệu chưa đến trạng thái cuối, khách vãng lai không có tài khoản, hoặc trường ghi chú tùy chọn.
5. Không có migration, reset Neon, seed, refactor hay chỉnh sửa code nào đã được thực hiện trong lần audit này.
