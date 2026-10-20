-- Chuẩn hóa dữ liệu lặp về đúng nguồn nghiệp vụ trước khi xóa cột cũ.
-- Migration này chỉ được áp dụng qua Prisma Migrate, không chạy DROP thủ công trên Neon.

-- Giữ lại hoạt chất cũ bằng quan hệ ThuocHoatChat trước khi bỏ cột text Thuoc.hoat_chat.
INSERT INTO "hoat_chat" ("ma_hoat_chat", "ten_hoat_chat", "created_at", "updated_at")
SELECT CONCAT('HC-LEGACY-', t."id"), TRIM(t."hoat_chat"), NOW(), NOW()
FROM "thuoc" t
WHERE t."hoat_chat" IS NOT NULL
  AND TRIM(t."hoat_chat") <> ''
ON CONFLICT ("ten_hoat_chat") DO NOTHING;

INSERT INTO "thuoc_hoat_chat" ("thuoc_id", "hoat_chat_id", "created_at", "updated_at")
SELECT t."id", hc."id", NOW(), NOW()
FROM "thuoc" t
JOIN "hoat_chat" hc ON hc."ten_hoat_chat" = TRIM(t."hoat_chat")
WHERE t."hoat_chat" IS NOT NULL
  AND TRIM(t."hoat_chat") <> ''
ON CONFLICT ("thuoc_id", "hoat_chat_id") DO NOTHING;

-- Chỉ sinh lô kế thừa khi thuốc còn tồn nhưng chưa có bất kỳ lô nào.
-- Nhờ vậy hạn dùng/số lượng cũ không mất và mọi tồn kho sau migration đều đi qua LoThuoc.
INSERT INTO "lo_thuoc" (
  "thuoc_id", "ma_lo", "han_dung", "nha_cung_cap", "gia_nhap",
  "so_luong_nhap", "so_luong_con_lai", "created_at", "updated_at"
)
SELECT
  t."id",
  CONCAT('LEGACY-', t."id"),
  t."han_su_dung",
  'Dữ liệu tồn kho trước chuẩn hóa',
  t."gia_nhap",
  t."so_luong_ton",
  t."so_luong_ton",
  NOW(),
  NOW()
FROM "thuoc" t
WHERE t."han_su_dung" IS NOT NULL
  AND t."so_luong_ton" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "lo_thuoc" l WHERE l."thuoc_id" = t."id"
  )
ON CONFLICT ("ma_lo") DO NOTHING;

-- Các cột dưới đây đều là bản sao của quan hệ chuẩn: LuotKham hoặc LoThuoc/ThuocHoatChat.
ALTER TABLE "ho_so_kham"
  DROP COLUMN IF EXISTS "benh_nhan_id",
  DROP COLUMN IF EXISTS "bac_si_id";

ALTER TABLE "don_thuoc"
  DROP COLUMN IF EXISTS "benh_nhan_id",
  DROP COLUMN IF EXISTS "bac_si_id";

ALTER TABLE "thuoc"
  DROP COLUMN IF EXISTS "hoat_chat",
  DROP COLUMN IF EXISTS "han_su_dung";
