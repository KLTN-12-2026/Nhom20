import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();

const REVIEWS = [
  "Bác sĩ khám rất kỹ, tận tình giải thích từng triệu chứng.",
  "Dịch vụ tốt, bác sĩ nhẹ nhàng và chuyên môn cao.",
  "Khám nhanh nhưng vẫn đầy đủ, cho thuốc uống mau khỏi.",
  "Mình rất hài lòng về thái độ phục vụ của bác sĩ.",
  "Tuyệt vời! Bác sĩ rất có tâm.",
  "Cảm ơn bác sĩ đã điều trị tận tình.",
  "Bác sĩ tư vấn chế độ ăn uống và sinh hoạt rất hữu ích.",
  "Rất hài lòng, sẽ quay lại khám nếu có vấn đề.",
  "Thái độ chuyên nghiệp, vui vẻ. Rất đáng tin cậy.",
  "Bác sĩ giỏi, chỉ định xét nghiệm đúng bệnh.",
  "Mình rất yên tâm khi được bác sĩ khám.",
  "Bác sĩ khám nhẹ nhàng, không làm bệnh nhân lo lắng.",
  "Bác sĩ giải thích đơn thuốc rất chi tiết.",
  "Thời gian khám nhanh, không phải chờ lâu.",
  "Bác sĩ dặn dò rất kỹ, cảm ơn bác sĩ nhiều.",
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData() {
  try {
    console.log("Bắt đầu seed thêm Đánh Giá Bác Sĩ và Ngày Tái Khám...");

    // 1. Seed thêm Đánh giá bác sĩ
    const finishedVisits = await prisma.luotKham.findMany({
      where: {
        trangThai: 'DA_HOAN_TAT',
        danhGiaBacSi: null, // Chỉ lấy các lượt khám chưa có đánh giá
      },
      take: 50, // Seed 50 đánh giá
    });

    let reviewCount = 0;
    for (const visit of finishedVisits) {
      // 80% là 5 sao, 20% là 4 sao
      const rating = Math.random() > 0.2 ? 5 : 4;
      const comment = REVIEWS[getRandomInt(0, REVIEWS.length - 1)];
      
      await prisma.danhGiaBacSi.create({
        data: {
          luotKhamId: visit.id,
          benhNhanId: visit.benhNhanId,
          bacSiId: visit.bacSiId,
          soSao: rating,
          noiDung: comment,
          trangThai: 'DA_HIEN_THI', // Chuyển luôn sang trạng thái đã hiển thị cho nhanh
        },
      });
      reviewCount++;
    }
    console.log(`Đã seed thêm ${reviewCount} đánh giá bác sĩ.`);

    // 2. Seed thêm Ngày Tái Khám (từ 28/8 - 31/12/2026)
    const startDate = new Date('2026-08-28T00:00:00.000Z');
    const endDate = new Date('2026-12-31T23:59:59.000Z');

    const recordsWithoutFollowUp = await prisma.hoSoKham.findMany({
      where: {
        trangThai: 'DA_HOAN_TAT',
      },
      take: 60, // Lấy 60 hồ sơ khám để cập nhật ngày tái khám
    });

    let reminderCount = 0;
    for (const record of recordsWithoutFollowUp) {
      const randomFollowUpDate = getRandomDate(startDate, endDate);
      // Chỉ lấy phần ngày (set giờ về 0)
      randomFollowUpDate.setUTCHours(0, 0, 0, 0);

      await prisma.hoSoKham.update({
        where: { id: record.id },
        data: { ngayTaiKham: randomFollowUpDate },
      });
      reminderCount++;
    }
    console.log(`Đã seed/cập nhật thêm ${reminderCount} ngày nhắc tái khám từ 28/8 đến 31/12/2026.`);

  } catch (error) {
    console.error("Lỗi khi seed data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
