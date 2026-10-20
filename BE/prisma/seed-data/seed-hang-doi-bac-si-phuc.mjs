import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env', quiet: true });

function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu biến môi trường DATABASE_URL trong .env');
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function getTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseCliDate() {
  const arg = process.argv[2];
  if (arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    return new Date(`${arg}T00:00:00.000Z`);
  }
  return getTodayUtc();
}

const PATIENTS_FIXTURES = [
  {
    patientCode: 'BN-PHUC-001',
    fullName: 'Nguyễn Văn An',
    phoneNumber: '0901000001',
    gender: 'NAM',
    dateOfBirth: '1990-05-15',
    reason: 'Đau tức vùng thượng vị âm ỉ sau khi ăn, kèm ợ chua và đầy hơi.',
    symptoms: 'Đau âm ỉ 2 tuần nay, hay xuất hiện sau bữa tối, thỉnh thoảng buồn nôn nhẹ.',
    priority: 'THONG_THUONG',
    startTime: '08:00',
    endTime: '08:30',
    status: 'DA_CHECK_IN',
  },
  {
    patientCode: 'BN-PHUC-002',
    fullName: 'Trần Thị Bình',
    phoneNumber: '0901000002',
    gender: 'NU',
    dateOfBirth: '1988-09-22',
    reason: 'Tái khám viêm loét dạ dày - tá tràng, kiểm tra hiệu quả đơn thuốc.',
    symptoms: 'Đã uống thuốc 2 tuần, triệu chứng giảm 70%, cần nội soi kiểm tra lại.',
    priority: 'NGUOI_CAO_TUOI',
    startTime: '08:30',
    endTime: '09:00',
    status: 'DA_CHECK_IN',
  },
  {
    patientCode: 'BN-PHUC-003',
    fullName: 'Đỗ Đức Tín',
    phoneNumber: '0911483539',
    gender: 'NAM',
    dateOfBirth: '1992-03-18',
    reason: 'Đau đầu, hoa mắt chóng mặt khi thay đổi tư thế, mệt mỏi kéo dài.',
    symptoms: 'Huyết áp đo tại nhà dao động 135/85, mệt mỏi về chiều, khó tập trung.',
    priority: 'THONG_THUONG',
    startTime: '09:00',
    endTime: '09:30',
    status: 'DA_CHECK_IN',
  },
  {
    patientCode: 'BN-PHUC-004',
    fullName: 'Lê Thị Hương',
    phoneNumber: '0905555666',
    gender: 'NU',
    dateOfBirth: '1995-12-10',
    reason: 'Khám sức khỏe tổng quát định kỳ và tư vấn chỉ số men gan.',
    symptoms: 'Không có triệu chứng cấp tính, kiểm tra sức khỏe hàng năm.',
    priority: 'THONG_THUONG',
    startTime: '09:30',
    endTime: '10:00',
    status: 'DA_XAC_NHAN',
  },
];

