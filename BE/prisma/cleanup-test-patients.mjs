import { createSeedClient } from './seed-data/seed-utils.mjs';

const prisma = createSeedClient();

try {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      CREATE TEMP TABLE _test_patient_ids ON COMMIT DROP AS
      SELECT id FROM "benh_nhan"
      WHERE "ma_benh_nhan" LIKE 'BN-TEST%'
         OR "ho_ten" ILIKE '%BN Test Auto%'
         OR "ho_ten" ILIKE '%Bệnh Nhân Test%'
    `);

    const [{ count }] = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM _test_patient_ids`);

    await tx.$executeRawUnsafe(`DELETE FROM "thanh_toan" WHERE "hoa_don_id" IN (SELECT id FROM "hoa_don" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "chi_tiet_cap_thuoc" WHERE "don_thuoc_id" IN (SELECT id FROM "don_thuoc" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "chi_tiet_don_thuoc" WHERE "don_thuoc_id" IN (SELECT id FROM "don_thuoc" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "canh_bao_don_thuoc" WHERE "don_thuoc_id" IN (SELECT id FROM "don_thuoc" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "danh_gia_bac_si" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "phieu_hang_cho" WHERE "luot_kham_id" IN (SELECT id FROM "luot_kham" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "don_thuoc" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "ho_so_kham" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "chi_tiet_hoa_don" WHERE "hoa_don_id" IN (SELECT id FROM "hoa_don" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids))`);
    await tx.$executeRawUnsafe(`DELETE FROM "hoa_don" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "luot_kham" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "lich_hen" WHERE "benh_nhan_id" IN (SELECT id FROM _test_patient_ids)`);
    await tx.$executeRawUnsafe(`DELETE FROM "benh_nhan" WHERE id IN (SELECT id FROM _test_patient_ids)`);

    return count;
  });

  console.log(`Đã xoá ${result} bệnh nhân test trên Neon và toàn bộ dữ liệu phụ thuộc.`);
} finally {
  await prisma.$disconnect();
}
