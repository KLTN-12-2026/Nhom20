import { createSeedClient } from './seed-tien-ich.mjs';

const SPECIALTIES = [
  { code: '101', legacyCode: 'NOI_TONG_QUAT', name: 'Nội tổng quát', fee: 200000 },
  { code: '102', legacyCode: 'NHI_KHOA', name: 'Nhi khoa', fee: 250000 },
  { code: '103', legacyCode: 'DA_LIEU', name: 'Da liễu', fee: 300000 },
  { code: '104', legacyCode: 'TIM_MACH', name: 'Tim mạch', fee: 350000 },
  { code: '105', legacyCode: 'TAI_MUI_HONG', name: 'Tai Mũi Họng', fee: 280000 },
  { code: '106', legacyCode: 'SAN_PHU_KHOA', name: 'Sản Phụ khoa', fee: 350000 },
  { code: '107', legacyCode: 'MAT', name: 'Mắt', fee: 300000 },
  { code: '108', legacyCode: 'CO_XUONG_KHOP', name: 'Cơ Xương Khớp', fee: 320000 },
];

const prisma = createSeedClient();
try {
  for (const specialty of SPECIALTIES) {
    const existing = await prisma.chuyenKhoa.findFirst({
      where: {
        OR: [
          { maChuyenKhoa: specialty.code },
          { maChuyenKhoa: specialty.legacyCode },
          { tenChuyenKhoa: specialty.name },
        ],
      },
      orderBy: { id: 'asc' },
    });
    const data = {
      maChuyenKhoa: specialty.code,
      tenChuyenKhoa: specialty.name,
      phiKham: specialty.fee,
      moTa: `Khám và điều trị chuyên khoa ${specialty.name}.`,
      trangThai: 'DANG_HOAT_DONG',
    };
    if (existing) {
      await prisma.chuyenKhoa.update({ where: { id: existing.id }, data });
    } else {
      await prisma.chuyenKhoa.create({ data });
    }
  }
  console.log(`Đã seed ${SPECIALTIES.length} chuyên khoa`);
} finally {
  await prisma.$disconnect();
}
