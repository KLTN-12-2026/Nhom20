import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();
const DAY_MS = 86_400_000;
const PAST_WEEK_COUNT = 1;
const WEEK_COUNT = 6;
const MIN_DOCTORS_PER_SPECIALTY = 7;
const MIN_NIGHT_STAFF = 2;
const MIN_DAY_STAFF = [2, 2, 2, 2, 3, 3, 3];
const dutyPairs = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 0], [6, 1]];

function currentMonday() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

try {
  const shift = await prisma.caLamViec.findUnique({ where: { maCa: 'TRUC_DEM' } });
  const role = await prisma.vaiTro.findUnique({ where: { maVaiTro: 'DOCTOR' } });
  const doctors = await prisma.bacSi.findMany({
    where: { trangThai: 'DANG_HOAT_DONG' },
    include: { chuyenKhoa: { include: { donViLamViec: true } } },
    orderBy: [{ chuyenKhoaId: 'asc' }, { maBacSi: 'asc' }],
  });
  if (!shift || !role) throw new Error('Thiếu ca trực hoặc vai trò DOCTOR.');

  const groups = new Map();
  for (const doctor of doctors) {
    const group = groups.get(doctor.chuyenKhoaId) ?? [];
    group.push(doctor);
    groups.set(doctor.chuyenKhoaId, group);
  }

  // Phủ cả tuần trước để lịch đang công bố không bị thiếu dữ liệu ở mép khoảng seed.
  const firstWeek = new Date(currentMonday().getTime() - PAST_WEEK_COUNT * 7 * DAY_MS);
  for (const [, group] of groups) {
    const unit = group[0].chuyenKhoa.donViLamViec;
    if (!unit) continue;
    if (group.length < MIN_DOCTORS_PER_SPECIALTY) {
      throw new Error(`${unit.tenDonVi} chỉ có ${group.length} bác sĩ; cần tối thiểu 7 để phủ đủ ca.`);
    }
    const manager = await prisma.quanLyDonVi.findFirst({ where: { donViLamViecId: unit.id, trangThai: 'DANG_HOAT_DONG' } });

    for (let weekIndex = 0; weekIndex < WEEK_COUNT; weekIndex += 1) {
      const weekStart = new Date(firstWeek.getTime() + weekIndex * 7 * DAY_MS);
      const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
      // Giữ mẫu trực ổn định giữa các tuần để không phát sinh ca Chủ nhật - Thứ 2 liền nhau.
      const rows = group.flatMap((doctor, index) => dutyPairs[index % dutyPairs.length].map((offset) => ({
        nguoiDungId: doctor.nguoiDungId,
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
      const nightCoverage = Array(7).fill(0);
      rows.forEach((row) => {
        const dayIndex = Math.round((row.ngayLamViec.getTime() - weekStart.getTime()) / DAY_MS);
        nightCoverage[dayIndex] += 1;
      });
      const dayCoverage = nightCoverage.map((_, dayIndex) => (
        dayIndex === 0 ? group.length : group.length - nightCoverage[dayIndex - 1]
      ));
      if (nightCoverage.some((count) => count < MIN_NIGHT_STAFF)) {
        throw new Error(`${unit.tenDonVi} chưa đủ 2 bác sĩ trực đêm mỗi ngày.`);
      }
      if (dayCoverage.some((count, dayIndex) => count < MIN_DAY_STAFF[dayIndex])) {
        throw new Error(`${unit.tenDonVi} chưa đủ bác sĩ ca ngày theo quy tắc trong tuần.`);
      }

      // Chỉ thay lịch trực đêm, không xóa nhầm các phân công ca ngày đang có.
      await prisma.phanCongCa.deleteMany({ where: { donViLamViecId: unit.id, caLamViecId: shift.id, ngayLamViec: { gte: weekStart, lte: weekEnd } } });
      await prisma.phanCongCa.createMany({ data: rows, skipDuplicates: true });
    }
    console.log(`Đã seed ${WEEK_COUNT} tuần trực đêm cho ${unit.tenDonVi} (${group.length} bác sĩ).`);
  }
} finally {
  await prisma.$disconnect();
}
