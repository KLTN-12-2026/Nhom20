import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();
const DAY_MS = 86_400_000;
const WEEK_COUNT = 5;
const dutyPairs = [[0, 3], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [0, 5], [1, 6], [0, 3], [1, 4]];

function currentMonday() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

try {
  const unit = await prisma.donViLamViec.findUnique({ where: { maDonVi: 'BO_PHAN_DUOC' } });
  const shift = await prisma.caLamViec.findUnique({ where: { maCa: 'TRUC_DEM' } });
  const role = await prisma.vaiTro.findUnique({ where: { maVaiTro: 'PHARMACIST' } });
  const staff = await prisma.nhanVien.findMany({ where: { chucVu: 'DUOC_SI', trangThai: 'DANG_HOAT_DONG' }, orderBy: { maNhanVien: 'asc' } });
  if (!unit || !shift || !role) throw new Error('Thiếu đơn vị Dược, ca trực hoặc vai trò PHARMACIST.');
  if (staff.length < 5) throw new Error('Bộ phận Dược cần tối thiểu 5 dược sĩ để phủ lịch trực.');

  const manager = await prisma.quanLyDonVi.findFirst({ where: { donViLamViecId: unit.id, trangThai: 'DANG_HOAT_DONG' } });
  const firstWeek = currentMonday();
  for (let weekIndex = 0; weekIndex < WEEK_COUNT; weekIndex += 1) {
    const weekStart = new Date(firstWeek.getTime() + weekIndex * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
    const rows = staff.flatMap((person, index) => dutyPairs[index % dutyPairs.length].map((offset) => ({
      nguoiDungId: person.nguoiDungId,
      vaiTroId: role.id,
      caLamViecId: shift.id,
      donViLamViecId: unit.id,
      ngayLamViec: new Date(weekStart.getTime() + offset * DAY_MS),
      nguon: 'TRUONG_DON_VI_PHAN_CONG',
      trangThai: 'DA_DUYET',
      nguoiSapXepId: manager?.nguoiDungId ?? null,
      nguoiDuyetId: manager?.nguoiDungId ?? null,
      thoiGianDuyet: new Date(),
    })));
    await prisma.phanCongCa.deleteMany({ where: { donViLamViecId: unit.id, ngayLamViec: { gte: weekStart, lte: weekEnd } } });
    await prisma.phanCongCa.createMany({ data: rows, skipDuplicates: true });
  }
  console.log(`Đã seed ${WEEK_COUNT} tuần trực đêm Dược cho ${staff.length} nhân viên.`);
} finally {
  await prisma.$disconnect();
}