async function seedQueueForDoctorPhuc() {
  const prisma = getPrisma();
  const targetDate = parseCliDate();
  const dateStr = targetDate.toISOString().slice(0, 10);
  console.log(`\n============================================================`);
  console.log(`[SEEDER] KHỞI TẠO HÀNG ĐỢI KHÁM BÁC SĨ ĐỖ HOÀNG PHÚC`);
  console.log(`[SEEDER] Ngày khám: ${dateStr}`);
  console.log(`============================================================\n`);

  try {
    // 1. Tìm thông tin Bác sĩ Đỗ Hoàng Phúc
    const doctor = await prisma.bacSi.findFirst({
      where: {
        OR: [
          { maBacSi: '2007' },
          { hoTen: { contains: 'Đỗ Hoàng Phúc' } },
        ],
      },
      include: {
        nguoiDung: true,
        chuyenKhoa: {
          include: { donViLamViec: true },
        },
      },
    });

    if (!doctor) {
      throw new Error('Không tìm thấy bác sĩ Đỗ Hoàng Phúc (mã 2007) trong hệ thống.');
    }
    console.log(`✓ Đã xác định bác sĩ: ${doctor.hoTen} (ID: ${doctor.id}, Mã: ${doctor.maBacSi})`);
    console.log(`  Chuyên khoa: ${doctor.chuyenKhoa.tenChuyenKhoa} (ID: ${doctor.chuyenKhoaId}, Mã: ${doctor.chuyenKhoa.maChuyenKhoa})`);

    // 2. Tìm nhân viên lễ tân xác nhận
    const receptionist = await prisma.nguoiDung.findFirst({
      where: {
        nguoiDungVaiTro: {
          some: { vaiTro: { maVaiTro: 'RECEPTIONIST' } },
        },
      },
      select: { id: true, hoTen: true },
    });
    const receptionistId = receptionist?.id ?? null;
    console.log(`✓ Nhân viên lễ tân xác nhận: ${receptionist?.hoTen ?? 'Hệ thống'} (ID: ${receptionistId})`);

    // 3. Đảm bảo lịch trực/phân công ca (PhanCongCa) cho bác sĩ vào ngày này
    const morningShift = await prisma.caLamViec.findFirst({
      where: { maCa: 'SANG' },
    });
    const doctorRole = await prisma.vaiTro.findUnique({
      where: { maVaiTro: 'DOCTOR' },
    });

    if (morningShift && doctorRole && doctor.chuyenKhoa.donViLamViec) {
      const existingShift = await prisma.phanCongCa.findFirst({
        where: {
          nguoiDungId: doctor.nguoiDungId,
          caLamViecId: morningShift.id,
          ngayLamViec: targetDate,
        },
      });

      if (!existingShift) {
        await prisma.phanCongCa.create({
          data: {
            nguoiDungId: doctor.nguoiDungId,
            vaiTroId: doctorRole.id,
            caLamViecId: morningShift.id,
            donViLamViecId: doctor.chuyenKhoa.donViLamViec.id,
            ngayLamViec: targetDate,
            nguon: 'TRUONG_DON_VI_PHAN_CONG',
            trangThai: 'DA_DUYET',
            thoiGianDuyet: new Date(),
          },
        });
        console.log(`✓ Đã bổ sung phân công Ca sáng cho bác sĩ ngày ${dateStr}`);
      } else {
        console.log(`✓ Bác sĩ đã có phân công Ca sáng hợp lệ ngày ${dateStr}`);
      }
    }

    // 4. Lấy số thứ tự phiếu hàng đợi hiện tại lớn nhất trong ngày của chuyên khoa
    const lastTicket = await prisma.phieuHangCho.findFirst({
      where: {
        ngayXepHang: targetDate,
        chuyenKhoaId: doctor.chuyenKhoaId,
      },
      orderBy: { soThuTu: 'desc' },
      select: { soThuTu: true },
    });
    let nextOrdinal = (lastTicket?.soThuTu ?? 0) + 1;

    let queueAddedCount = 0;
    let appointmentCreatedCount = 0;

    // 5. Tiến hành duyệt tạo từng bệnh nhân
    for (const item of PATIENTS_FIXTURES) {
      // Tìm hoặc tạo hồ sơ bệnh nhân
      let patient = await prisma.benhNhan.findFirst({
        where: {
          OR: [
            { soDienThoai: item.phoneNumber },
            { hoTen: item.fullName },
          ],
        },
      });

      if (!patient) {
        patient = await prisma.benhNhan.create({
          data: {
            maBenhNhan: item.patientCode,
            hoTen: item.fullName,
            soDienThoai: item.phoneNumber,
            gioiTinh: item.gender,
            ngaySinh: new Date(`${item.dateOfBirth}T00:00:00.000Z`),
            diaChi: 'Đà Nẵng, Việt Nam',
          },
        });
        console.log(`  + Đã tạo mới hồ sơ bệnh nhân: ${patient.hoTen} (${patient.maBenhNhan})`);
      }

      // Kiểm tra xem bệnh nhân này đã có lịch hẹn/lượt khám với BS Phúc trong ngày chưa
      const existingAppt = await prisma.lichHen.findFirst({
        where: {
          benhNhanId: patient.id,
          bacSiId: doctor.id,
          ngayHen: targetDate,
        },
        include: {
          luotKham: {
            include: { phieuHangCho: true },
          },
        },
      });

      if (existingAppt) {
        if (existingAppt.luotKham?.phieuHangCho) {
          console.log(`  - Bệnh nhân ${patient.hoTen} đã có trong hàng đợi hôm nay (STT: ${existingAppt.luotKham.phieuHangCho.soThuTu}, Số: ${existingAppt.luotKham.phieuHangCho.maSoThuTu}). Bỏ qua.`);
          continue;
        }
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const apptCode = `LH-${dateStr.replaceAll('-', '')}-${randomSuffix}`;
      const visitCode = `LK-${dateStr.replaceAll('-', '')}-${randomSuffix}`;
      const startDateTime = new Date(`1970-01-01T${item.startTime}:00.000Z`);
      const endDateTime = new Date(`1970-01-01T${item.endTime}:00.000Z`);

      if (item.status === 'DA_CHECK_IN') {
        const queueCode = `${doctor.chuyenKhoa.maChuyenKhoa}-${String(nextOrdinal).padStart(3, '0')}`;
        const currentOrdinal = nextOrdinal;
        nextOrdinal += 1;

        await prisma.lichHen.create({
          data: {
            maLichHen: apptCode,
            benhNhanId: patient.id,
            chuyenKhoaId: doctor.chuyenKhoaId,
            bacSiId: doctor.id,
            ngayHen: targetDate,
            gioBatDau: startDateTime,
            gioKetThuc: endDateTime,
            nguonDatLich: 'NHAN_VIEN',
            lyDoKham: item.reason,
            trieuChungBanDau: item.symptoms,
            trangThai: 'DA_CHECK_IN',
            nguoiXacNhanId: receptionistId,
            thoiGianXacNhan: new Date(),
            luotKham: {
              create: {
                maLuotKham: visitCode,
                benhNhanId: patient.id,
                chuyenKhoaId: doctor.chuyenKhoaId,
                bacSiId: doctor.id,
                hinhThucKham: 'KHAM_TRUC_TIEP',
                lyDoKham: item.reason,
                trieuChungBanDau: item.symptoms,
                mucDoUuTien: item.priority,
                trangThai: 'DANG_CHO',
                thoiGianDangKy: new Date(),
                phieuHangCho: {
                  create: {
                    soThuTu: currentOrdinal,
                    maSoThuTu: queueCode,
                    ngayXepHang: targetDate,
                    chuyenKhoaId: doctor.chuyenKhoaId,
                    trangThai: 'CHO_GOI',
                    thoiGianXacNhan: new Date(),
                    nguoiXacNhanId: receptionistId,
                  },
                },
              },
            },
          },
        });

        console.log(`  ✓ ĐÃ THÊM VÀO HÀNG ĐỢI: [STT ${currentOrdinal}] ${queueCode} - ${patient.hoTen} (${item.startTime}) - ${item.reason}`);
        queueAddedCount += 1;
        appointmentCreatedCount += 1;
      } else {
        // Lịch hẹn đã xác nhận (chờ check-in)
        await prisma.lichHen.create({
          data: {
            maLichHen: apptCode,
            benhNhanId: patient.id,
            chuyenKhoaId: doctor.chuyenKhoaId,
            bacSiId: doctor.id,
            ngayHen: targetDate,
            gioBatDau: startDateTime,
            gioKetThuc: endDateTime,
            nguonDatLich: 'BENH_NHAN',
            lyDoKham: item.reason,
            trieuChungBanDau: item.symptoms,
            trangThai: 'DA_XAC_NHAN',
            nguoiXacNhanId: receptionistId,
            thoiGianXacNhan: new Date(),
          },
        });
        console.log(`  ✓ Đã thêm lịch khám đã xác nhận: ${apptCode} - ${patient.hoTen} (${item.startTime})`);
        appointmentCreatedCount += 1;
      }
    }

    console.log(`\n============================================================`);
    console.log(`🎉 HOÀN TẤT SEEDER HÀNG ĐỢI BÁC SĨ ĐỖ HOÀNG PHÚC!`);
    console.log(`- Số bệnh nhân vào Hàng đợi khám (Chờ gọi): ${queueAddedCount}`);
    console.log(`- Tổng lịch khám hôm nay được tạo: ${appointmentCreatedCount}`);
    console.log(`============================================================\n`);
  } catch (error) {
    console.error('❌ Lỗi khi chạy seeder:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedQueueForDoctorPhuc();
