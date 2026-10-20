import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();
const DAY_MS = 86_400_000;
const WEEK_COUNT = 5;
const DUTY_PAIRS = [[0, 3], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [0, 5], [1, 6], [0, 3], [1, 4]];

function currentMonday() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

function assignment({ person, roleId, shiftId, unitId, workDate, managerId }) {
  return {
    nguoiDungId: person.nguoiDungId,
    vaiTroId: roleId,
    caLamViecId: shiftId,
    donViLamViecId: unitId,
    ngayLamViec: workDate,
    nguon: 'TRUONG_DON_VI_PHAN_CONG',
    trangThai: 'DA_DUYET',
    nguoiSapXepId: managerId ?? null,
    nguoiDuyetId: managerId ?? null,
    thoiGianDuyet: new Date(),
  };
}

try {
  const staff = await prisma.nhanVien.findMany({
    where: { chucVu: 'LE_TAN_THU_NGAN', trangThai: 'DANG_HOAT_DONG' },
    orderBy: { maNhanVien: 'asc' },
  });
  const role = await prisma.vaiTro.findUnique({ where: { maVaiTro: 'RECEPTIONIST' } });
  const morningShift = await prisma.caLamViec.findFirst({ where: { maCa: 'SANG' } });
  const nightShift = await prisma.caLamViec.findFirst({ where: { maCa: 'TRUC_DEM' } });
  const unit = await prisma.donViLamViec.findUnique({ where: { maDonVi: 'BO_PHAN_TIEP_DON' } });
  if (!role || !morningShift || !nightShift || !unit) throw new Error('Thiếu cấu hình lịch Tiếp Đón / Thu ngân.');
  if (staff.length < 4) throw new Error('Bộ phận Tiếp Đón cần tối thiểu 4 nhân viên để phân trực.');
  const manager = await prisma.quanLyDonVi.findFirst({ where: { donViLamViecId: unit.id, trangThai: 'DANG_HOAT_DONG' } });

  const firstWeek = currentMonday();
  for (let weekIndex = 0; weekIndex < WEEK_COUNT; weekIndex += 1) {
    const weekStart = new Date(firstWeek.getTime() + weekIndex * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
    const rows = [];

    for (const [index, person] of staff.entries()) {
      const dutyDays = DUTY_PAIRS[index % DUTY_PAIRS.length];
      for (let day = 0; day < 7; day += 1) {
        const workDate = new Date(weekStart.getTime() + day * DAY_MS);
        const isRestAfterNightDuty = dutyDays.includes((day + 6) % 7);
        if (!isRestAfterNightDuty) {
          rows.push(assignment({ person, roleId: role.id, shiftId: morningShift.id, unitId: unit.id, workDate, managerId: manager?.nguoiDungId }));
        }
        if (dutyDays.includes(day)) {
          rows.push(assignment({ person, roleId: role.id, shiftId: nightShift.id, unitId: unit.id, workDate, managerId: manager?.nguoiDungId }));
        }
      }
    }

    await prisma.phanCongCa.deleteMany({
      where: { donViLamViecId: unit.id, ngayLamViec: { gte: weekStart, lte: weekEnd }, banGiaoCa: null },
    });
    await prisma.phanCongCa.createMany({ data: rows, skipDuplicates: true });
  }
  console.log(`Đã seed ${WEEK_COUNT} tuần lịch hành chính và trực đêm cho ${staff.length} nhân viên Tiếp Đón.`);
} finally {
  await prisma.$disconnect();
}
