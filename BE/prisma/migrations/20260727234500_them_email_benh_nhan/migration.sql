ALTER TABLE "benh_nhan"
ADD COLUMN "email" VARCHAR(255);

CREATE INDEX "benh_nhan_email_idx" ON "benh_nhan"("email");
