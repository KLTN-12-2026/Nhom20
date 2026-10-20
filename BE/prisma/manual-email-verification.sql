DO $$
BEGIN
  CREATE TYPE "loai_xac_thuc_token" AS ENUM ('XAC_MINH_EMAIL', 'DAT_LAI_MAT_KHAU');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "kenh_xac_thuc_token" AS ENUM ('EMAIL', 'SMS_MOCK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "nguoi_dung"
  ADD COLUMN IF NOT EXISTS "email_da_xac_minh" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "xac_thuc_token" (
  "id" SERIAL PRIMARY KEY,
  "nguoi_dung_id" INTEGER NOT NULL,
  "loai" "loai_xac_thuc_token" NOT NULL,
  "kenh" "kenh_xac_thuc_token" NOT NULL,
  "doi_tuong" VARCHAR(255) NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL UNIQUE,
  "het_han_at" TIMESTAMP(3) NOT NULL,
  "da_su_dung_at" TIMESTAMP(3),
  "so_lan_thu" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xac_thuc_token_nguoi_dung_id_fkey"
    FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "xac_thuc_token_nguoi_dung_id_loai_idx"
  ON "xac_thuc_token" ("nguoi_dung_id", "loai");
CREATE INDEX IF NOT EXISTS "xac_thuc_token_het_han_at_idx"
  ON "xac_thuc_token" ("het_han_at");
