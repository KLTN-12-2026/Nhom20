import { createSeedClient } from './seed-tien-ich.mjs';

const prisma = createSeedClient();

const CASES = [
  { email: 'phanthiminhtruc@gmail.com', visitCode: 'LK-REVIEW-TRUC-01', appointmentCode: 'LH-REVIEW-TRUC-01', invoiceCode: 'HD-REVIEW-TRUC-01', prescriptionCode: 'DT-REVIEW-TRUC-01', paid: true, date: new Date('2026-08-01T08:30:00.000Z'), reason: 'Đau đầu kéo dài, mất ngủ nhẹ', diagnosis: 'Đau đầu do căng thẳng', icd: 'R51' },
  { email: 'phanthiminhtruc@gmail.com', visitCode: 'LK-REVIEW-TRUC-02', appointmentCode: 'LH-REVIEW-TRUC-02', invoiceCode: 'HD-REVIEW-TRUC-02', prescriptionCode: 'DT-REVIEW-TRUC-02', paid: true, date: new Date('2026-08-03T09:00:00.000Z'), reason: 'Khám sức khỏe định kỳ', diagnosis: 'Theo dõi sức khỏe tổng quát', icd: 'Z00.0' },
  { email: 'nguyenthilan.patient@gmail.com', visitCode: 'LK-REVIEW-LAN-01', appointmentCode: 'LH-REVIEW-LAN-01', invoiceCode: 'HD-REVIEW-LAN-01', prescriptionCode: 'DT-REVIEW-LAN-01', paid: true, date: new Date('2026-08-02T10:00:00.000Z'), reason: 'Đau họng, ho khan', diagnosis: 'Viêm họng cấp', icd: 'J02.9' },
  { email: 'tranvanminh.patient@gmail.com', visitCode: 'LK-REVIEW-MINH-01', appointmentCode: 'LH-REVIEW-MINH-01', invoiceCode: 'HD-REVIEW-MINH-01', prescriptionCode: 'DT-REVIEW-MINH-01', paid: true, date: new Date('2026-08-04T13:30:00.000Z'), reason: 'Đau mỏi vai gáy', diagnosis: 'Đau cơ xương khớp', icd: 'M79.1' },
  { email: 'lethihuong.patient@gmail.com', visitCode: 'LK-REVIEW-HUONG-01', appointmentCode: 'LH-REVIEW-HUONG-01', invoiceCode: 'HD-REVIEW-HUONG-01', prescriptionCode: 'DT-REVIEW-HUONG-01', paid: true, date: new Date('2026-08-05T15:00:00.000Z'), reason: 'Ngứa da, nổi mẩn nhẹ', diagnosis: 'Viêm da dị ứng', icd: 'L20.9' },
  { email: 'hogiabao.patient@gmail.com', visitCode: 'LK-REVIEW-BAO-01', appointmentCode: 'LH-REVIEW-BAO-01', invoiceCode: 'HD-REVIEW-BAO-01', prescriptionCode: 'DT-REVIEW-BAO-01', paid: true, date: new Date('2026-08-06T08:00:00.000Z'), reason: 'Đau mắt và nhìn mờ', diagnosis: 'Khô mắt', icd: 'H04.1' },
  { email: 'vothuyduong.patient@gmail.com', visitCode: 'LK-REVIEW-DUONG-01', appointmentCode: 'LH-REVIEW-DUONG-01', invoiceCode: 'HD-REVIEW-DUONG-01', prescriptionCode: 'DT-REVIEW-DUONG-01', paid: true, date: new Date('2026-08-06T10:30:00.000Z'), reason: 'Đánh trống ngực khi vận động', diagnosis: 'Theo dõi tim mạch', icd: 'R00.2' },
  { email: 'phamquockhoi.patient@gmail.com', visitCode: 'LK-REVIEW-KHOI-01', appointmentCode: 'LH-REVIEW-KHOI-01', invoiceCode: 'HD-REVIEW-KHOI-01', prescriptionCode: 'DT-REVIEW-KHOI-01', paid: true, date: new Date('2026-08-07T09:15:00.000Z'), reason: 'Đau khớp gối khi đi lại', diagnosis: 'Đau khớp gối', icd: 'M25.56' },
  { email: 'dangthutrang.patient@gmail.com', visitCode: 'LK-REVIEW-TRANG-01', appointmentCode: 'LH-REVIEW-TRANG-01', invoiceCode: 'HD-REVIEW-TRANG-01', prescriptionCode: 'DT-REVIEW-TRANG-01', paid: true, date: new Date('2026-08-07T13:45:00.000Z'), reason: 'Sổ mũi, nghẹt mũi kéo dài', diagnosis: 'Viêm mũi dị ứng', icd: 'J30.9' },
  { email: 'lythanhha.patient@gmail.com', visitCode: 'LK-REVIEW-HA-01', appointmentCode: 'LH-REVIEW-HA-01', invoiceCode: 'HD-REVIEW-HA-01', prescriptionCode: 'DT-REVIEW-HA-01', paid: true, date: new Date('2026-08-08T08:45:00.000Z'), reason: 'Khám phụ khoa định kỳ', diagnosis: 'Theo dõi sức khỏe phụ khoa', icd: 'Z01.4' },
  { email: 'nguyenducminh.patient@gmail.com', visitCode: 'LK-REVIEW-DUC-MINH-01', appointmentCode: 'LH-REVIEW-DUC-MINH-01', invoiceCode: 'HD-REVIEW-DUC-MINH-01', prescriptionCode: 'DT-REVIEW-DUC-MINH-01', paid: true, date: new Date('2026-08-08T14:15:00.000Z'), reason: 'Nổi ban đỏ sau ăn', diagnosis: 'Theo dõi dị ứng thức ăn', icd: 'L50.9' },
];

