import { createSeedClient, upsertRoleAccount } from './seed-tien-ich.mjs';

const PHARMACIST_ACCOUNTS = [
  {
    code: '5001', fullName: 'Trần Thu Hà', email: 'duocsi@gmail.com',
    password: 'Duocsi@123456', phoneNumber: '0901000003',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5002', fullName: 'Nguyễn Thảo Vy', email: 'duocsi.thaovy@gmail.com',
    password: 'DuocsiThaoVy@123456', phoneNumber: '0903100002',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5003', fullName: 'Lê Quốc Khánh', email: 'duocsi.quockhanh@gmail.com',
    password: 'DuocsiQuocKhanh@123456', phoneNumber: '0903100003',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5004', fullName: 'Phạm Minh Châu', email: 'duocsi.minhchau@gmail.com',
    password: 'DuocsiMinhChau@123456', phoneNumber: '0903100004',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5005', fullName: 'Võ Gia Huy', email: 'duocsi.giahuy@gmail.com',
    password: 'DuocsiGiaHuy@123456', phoneNumber: '0903100005',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5006', fullName: 'Bùi Ngọc Lan', email: 'duocsi.ngoclan@gmail.com',
    password: 'DuocsiNgocLan@123456', phoneNumber: '0903100006',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5007', fullName: 'Đặng Hoàng Anh', email: 'duocsi.hoanganh@gmail.com',
    password: 'DuocsiHoangAnh@123456', phoneNumber: '0903100007',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5008', fullName: 'Vũ Quốc Bảo', email: 'duocsi.quocbao@gmail.com',
    password: 'DuocsiQuocBao@123456', phoneNumber: '0903100008',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5009', fullName: 'Hồ Yến Nhi', email: 'duocsi.yennhi@gmail.com',
    password: 'DuocsiYenNhi@123456', phoneNumber: '0903100009',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
  {
    code: '5010', fullName: 'Phan Tuấn Kiệt', email: 'duocsi.tuankiet@gmail.com',
    password: 'DuocsiTuanKiet@123456', phoneNumber: '0903100010',
    roleCode: 'PHARMACIST', roleName: 'Dược sĩ', position: 'DUOC_SI',
  },
];

const prisma = createSeedClient();
try {
  await prisma.$transaction(async (transaction) => {
    const department = await transaction.donViLamViec.upsert({
      where: { maDonVi: 'BO_PHAN_DUOC' },
      update: { tenDonVi: 'Bộ phận Dược', loaiDonVi: 'BO_PHAN', trangThai: 'DANG_HOAT_DONG' },
      create: { maDonVi: 'BO_PHAN_DUOC', tenDonVi: 'Bộ phận Dược', loaiDonVi: 'BO_PHAN', moTa: 'Quản lý lịch làm việc và cấp phát thuốc' },
    });
    for (const account of PHARMACIST_ACCOUNTS) {
      const { user } = await upsertRoleAccount(transaction, account);
      await transaction.nhanVien.upsert({
        where: { nguoiDungId: user.id },
        update: { maNhanVien: account.code, hoTen: account.fullName, soDienThoai: account.phoneNumber, chucVu: account.position, trangThai: 'DANG_HOAT_DONG' },
        create: { nguoiDungId: user.id, maNhanVien: account.code, hoTen: account.fullName, soDienThoai: account.phoneNumber, chucVu: account.position, ngayVaoLam: new Date('2026-01-01'), trangThai: 'DANG_HOAT_DONG' },
      });
      if (account.code === '5001') {
        await transaction.quanLyDonVi.upsert({
          where: { donViLamViecId_nguoiDungId_chucVu_ngayBatDau: { donViLamViecId: department.id, nguoiDungId: user.id, chucVu: 'TRUONG_DON_VI', ngayBatDau: new Date('2026-01-01') } },
          update: { trangThai: 'DANG_HOAT_DONG' },
          create: { donViLamViecId: department.id, nguoiDungId: user.id, chucVu: 'TRUONG_DON_VI', ngayBatDau: new Date('2026-01-01'), trangThai: 'DANG_HOAT_DONG' },
        });
      }
      console.log(`Đã seed PHARMACIST: ${account.email}`);
    }
  }, { timeout: 30_000 });
} finally {
  await prisma.$disconnect();
}
