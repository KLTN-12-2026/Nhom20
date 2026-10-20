import { createSeedClient, upsertRoleAccount } from './seed-tien-ich.mjs';

const RECEPTIONIST_ACCOUNTS = [
  { code: '4000', fullName: 'Lý Trưởng Khoa', email: 'truongkhoa.thungan@gmail.com', password: 'TruongKhoa@123456', phoneNumber: '0904000000', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4001', fullName: 'Lê Hoàng Nam', email: 'thungan@gmail.com', password: 'Thungan@123456', phoneNumber: '0901000004', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4002', fullName: 'Nguyễn Thu Thủy', email: 'thungan.thuthuy@gmail.com', password: 'ThunganThuThuy@123456', phoneNumber: '0904100002', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4003', fullName: 'Trần Minh Khoa', email: 'thungan.minhkhoa@gmail.com', password: 'ThunganMinhKhoa@123456', phoneNumber: '0904100003', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4004', fullName: 'Phạm Ngọc Hân', email: 'thungan.ngochan@gmail.com', password: 'ThunganNgocHan@123456', phoneNumber: '0904100004', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4005', fullName: 'Võ Thanh Tùng', email: 'thungan.thanhtung@gmail.com', password: 'ThunganThanhTung@123456', phoneNumber: '0904100005', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4006', fullName: 'Bùi Khánh Vy', email: 'thungan.khanhvy@gmail.com', password: 'ThunganKhanhVy@123456', phoneNumber: '0904100006', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4007', fullName: 'Đặng Quốc Huy', email: 'thungan.quochuy@gmail.com', password: 'ThunganQuocHuy@123456', phoneNumber: '0904100007', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4008', fullName: 'Vũ Đức Tâm', email: 'thungan.ductam@gmail.com', password: 'ThunganDucTam@123456', phoneNumber: '0904100008', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
  { code: '4009', fullName: 'Hồ Mỹ Duyên', email: 'thungan.myduyen@gmail.com', password: 'ThunganMyDuyen@123456', phoneNumber: '0904100009', roleCode: 'RECEPTIONIST', roleName: 'Lễ tân / Thu ngân', position: 'LE_TAN_THU_NGAN' },
];

const prisma = createSeedClient();
try {
  await prisma.$transaction(async (transaction) => {
    // Đảm bảo Đơn vị "Bộ phận Tiếp đón" tồn tại
    const department = await transaction.donViLamViec.upsert({
      where: { maDonVi: 'BO_PHAN_TIEP_DON' },
      update: {},
      create: { maDonVi: 'BO_PHAN_TIEP_DON', tenDonVi: 'Bộ phận Tiếp đón', loaiDonVi: 'BO_PHAN', moTa: 'Quản lý lịch làm việc của Lễ tân và Thu ngân' },
    });

    for (const account of RECEPTIONIST_ACCOUNTS) {
      const { user } = await upsertRoleAccount(transaction, account);
      await transaction.nhanVien.upsert({
        where: { nguoiDungId: user.id },
        update: { maNhanVien: account.code, hoTen: account.fullName, soDienThoai: account.phoneNumber, chucVu: account.position, trangThai: 'DANG_HOAT_DONG' },
        create: { nguoiDungId: user.id, maNhanVien: account.code, hoTen: account.fullName, soDienThoai: account.phoneNumber, chucVu: account.position, ngayVaoLam: new Date('2026-01-01'), trangThai: 'DANG_HOAT_DONG' },
      });

      // Gán tài khoản đầu tiên (mã 4000) làm Trưởng bộ phận
      if (account.code === '4000') {
        await transaction.quanLyDonVi.upsert({
          where: { donViLamViecId_nguoiDungId_chucVu_ngayBatDau: { donViLamViecId: department.id, nguoiDungId: user.id, chucVu: 'TRUONG_DON_VI', ngayBatDau: new Date('2026-01-01') } },
          update: { trangThai: 'DANG_HOAT_DONG' },
          create: { donViLamViecId: department.id, nguoiDungId: user.id, chucVu: 'TRUONG_DON_VI', ngayBatDau: new Date('2026-01-01'), trangThai: 'DANG_HOAT_DONG' },
        });
        console.log(`  → Đã gán ${account.fullName} làm Trưởng bộ phận Tiếp đón`);
      }

      console.log(`Đã seed RECEPTIONIST: ${account.email}`);
    }
  }, { timeout: 60_000 });
} finally {
  await prisma.$disconnect();
}
