import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();
const START = new Date('2026-08-11T00:00:00.000Z');
const END = new Date('2027-01-01T00:00:00.000Z');
const DAY = 86_400_000;
const SLOTS = [480, 510, 540, 570, 600, 630, 780, 810, 840, 870, 900, 930];
const DUTY_OFFSETS = [[0, 2], [1, 5], [3, 5], [4, 6], [4, 6]];
const FOLLOW_UPS = ['2026-08-11', '2026-08-12', '2026-08-13', '2026-08-18', '2026-08-25', '2026-09-03', '2026-09-14', '2026-09-25', '2026-10-06', '2026-10-17', '2026-10-28', '2026-11-08', '2026-11-19', '2026-11-30', '2026-12-11', '2026-12-22', '2026-12-31'];
const REASONS = ['Khám sức khỏe định kỳ', 'Đau đầu và mệt mỏi kéo dài', 'Ho, nghẹt mũi và đau họng', 'Đau lưng khi vận động', 'Kiểm tra thị lực định kỳ', 'Ngứa da và nổi mẩn nhẹ', 'Theo dõi huyết áp', 'Tư vấn sức khỏe phụ khoa'];

const key = (date) => date.toISOString().slice(0, 10);
const plusDays = (date, amount) => new Date(date.getTime() + amount * DAY);
const timeOn = (date, minute) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Math.floor(minute / 60), minute % 60));
const mondayOf = (date) => {
  const result = new Date(date);
  const weekday = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - weekday + 1);
  return result;
};
const targetOf = (index) => index === 0 ? 8 : index === 1 || index === 2 ? 7 : [4, 0, 4, 2, 0, 4, 3, 3, 0, 2][index % 10];
const chunk = (rows, size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));

async function getContext() {
  const [morning, night, doctorRole, receptionist, doctors] = await Promise.all([
    prisma.caLamViec.findUnique({ where: { maCa: 'SANG' } }),
    prisma.caLamViec.findUnique({ where: { maCa: 'TRUC_DEM' } }),
    prisma.vaiTro.findUnique({ where: { maVaiTro: 'DOCTOR' } }),
    prisma.nguoiDung.findFirst({ where: { nguoiDungVaiTro: { some: { vaiTro: { maVaiTro: 'RECEPTIONIST' } } } }, select: { id: true } }),
    prisma.bacSi.findMany({ where: { trangThai: 'DANG_HOAT_DONG' }, include: { chuyenKhoa: { include: { donViLamViec: true } } }, orderBy: [{ chuyenKhoaId: 'asc' }, { maBacSi: 'asc' }] }),
  ]);
  if (!morning || !night || !doctorRole || !receptionist || !doctors.length || doctors.some((item) => !item.chuyenKhoa.donViLamViec)) throw new Error('Thiếu cấu hình ca làm, nhân sự, đơn vị hoặc vai trò cần thiết.');
  return { morning, night, doctorRole, receptionist, doctors };
}

