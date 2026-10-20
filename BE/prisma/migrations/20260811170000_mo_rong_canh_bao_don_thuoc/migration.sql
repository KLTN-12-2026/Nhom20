-- Bổ sung các loại cảnh báo nghiệp vụ cho luồng kê đơn theo dữ liệu kho.
ALTER TYPE "loai_canh_bao_don_thuoc" ADD VALUE IF NOT EXISTS 'THUOC_HET_HAN';
ALTER TYPE "loai_canh_bao_don_thuoc" ADD VALUE IF NOT EXISTS 'TON_KHO_KHONG_DU';
ALTER TYPE "loai_canh_bao_don_thuoc" ADD VALUE IF NOT EXISTS 'THIEU_LIEU_DUNG';
ALTER TYPE "loai_canh_bao_don_thuoc" ADD VALUE IF NOT EXISTS 'THIEU_HUONG_DAN';
