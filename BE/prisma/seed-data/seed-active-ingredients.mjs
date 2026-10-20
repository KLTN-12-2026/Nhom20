import { createSeedClient } from './seed-tien-ich.mjs';
import { MEDICINE_INGREDIENT_ROWS } from './medicine-ingredient-data.mjs';

const prisma = createSeedClient();

const ingredients = [
  ...new Map(
    MEDICINE_INGREDIENT_ROWS.map(([, code, name]) => [code, { code, name }]),
  ).values(),
];

try {
  // Đọc một lần, tránh giao dịch tương tác bị hết hạn khi seed nhiều hoạt chất qua Neon.
  const existingIngredients = await prisma.hoatChat.findMany({
    where: {
      OR: [
        { maHoatChat: { in: ingredients.map((item) => item.code) } },
        { tenHoatChat: { in: ingredients.map((item) => item.name) } },
      ],
    },
  });
  const byCode = new Map(existingIngredients.map((item) => [item.maHoatChat, item]));
  const byName = new Map(existingIngredients.map((item) => [item.tenHoatChat, item]));

  for (const ingredient of ingredients) {
    // CSDL cũ có thể đã lưu cùng hoạt chất với mã khác. Ưu tiên tái dùng bản ghi đó.
    const existingByCode = byCode.get(ingredient.code);
    const existingByName = byName.get(ingredient.name);
    if (existingByCode && existingByName && existingByCode.id !== existingByName.id) {
      throw new Error(
        `Trùng hai bản ghi hoạt chất cho ${ingredient.name}. Cần gộp thủ công trước khi seed.`,
      );
    }

    const existing = existingByCode ?? existingByName;
    const data = {
      maHoatChat: ingredient.code,
      tenHoatChat: ingredient.name,
      moTa: 'Hoạt chất chuẩn hóa phục vụ kiểm tra trùng hoạt chất và dị ứng.',
      trangThai: 'DANG_HOAT_DONG',
    };

    if (existing) {
      await prisma.hoatChat.update({ where: { id: existing.id }, data });
    } else {
      await prisma.hoatChat.create({ data });
    }
  }
  console.log(`Đã seed ${ingredients.length} hoạt chất chuẩn hóa.`);
} finally {
  await prisma.$disconnect();
}
