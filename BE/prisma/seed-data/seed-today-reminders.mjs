import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();

async function seedData() {
  try {
    console.log("Seeding follow up reminders for today and tomorrow...");
    const records = await prisma.hoSoKham.findMany({
      where: {
        trangThai: 'DA_HOAN_TAT',
      },
      take: 10,
    });

    let i = 0;
    for (const record of records) {
      // 5 for today (2026-08-28), 5 for tomorrow (2026-08-29)
      const dateStr = i < 5 ? '2026-08-28T00:00:00.000Z' : '2026-08-29T00:00:00.000Z';
      await prisma.hoSoKham.update({
        where: { id: record.id },
        data: { ngayTaiKham: new Date(dateStr) },
      });
      i++;
    }
    console.log("Done seeding 10 follow-ups for today and tomorrow.");
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
