import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();

// Nguồn ứng viên nội bộ để Backend lọc trước khi Gemini xếp hạng; không tự thay thuốc trong đơn.
const ALTERNATIVE_ROWS = [
  {
    medicineToAvoidCode: 'MED-026',
    ingredientToAvoidCode: 'HC_ACETYLSALICYLIC_ACID',
    alternativeMedicineCode: 'MED-027',
    note:
      'Ứng viên tham khảo khi cần tránh Acid acetylsalicylic. Bác sĩ phải đối chiếu chẩn đoán, chống chỉ định và quyết định cuối cùng.',
  },
  {
    medicineToAvoidCode: 'MED-001',
    ingredientToAvoidCode: 'HC_AMOXICILLIN',
    alternativeMedicineCode: 'MED-017',
    note:
      'Ứng viên tham khảo khi cần tránh Amoxicillin. Bác sĩ phải đối chiếu chẩn đoán, chống chỉ định và quyết định cuối cùng.',
  },
];

try {
  const [medicines, ingredients, systemActor] = await Promise.all([
    prisma.thuoc.findMany({
      where: {
        maThuoc: {
          in: [
            ...new Set(
              ALTERNATIVE_ROWS.flatMap((item) => [
                item.medicineToAvoidCode,
                item.alternativeMedicineCode,
              ]),
            ),
          ],
        },
      },
      select: { id: true, maThuoc: true, tenThuoc: true },
    }),
    prisma.hoatChat.findMany({
      where: {
        maHoatChat: {
          in: ALTERNATIVE_ROWS.map((item) => item.ingredientToAvoidCode),
        },
      },
      select: { id: true, maHoatChat: true, tenHoatChat: true },
    }),
    prisma.nguoiDung.findFirst({
      where: {
        nguoiDungVaiTro: { some: { vaiTro: { maVaiTro: 'ADMIN' } } },
      },
      select: { id: true },
    }),
  ]);

  if (!systemActor) {
    throw new Error(
      'Thiếu tài khoản hệ thống để ghi nhận nguồn tạo dữ liệu ứng viên.',
    );
  }

  const medicineByCode = new Map(
    medicines.map((medicine) => [medicine.maThuoc, medicine]),
  );
  const ingredientByCode = new Map(
    ingredients.map((ingredient) => [ingredient.maHoatChat, ingredient]),
  );
  const effectiveDate = new Date('2026-08-01T00:00:00.000Z');
  const now = new Date();

  for (const item of ALTERNATIVE_ROWS) {
    const medicineToAvoid = medicineByCode.get(item.medicineToAvoidCode);
    const ingredientToAvoid = ingredientByCode.get(
      item.ingredientToAvoidCode,
    );
    const alternativeMedicine = medicineByCode.get(
      item.alternativeMedicineCode,
    );

    if (!medicineToAvoid || !ingredientToAvoid || !alternativeMedicine) {
      throw new Error(
        `Thiếu thuốc hoặc hoạt chất tham chiếu cho ${item.medicineToAvoidCode} → ${item.alternativeMedicineCode}.`,
      );
    }

    // Không tạo ứng viên nếu thuốc thay thế không có lô còn hạn và còn tồn thực tế.
    const validBatch = await prisma.loThuoc.findFirst({
      where: {
        thuocId: alternativeMedicine.id,
        trangThai: 'DANG_HOAT_DONG',
        hanDung: { gte: now },
        soLuongConLai: { gt: 0 },
      },
      select: { id: true, soLuongConLai: true, hanDung: true },
      orderBy: { hanDung: 'asc' },
    });

    if (!validBatch) {
      throw new Error(
        `${alternativeMedicine.tenThuoc} chưa có lô còn hạn và còn tồn; chưa thể dùng làm ứng viên.`,
      );
    }

    const existing = await prisma.goiYThuocThayThe.findFirst({
      where: {
        thuocCanTranhId: medicineToAvoid.id,
        hoatChatCanTranhId: ingredientToAvoid.id,
        thuocThayTheId: alternativeMedicine.id,
      },
      select: { id: true },
    });
    const data = {
      thuocCanTranhId: medicineToAvoid.id,
      hoatChatCanTranhId: ingredientToAvoid.id,
      thuocThayTheId: alternativeMedicine.id,
      ghiChuChuyenMon: item.note,
      trangThai: 'DANG_HOAT_DONG',
      nguoiDuyetId: systemActor.id,
      ngayHieuLuc: effectiveDate,
    };

    if (existing) {
      await prisma.goiYThuocThayThe.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.goiYThuocThayThe.create({ data });
    }

    console.log(
      `Đã chuẩn bị ứng viên: ${medicineToAvoid.tenThuoc} → ${alternativeMedicine.tenThuoc} (tồn lô gần nhất: ${validBatch.soLuongConLai}).`,
    );
  }

  console.log(
    `Hoàn thành ${ALTERNATIVE_ROWS.length} quan hệ thuốc thay thế có kiểm soát.`,
  );
} finally {
  await prisma.$disconnect();
}
