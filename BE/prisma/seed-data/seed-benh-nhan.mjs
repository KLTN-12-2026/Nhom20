import { createSeedClient, upsertRoleAccount } from './seed-tien-ich.mjs';

const PATIENT_ACCOUNTS = [
  { fullName: 'Phan Thị Minh Trúc', email: 'phanthiminhtruc@gmail.com', password: 'MinhTruc@123', phoneNumber: '0905608591', patientCode: 'BN-PHAN-TRUC', gender: 'NU', dateOfBirth: new Date('1998-05-14'), address: 'Hải Châu, Đà Nẵng' },
  { fullName: 'Nguyễn Thị Lan', email: 'nguyenthilan.patient@gmail.com', password: 'Lan@123456', phoneNumber: '0905111222', patientCode: 'BN-NGUYEN-LAN', gender: 'NU', dateOfBirth: new Date('1994-08-22'), address: 'Thanh Khê, Đà Nẵng' },
  { fullName: 'Trần Văn Minh', email: 'tranvanminh.patient@gmail.com', password: 'Minh@123456', phoneNumber: '0905333444', patientCode: 'BN-TRAN-MINH', gender: 'NAM', dateOfBirth: new Date('1989-03-10'), address: 'Sơn Trà, Đà Nẵng' },
  { fullName: 'Lê Thị Hương', email: 'lethihuong.patient@gmail.com', password: 'Huong@123456', phoneNumber: '0905555666', patientCode: 'BN-LE-HUONG', gender: 'NU', dateOfBirth: new Date('1992-11-05'), address: 'Cẩm Lệ, Đà Nẵng' },
  { fullName: 'Hồ Gia Bảo', email: 'hogiabao.patient@gmail.com', password: 'GiaBao@123456', phoneNumber: '0905777111', patientCode: 'BN-HO-GIA-BAO', gender: 'NAM', dateOfBirth: new Date('1999-08-20'), address: 'Sơn Trà, Đà Nẵng' },
  { fullName: 'Võ Thị Thùy Dương', email: 'vothuyduong.patient@gmail.com', password: 'ThuyDuong@123456', phoneNumber: '0905777222', patientCode: 'BN-VO-THUY-DUONG', gender: 'NU', dateOfBirth: new Date('1990-03-16'), address: 'Liên Chiểu, Đà Nẵng' },
  { fullName: 'Phạm Quốc Khôi', email: 'phamquockhoi.patient@gmail.com', password: 'QuocKhoi@123456', phoneNumber: '0905777333', patientCode: 'BN-PHAM-QUOC-KHOI', gender: 'NAM', dateOfBirth: new Date('1987-10-09'), address: 'Hải Châu, Đà Nẵng' },
  { fullName: 'Đặng Thu Trang', email: 'dangthutrang.patient@gmail.com', password: 'ThuTrang@123456', phoneNumber: '0905777444', patientCode: 'BN-DANG-THU-TRANG', gender: 'NU', dateOfBirth: new Date('1995-01-27'), address: 'Thanh Khê, Đà Nẵng' },
  { fullName: 'Lý Thanh Hà', email: 'lythanhha.patient@gmail.com', password: 'ThanhHa@123456', phoneNumber: '0905777555', patientCode: 'BN-LY-THANH-HA', gender: 'NU', dateOfBirth: new Date('1993-06-11'), address: 'Ngũ Hành Sơn, Đà Nẵng' },
  { fullName: 'Nguyễn Đức Minh', email: 'nguyenducminh.patient@gmail.com', password: 'DucMinh@123456', phoneNumber: '0905777666', patientCode: 'BN-NGUYEN-DUC-MINH', gender: 'NAM', dateOfBirth: new Date('1985-12-03'), address: 'Cẩm Lệ, Đà Nẵng' },
].map((account) => ({ ...account, roleCode: 'PATIENT', roleName: 'Bệnh nhân' }));

const prisma = createSeedClient();
try {
  await prisma.$transaction(async (transaction) => {
    for (const account of PATIENT_ACCOUNTS) {
      const { user } = await upsertRoleAccount(transaction, account);
      await transaction.benhNhan.upsert({
        where: { nguoiDungId: user.id },
        update: { maBenhNhan: account.patientCode, hoTen: account.fullName, soDienThoai: account.phoneNumber, email: account.email, gioiTinh: account.gender, ngaySinh: account.dateOfBirth, diaChi: account.address },
        create: { nguoiDungId: user.id, maBenhNhan: account.patientCode, hoTen: account.fullName, soDienThoai: account.phoneNumber, email: account.email, gioiTinh: account.gender, ngaySinh: account.dateOfBirth, diaChi: account.address },
      });
    }
  }, { timeout: 30_000 });
  console.log(`Đã seed ${PATIENT_ACCOUNTS.length} tài khoản bệnh nhân test.`);
} finally {
  await prisma.$disconnect();
}
