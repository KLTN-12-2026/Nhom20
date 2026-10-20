import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData() {
  try {
    console.log("Seeding follow up reminders from Aug 28, 2026 to Dec 31, 2026...");
    
    // Find finished records that don't have a follow up date yet
    const records = await prisma.hoSoKham.findMany({
      where: {
        trangThai: 'DA_HOAN_TAT',
        ngayTaiKham: null
      },
      take: 150, // Seed 150 more records
    });

    const startDate = new Date('2026-08-28T00:00:00.000Z');
    const endDate = new Date('2026-12-31T23:59:59.000Z');

    let i = 0;
    for (const record of records) {
      const randomDate = getRandomDate(startDate, endDate);
      randomDate.setUTCHours(0, 0, 0, 0);

      await prisma.hoSoKham.update({
        where: { id: record.id },
        data: { ngayTaiKham: randomDate },
      });
      i++;
    }
    console.log(`Done seeding ${i} follow-ups in the range 28/08/2026 to 31/12/2026.`);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
