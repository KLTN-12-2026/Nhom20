import { createSeedClient } from './seed-tien-ich.mjs';

const SERVICES = [
  ['6001', '101', 'Khám Nội tổng quát', 'Khám, đánh giá sức khỏe tổng quát và tư vấn hướng điều trị ban đầu.'],
  ['6002', '102', 'Khám Nhi khoa', 'Khám và tư vấn sức khỏe dành cho trẻ em.'],
  ['6003', '103', 'Khám Da liễu', 'Khám các vấn đề về da, tóc và móng.'],
  ['6004', '104', 'Khám Tim mạch', 'Khám lâm sàng và tư vấn các vấn đề tim mạch.'],
  ['6005', '105', 'Khám Tai Mũi Họng', 'Khám các bệnh lý tai, mũi và họng.'],
  ['6006', '106', 'Khám Sản Phụ khoa', 'Khám và tư vấn sức khỏe sản phụ khoa.'],
  ['6007', '107', 'Khám Mắt', 'Khám và tư vấn các vấn đề về mắt, thị lực.'],
  ['6008', '108', 'Khám Cơ Xương Khớp', 'Khám các vấn đề cơ, xương, khớp và vận động.'],
];

const prisma = createSeedClient();
try {
  for (const [code, specialtyCode, name, description] of SERVICES) {
    const specialty = await prisma.chuyenKhoa.findUnique({ where: { maChuyenKhoa: specialtyCode } });
    if (!specialty) throw new Error(`Không tìm thấy chuyên khoa ${specialtyCode}`);
    await prisma.dichVu.upsert({
      where: { maDichVu: code },
      update: { tenDichVu: name, moTa: description, donGia: specialty.phiKham, chuyenKhoaId: specialty.id, thoiGianDuKienPhut: 30, trangThai: 'DANG_HOAT_DONG' },
      create: { maDichVu: code, tenDichVu: name, moTa: description, donGia: specialty.phiKham, chuyenKhoaId: specialty.id, thoiGianDuKienPhut: 30, trangThai: 'DANG_HOAT_DONG' },
    });
  }
  console.log(`Đã seed ${SERVICES.length} dịch vụ khám đang có trong hệ thống`);
} finally {
  await prisma.$disconnect();
}