const REVIEW_BY_VISIT_CODE = {
  'LK-REVIEW-TRUC-01': { rating: 5, comment: 'Bác sĩ tư vấn rõ ràng, thái độ tận tình.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-LAN-01': { rating: 4, comment: 'Khám kỹ, giải thích cách dùng thuốc dễ hiểu.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-MINH-01': { rating: 5, comment: 'Bác sĩ hướng dẫn theo dõi sau khám rất cụ thể.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-HUONG-01': { rating: 4, comment: 'Thời gian chờ hợp lý, bác sĩ thân thiện.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-BAO-01': { rating: 5, comment: 'Bác sĩ khám kỹ và hướng dẫn chăm sóc mắt cụ thể.', status: 'CHO_DUYET' },
  'LK-REVIEW-DUONG-01': { rating: 4, comment: 'Bác sĩ giải thích tình trạng dễ hiểu, nhân viên hỗ trợ tốt.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-KHOI-01': { rating: 5, comment: 'Thời gian khám hợp lý, bác sĩ tư vấn phương án vận động phù hợp.', status: 'DA_HIEN_THI' },
  'LK-REVIEW-TRANG-01': { rating: 3, comment: 'Nội dung tư vấn đầy đủ, cần chờ thêm một chút vào giờ cao điểm.', status: 'DA_AN' },
};

async function ensureCase(item, index, doctors, medicines, cashierId) {
  const user = await prisma.nguoiDung.findUniqueOrThrow({ where: { email: item.email }, include: { benhNhan: true } });
  if (!user.benhNhan) throw new Error(`Thiếu hồ sơ bệnh nhân cho ${item.email}`);
  const patient = user.benhNhan;
  const doctor = doctors[index % doctors.length];
  const end = new Date(item.date.getTime() + 30 * 60 * 1000);
  const doneAt = new Date(item.date.getTime() + 45 * 60 * 1000);

  const appointment = await prisma.lichHen.upsert({
    where: { maLichHen: item.appointmentCode },
    update: { benhNhanId: patient.id, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, ngayHen: item.date, gioBatDau: item.date, gioKetThuc: end, lyDoKham: item.reason, trangThai: 'DA_CHECK_IN' },
    create: { maLichHen: item.appointmentCode, benhNhanId: patient.id, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, ngayHen: item.date, gioBatDau: item.date, gioKetThuc: end, nguonDatLich: 'BENH_NHAN', lyDoKham: item.reason, trieuChungBanDau: item.reason, trangThai: 'DA_CHECK_IN', nguoiXacNhanId: cashierId, thoiGianXacNhan: item.date },
  });
  const visit = await prisma.luotKham.upsert({
    where: { maLuotKham: item.visitCode },
    update: { lichHenId: appointment.id, benhNhanId: patient.id, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, thoiGianHen: item.date, lyDoKham: item.reason, trangThai: 'DA_HOAN_TAT', thoiGianHoanTat: doneAt },
    create: { lichHenId: appointment.id, maLuotKham: item.visitCode, benhNhanId: patient.id, chuyenKhoaId: doctor.chuyenKhoaId, bacSiId: doctor.id, hinhThucKham: 'DAT_LICH_TRUOC', thoiGianHen: item.date, lyDoKham: item.reason, trieuChungBanDau: item.reason, trangThai: 'DA_HOAN_TAT', thoiGianDangKy: item.date, thoiGianHoanTat: doneAt },
  });
  const record = await prisma.hoSoKham.upsert({
    where: { luotKhamId: visit.id },
    update: { trieuChung: item.reason, chanDoan: item.diagnosis, maIcd10: item.icd, ketLuan: 'Đã tư vấn theo dõi và tái khám khi triệu chứng kéo dài.', trangThai: 'DA_HOAN_TAT', thoiGianNop: doneAt },
    create: { luotKhamId: visit.id, trieuChung: item.reason, chanDoan: item.diagnosis, maIcd10: item.icd, ketLuan: 'Đã tư vấn theo dõi và tái khám khi triệu chứng kéo dài.', trangThai: 'DA_HOAN_TAT', thoiGianNop: doneAt },
  });
  const prescription = await prisma.donThuoc.upsert({
    where: { hoSoKhamId: record.id },
    update: { maDonThuoc: item.prescriptionCode, trangThai: 'DA_CAP_THUOC' },
    create: { maDonThuoc: item.prescriptionCode, hoSoKhamId: record.id, trangThai: 'DA_CAP_THUOC', thoiGianCapThuoc: doneAt },
  });
  const hasPrescriptionLines = await prisma.chiTietDonThuoc.count({ where: { donThuocId: prescription.id } });
  if (!hasPrescriptionLines) {
    await prisma.chiTietDonThuoc.createMany({ data: medicines.map((medicine) => ({ donThuocId: prescription.id, thuocId: medicine.id, soLuong: 5, lieuDung: '1 đơn vị/lần', tanSuat: 'Ngày 2 lần', soNgaySuDung: 5, huongDanSuDung: 'Dùng theo hướng dẫn của bác sĩ.', donGia: medicine.giaBan, thanhTien: Number(medicine.giaBan) * 5 })) });
  }
  const medicineAmount = medicines.reduce((sum, medicine) => sum + Number(medicine.giaBan) * 5, 0);
  const examinationAmount = Number(doctor.chuyenKhoa.phiKham);
  const total = examinationAmount + medicineAmount;
  const invoice = await prisma.hoaDon.upsert({
    where: { luotKhamId: visit.id },
    update: { maHoaDon: item.invoiceCode, benhNhanId: patient.id, tienKham: examinationAmount, tienThuoc: medicineAmount, tongTien: total, trangThai: item.paid ? 'DA_THANH_TOAN' : 'CHUA_THANH_TOAN', nguoiTaoId: cashierId, thoiGianThanhToan: item.paid ? doneAt : null },
    create: { maHoaDon: item.invoiceCode, luotKhamId: visit.id, benhNhanId: patient.id, tienKham: examinationAmount, tienThuoc: medicineAmount, phiDichVu: 0, soTienGiam: 0, tongTien: total, trangThai: item.paid ? 'DA_THANH_TOAN' : 'CHUA_THANH_TOAN', nguoiTaoId: cashierId, thoiGianThanhToan: item.paid ? doneAt : null },
  });
  const hasPayment = await prisma.thanhToan.findFirst({ where: { hoaDonId: invoice.id, trangThai: 'THANH_CONG' } });
  if (item.paid && !hasPayment) {
    await prisma.thanhToan.create({ data: { hoaDonId: invoice.id, soTien: total, phuongThuc: 'TIEN_MAT', maGiaoDich: `PAY-${item.visitCode}`, trangThai: 'THANH_CONG', nguoiThuTienId: cashierId, thoiGianThanhToan: doneAt } });
  }
  const review = REVIEW_BY_VISIT_CODE[item.visitCode];
  if (review) {
    await prisma.danhGiaBacSi.upsert({
      where: { luotKhamId: visit.id },
      update: { soSao: review.rating, noiDung: review.comment, trangThai: review.status },
      create: { luotKhamId: visit.id, benhNhanId: patient.id, bacSiId: doctor.id, soSao: review.rating, noiDung: review.comment, trangThai: review.status },
    });
  } else {
    // Giữ lượt khám đã thanh toán nhưng chưa đánh giá để kiểm thử trên tài khoản bệnh nhân.
    await prisma.danhGiaBacSi.deleteMany({ where: { luotKhamId: visit.id } });
  }
}

try {
  const [doctors, medicines, cashier] = await Promise.all([
    prisma.bacSi.findMany({ where: { trangThai: 'DANG_HOAT_DONG' }, include: { chuyenKhoa: true }, orderBy: { id: 'asc' }, take: 4 }),
    prisma.thuoc.findMany({ where: { trangThai: 'DANG_HOAT_DONG' }, orderBy: { id: 'asc' }, take: 2 }),
    prisma.nguoiDung.findFirst({ where: { nguoiDungVaiTro: { some: { vaiTro: { maVaiTro: 'RECEPTIONIST' } } } } }),
  ]);
  if (doctors.length < 1 || medicines.length < 1 || !cashier) throw new Error('Cần seed bác sĩ, thuốc và thu ngân trước khi seed luồng bệnh nhân.');
  for (const [index, item] of CASES.entries()) await ensureCase(item, index, doctors, medicines, cashier.id);
  console.log(`Đã seed ${CASES.length} lượt khám cho 4 bệnh nhân test; dữ liệu có thể chạy lại an toàn.`);
} finally {
  await prisma.$disconnect();
}