async function ensureSchedules(context) {
  const doctorUserIds = context.doctors.map((item) => item.nguoiDungId);
  const existing = await prisma.phanCongCa.findMany({ where: { nguoiDungId: { in: doctorUserIds }, ngayLamViec: { gte: plusDays(START, -1), lt: END }, caLamViecId: { in: [context.morning.id, context.night.id] } }, select: { nguoiDungId: true, caLamViecId: true, ngayLamViec: true } });
  const existingKeys = new Set(existing.map((item) => `${item.nguoiDungId}:${item.caLamViecId}:${key(item.ngayLamViec)}`));
  const nightKeys = new Set(existing.filter((item) => item.caLamViecId === context.night.id).map((item) => `${item.nguoiDungId}:${key(item.ngayLamViec)}`));
  const groupBySpecialty = new Map();
  for (const doctor of context.doctors) groupBySpecialty.set(doctor.chuyenKhoaId, [...(groupBySpecialty.get(doctor.chuyenKhoaId) ?? []), doctor]);
  const unitIds = [...new Set(context.doctors.map((item) => item.chuyenKhoa.donViLamViec.id))];
  const managers = await prisma.quanLyDonVi.findMany({ where: { donViLamViecId: { in: unitIds }, trangThai: 'DANG_HOAT_DONG' }, select: { donViLamViecId: true, nguoiDungId: true } });
  const managerMap = new Map(managers.map((item) => [item.donViLamViecId, item.nguoiDungId]));
  const nightRows = [];
  for (const group of groupBySpecialty.values()) {
    const unitId = group[0].chuyenKhoa.donViLamViec.id;
    for (let date = new Date(START); date < END; date = plusDays(date, 1)) {
      const offset = Math.round((date.getTime() - mondayOf(date).getTime()) / DAY);
      for (const [index, doctor] of group.entries()) {
        if (!DUTY_OFFSETS[index % DUTY_OFFSETS.length].includes(offset)) continue;
        nightKeys.add(`${doctor.nguoiDungId}:${key(date)}`);
        const uniqueKey = `${doctor.nguoiDungId}:${context.night.id}:${key(date)}`;
        if (existingKeys.has(uniqueKey)) continue;
        nightRows.push({ nguoiDungId: doctor.nguoiDungId, vaiTroId: context.doctorRole.id, caLamViecId: context.night.id, donViLamViecId: unitId, ngayLamViec: date, nguon: 'TRUONG_DON_VI_PHAN_CONG', trangThai: 'DA_DUYET', nguoiSapXepId: managerMap.get(unitId) ?? null, nguoiDuyetId: managerMap.get(unitId) ?? null, thoiGianDuyet: new Date() });
      }
    }
  }
  const morningRows = [];
  for (const doctor of context.doctors) {
    const unitId = doctor.chuyenKhoa.donViLamViec.id;
    for (let date = new Date(START); date < END; date = plusDays(date, 1)) {
      if (nightKeys.has(`${doctor.nguoiDungId}:${key(plusDays(date, -1))}`)) continue;
      const uniqueKey = `${doctor.nguoiDungId}:${context.morning.id}:${key(date)}`;
      if (existingKeys.has(uniqueKey)) continue;
      morningRows.push({ nguoiDungId: doctor.nguoiDungId, vaiTroId: context.doctorRole.id, caLamViecId: context.morning.id, donViLamViecId: unitId, ngayLamViec: date, nguon: 'TRUONG_DON_VI_PHAN_CONG', trangThai: 'DA_DUYET', nguoiSapXepId: managerMap.get(unitId) ?? null, nguoiDuyetId: managerMap.get(unitId) ?? null, thoiGianDuyet: new Date() });
    }
  }
  for (const rows of [nightRows, morningRows]) for (const batch of chunk(rows)) await prisma.phanCongCa.createMany({ data: batch, skipDuplicates: true });
  return { morning: morningRows.length, night: nightRows.length };
}

async function fillPatientFields() {
  const rows = await prisma.benhNhan.findMany({ where: { diaChi: null }, select: { id: true } });
  await Promise.all(rows.map((item) => prisma.benhNhan.update({ where: { id: item.id }, data: { diaChi: 'Đà Nẵng, Việt Nam' } })));
  return rows.length;
}

