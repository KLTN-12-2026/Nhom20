import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { config } from 'dotenv';

import { createSeedClient } from './seed-data/seed-utils.mjs';

config({ path: '.env', quiet: true });

const backupDirectory = join(process.cwd(), 'backups');
const datePart = new Date().toISOString().slice(0, 10);
const backupPath = join(backupDirectory, `smart-clinic-${datePart}.json`);

const prisma = createSeedClient();

try {
  // Sao lưu dữ liệu nghiệp vụ; cố ý không xuất mật khẩu, refresh token, token khách hoặc nội dung chat.
  const data = await Promise.all([
    prisma.chuyenKhoa.findMany(),
    prisma.bacSi.findMany(),
    prisma.benhNhan.findMany(),
    prisma.caLamViec.findMany(),
    prisma.phanCongCa.findMany(),
    prisma.lichHen.findMany(),
    prisma.luotKham.findMany(),
    prisma.hoSoKham.findMany(),
    prisma.thuoc.findMany(),
    prisma.hoatChat.findMany(),
    prisma.thuocHoatChat.findMany(),
    prisma.loThuoc.findMany(),
    prisma.diUngBenhNhan.findMany(),
    prisma.tienSuBenh.findMany(),
    prisma.donThuoc.findMany(),
    prisma.chiTietDonThuoc.findMany(),
    prisma.canhBaoDonThuoc.findMany(),
    prisma.chiTietCapThuoc.findMany(),
    prisma.giaoDichKho.findMany(),
    prisma.hoaDon.findMany(),
    prisma.chiTietHoaDon.findMany(),
    prisma.thanhToan.findMany(),
    prisma.danhGiaBacSi.findMany(),
  ]);

  const keys = [
    'chuyenKhoa', 'bacSi', 'benhNhan', 'caLamViec', 'phanCongCa', 'lichHen',
    'luotKham', 'hoSoKham', 'thuoc', 'hoatChat', 'thuocHoatChat', 'loThuoc',
    'diUngBenhNhan', 'tienSuBenh', 'donThuoc', 'chiTietDonThuoc',
    'canhBaoDonThuoc', 'chiTietCapThuoc', 'giaoDichKho', 'hoaDon',
    'chiTietHoaDon', 'thanhToan', 'danhGiaBacSi',
  ];
  const businessData = Object.fromEntries(keys.map((key, index) => [key, data[index]]));
  const payload = {
    generatedAt: new Date().toISOString(),
    scope: 'Dữ liệu nghiệp vụ Smart Clinic; không bao gồm mật khẩu, token, phiên chat hoặc nhật ký AI.',
    data: businessData,
  };

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Đã tạo backup dữ liệu: ${backupPath}`);
} finally {
  await prisma.$disconnect();
}
