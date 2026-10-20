import { createSeedClient } from './seed-tien-ich.mjs';

const SOURCE = 'SEED_DEVELOPMENT';
const NOTE_MARKER = '[SEED_DEVELOPMENT]';

// Dữ liệu phát triển có chủ đích: chỉ giúp test cảnh báo, không phải hồ sơ y tế đã xác minh.
const ALLERGY_FIXTURES = [
  {
    email: 'phanthiminhtruc@gmail.com',
    ingredientCode: 'HC_AMOXICILLIN',
    medicineCode: 'MED-001',
    agent: 'Amoxicillin',
    reaction: 'Nổi mẩn ngứa.',
    severity: 'TRUNG_BINH',
  },
  {
    email: 'nguyenthilan.patient@gmail.com',
    ingredientCode: 'HC_ACETYLSALICYLIC_ACID',
    medicineCode: 'MED-026',
    agent: 'Acid acetylsalicylic',
    reaction: 'Mề đay.',
    severity: 'TRUNG_BINH',
  },
  {
    email: 'tranvanminh.patient@gmail.com',
    ingredientCode: 'HC_DICLOFENAC',
    medicineCode: 'MED-052',
    agent: 'Diclofenac',
    reaction: 'Khó chịu đường tiêu hóa.',
    severity: 'NHE',
  },
  {
    email: 'lethihuong.patient@gmail.com',
    ingredientCode: 'HC_CHLORHEXIDINE',
    medicineCode: 'MED-047',
    agent: 'Chlorhexidine',
    reaction: 'Kích ứng da tại chỗ.',
    severity: 'NHE',
  },
];

const MEDICAL_HISTORY_FIXTURES = [
  {
    email: 'phanthiminhtruc@gmail.com',
    name: 'Viêm mũi dị ứng',
    icd10: 'J30.4',
    startedAt: '2024-04-01',
    isUnderTreatment: false,
  },
  {
    email: 'nguyenthilan.patient@gmail.com',
    name: 'Tăng huyết áp nguyên phát',
    icd10: 'I10',
    startedAt: '2023-11-15',
    isUnderTreatment: true,
  },
  {
    email: 'tranvanminh.patient@gmail.com',
    name: 'Trào ngược dạ dày - thực quản',
    icd10: 'K21.9',
    startedAt: '2022-06-10',
    isUnderTreatment: false,
  },
  {
    email: 'lethihuong.patient@gmail.com',
    name: 'Viêm da cơ địa',
    icd10: 'L20.9',
    startedAt: '2021-09-20',
    isUnderTreatment: false,
  },
];

const prisma = createSeedClient();

try {
  const [patients, medicines, ingredients] = await Promise.all([
    prisma.benhNhan.findMany({
      where: { email: { in: [...new Set(ALLERGY_FIXTURES.map((item) => item.email))] } },
      select: { id: true, email: true },
    }),
    prisma.thuoc.findMany({ select: { id: true, maThuoc: true } }),
    prisma.hoatChat.findMany({ select: { id: true, maHoatChat: true } }),
  ]);
  const patientByEmail = new Map(patients.map((patient) => [patient.email, patient]));
  const medicineByCode = new Map(medicines.map((medicine) => [medicine.maThuoc, medicine]));
  const ingredientByCode = new Map(ingredients.map((ingredient) => [ingredient.maHoatChat, ingredient]));

  if (patientByEmail.size !== 4) {
    throw new Error('Thiếu bệnh nhân test. Hãy chạy db:seed:patient trước khi seed dữ liệu y tế phát triển.');
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.diUngBenhNhan.deleteMany({
      where: { nguonThongTin: SOURCE, trangThaiXacNhan: 'CHUA_XAC_NHAN' },
    });
    await transaction.tienSuBenh.deleteMany({
      where: { moTa: { contains: NOTE_MARKER } },
    });

    for (const item of ALLERGY_FIXTURES) {
      const patient = patientByEmail.get(item.email);
      const medicine = medicineByCode.get(item.medicineCode);
      const ingredient = ingredientByCode.get(item.ingredientCode);
      if (!patient || !medicine || !ingredient) {
        throw new Error(`Thiếu dữ liệu tham chiếu cho dị ứng ${item.agent}`);
      }
      await transaction.diUngBenhNhan.create({
        data: {
          benhNhanId: patient.id,
          thuocId: medicine.id,
          hoatChatId: ingredient.id,
          tacNhanDiUng: item.agent,
          phanUng: item.reaction,
          mucDo: item.severity,
          trangThaiXacNhan: 'CHUA_XAC_NHAN',
          nguonThongTin: SOURCE,
          ghiChu: `${NOTE_MARKER} Dữ liệu giả lập để kiểm thử cảnh báo; bác sĩ phải xác minh trước khi dùng lâm sàng.`,
        },
      });
    }

    for (const item of MEDICAL_HISTORY_FIXTURES) {
      const patient = patientByEmail.get(item.email);
      if (!patient) throw new Error(`Thiếu bệnh nhân cho tiền sử ${item.name}`);
      await transaction.tienSuBenh.create({
        data: {
          benhNhanId: patient.id,
          tenBenh: item.name,
          maICD: item.icd10,
          ngayBatDau: new Date(`${item.startedAt}T00:00:00.000Z`),
          dangDieuTri: item.isUnderTreatment,
          trangThaiXacNhan: 'CHUA_XAC_NHAN',
          moTa: `${NOTE_MARKER} Dữ liệu giả lập để phát triển giao diện và cảnh báo; cần nhân viên y tế xác minh.`,
        },
      });
    }

    for (const patient of patients) {
      await transaction.benhNhan.update({
        where: { id: patient.id },
        data: {
          ghiChuDiUng: `${NOTE_MARKER} Có dữ liệu dị ứng giả lập chưa xác nhận.`,
          ghiChuTienSuBenh: `${NOTE_MARKER} Có dữ liệu tiền sử giả lập chưa xác nhận.`,
        },
      });
    }
  });

  console.log(`Đã seed ${ALLERGY_FIXTURES.length} dị ứng và ${MEDICAL_HISTORY_FIXTURES.length} tiền sử bệnh phát triển.`);
  console.log('Tất cả bản ghi được gắn SEED_DEVELOPMENT và CHUA_XAC_NHAN.');
} finally {
  await prisma.$disconnect();
}