async function seedAppointments(context) {
  const [patients, schedules, existingAppointments, existingTickets] = await Promise.all([
    prisma.benhNhan.findMany({ orderBy: { id: 'asc' } }),
    prisma.phanCongCa.findMany({ where: { ngayLamViec: { gte: START, lt: END }, caLamViecId: context.morning.id, trangThai: 'DA_DUYET', vaiTro: { maVaiTro: 'DOCTOR' } }, select: { ngayLamViec: true, nguoiDungId: true } }),
    prisma.lichHen.findMany({ where: { ngayHen: { gte: START, lt: END } }, select: { ngayHen: true, bacSiId: true, gioBatDau: true } }),
    prisma.phieuHangCho.findMany({ where: { ngayXepHang: START }, select: { chuyenKhoaId: true, soThuTu: true } }),
  ]);
  const doctorByUser = new Map(context.doctors.map((item) => [item.nguoiDungId, item]));
  const available = new Map();
  for (const assignment of schedules) { const doctor = doctorByUser.get(assignment.nguoiDungId); if (doctor) available.set(key(assignment.ngayLamViec), [...(available.get(key(assignment.ngayLamViec)) ?? []), doctor]); }
  const occupied = new Set(existingAppointments.filter((item) => item.bacSiId).map((item) => `${key(item.ngayHen)}:${item.bacSiId}:${item.gioBatDau.toISOString().slice(11, 16)}`));
  const ticketNumbers = new Map();
  for (const ticket of existingTickets) ticketNumbers.set(ticket.chuyenKhoaId, Math.max(ticketNumbers.get(ticket.chuyenKhoaId) ?? 0, ticket.soThuTu));
  let created = 0; let skippedDays = 0;
  const todayStatus = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_CHECK_IN', 'CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_CHECK_IN', 'CHO_XAC_NHAN', 'DA_XAC_NHAN'];
  for (let index = 0, date = new Date(START); date < END; date = plusDays(date, 1), index += 1) {
    const target = targetOf(index); if (!target) continue;
    const doctors = available.get(key(date)) ?? []; if (!doctors.length) { skippedDays += 1; continue; }
    for (let sequence = 0; sequence < target; sequence += 1) {
      const code = `LH-${key(date).replaceAll('-', '')}-${String(sequence + 1).padStart(3, '0')}`;
      if (await prisma.lichHen.findUnique({ where: { maLichHen: code }, select: { id: true } })) continue;
      const doctor = doctors[(index * 3 + sequence * 5) % doctors.length]; const start = timeOn(date, SLOTS[(index + sequence * 2) % SLOTS.length]);
      const occupancyKey = `${key(date)}:${doctor.id}:${start.toISOString().slice(11, 16)}`; if (occupied.has(occupancyKey)) continue;
      const status = index === 0 ? todayStatus[sequence] : 'CHO_XAC_NHAN'; const reason = REASONS[(index + sequence) % REASONS.length];
      const appointment = await prisma.lichHen.create({ data: { maLichHen: code, benhNhanId: patients[(index * 7 + sequence * 11) % patients.length].id, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, ngayHen: date, gioBatDau: start, gioKetThuc: new Date(start.getTime() + 1_800_000), nguonDatLich: 'KHACH_VANG_LAI', lyDoKham: reason, trieuChungBanDau: reason, ghiChu: 'Lịch hẹn được tạo để kiểm thử luồng điều phối và tiếp đón.', trangThai: status, ...(status !== 'CHO_XAC_NHAN' ? { nguoiXacNhanId: context.receptionist.id, thoiGianXacNhan: new Date(start.getTime() - 1_800_000) } : {}) } });
      if (status === 'DA_CHECK_IN') {
        const number = (ticketNumbers.get(doctor.chuyenKhoaId) ?? 0) + 1; ticketNumbers.set(doctor.chuyenKhoaId, number);
        const visit = await prisma.luotKham.create({ data: { lichHenId: appointment.id, maLuotKham: `LK-${key(date).replaceAll('-', '')}-${String(500 + sequence).padStart(3, '0')}`, benhNhanId: appointment.benhNhanId, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, hinhThucKham: 'DAT_LICH_TRUOC', thoiGianHen: start, lyDoKham: reason, trieuChungBanDau: reason, trangThai: 'DA_DANG_KY', thoiGianDangKy: new Date(start.getTime() - 900_000) } });
        await prisma.phieuHangCho.create({ data: { luotKhamId: visit.id, soThuTu: number, maSoThuTu: `${doctor.chuyenKhoa.maChuyenKhoa}-${String(number).padStart(3, '0')}`, ngayXepHang: date, chuyenKhoaId: doctor.chuyenKhoaId, trangThai: 'CHO_GOI', nguoiXacNhanId: context.receptionist.id } });
      }
      occupied.add(occupancyKey); created += 1;
    }
  }
  return { created, skippedDays };
}

async function seedFollowUps() {
  const records = await prisma.hoSoKham.findMany({ where: { trangThai: 'DA_HOAN_TAT' }, orderBy: { id: 'asc' }, take: FOLLOW_UPS.length, select: { id: true } });
  await Promise.all(records.map((item, index) => prisma.hoSoKham.update({ where: { id: item.id }, data: { ngayTaiKham: new Date(`${FOLLOW_UPS[index]}T00:00:00.000Z`) } })));
  return records.length;
}

try {
  const context = await getContext();
  const [schedules, addressFields] = await Promise.all([ensureSchedules(context), fillPatientFields()]);
  const [appointments, followUps] = await Promise.all([seedAppointments(context), seedFollowUps()]);
  console.log(JSON.stringify({ schedules, addressFields, appointments, followUps }, null, 2));
} finally { await prisma.$disconnect(); }
