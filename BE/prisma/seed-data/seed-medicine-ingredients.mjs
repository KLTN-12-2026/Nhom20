import { createSeedClient } from './seed-tien-ich.mjs';
import {
  MEDICINE_INGREDIENT_ROWS,
  MEDICINES_REQUIRING_LABEL_VERIFICATION,
} from './medicine-ingredient-data.mjs';

const prisma = createSeedClient();

try {
  const [medicines, ingredients] = await Promise.all([
    prisma.thuoc.findMany({ select: { id: true, maThuoc: true } }),
    prisma.hoatChat.findMany({ select: { id: true, maHoatChat: true } }),
  ]);
  const medicineByCode = new Map(medicines.map((medicine) => [medicine.maThuoc, medicine]));
  const ingredientByCode = new Map(ingredients.map((ingredient) => [ingredient.maHoatChat, ingredient]));

  await prisma.$transaction(async (transaction) => {
    for (const [medicineCode, ingredientCode, , strength] of MEDICINE_INGREDIENT_ROWS) {
      const medicine = medicineByCode.get(medicineCode);
      const ingredient = ingredientByCode.get(ingredientCode);
      if (!medicine || !ingredient) {
        throw new Error(`Thiếu thuốc hoặc hoạt chất cho liên kết ${medicineCode} - ${ingredientCode}`);
      }
      await transaction.thuocHoatChat.upsert({
        where: {
          thuocId_hoatChatId: {
            thuocId: medicine.id,
            hoatChatId: ingredient.id,
          },
        },
        update: { hamLuong: strength },
        create: {
          thuocId: medicine.id,
          hoatChatId: ingredient.id,
          hamLuong: strength,
        },
      });
    }
  });

  console.log(`Đã map ${MEDICINE_INGREDIENT_ROWS.length} liên kết thuốc - hoạt chất.`);
  if (MEDICINES_REQUIRING_LABEL_VERIFICATION.length > 0) {
    console.log(`Chưa map ${MEDICINES_REQUIRING_LABEL_VERIFICATION.join(', ')}: cần đối chiếu tờ hướng dẫn của đúng sản phẩm.`);
  } else {
    console.log('Tất cả thuốc seed đã được map hoạt chất.');
  }
} finally {
  await prisma.$disconnect();
}
