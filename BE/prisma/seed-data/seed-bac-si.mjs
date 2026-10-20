import { seedDoctorAccounts } from './seed-tien-ich.mjs';

const DOCTOR_ACCOUNTS = [
  // Các tài khoản bác sĩ đã tồn tại từ giai đoạn đầu, chuẩn hóa lại tên và mã.
  { code: '2001', fullName: 'Nguyễn Văn Hòa', email: 'bacsi@gmail.com', password: 'BacSi@123456', phoneNumber: '0902300001', specialtyCode: '101', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 9, isDepartmentHead: false },
  { code: '2002', fullName: 'Trần Thị Mai', email: 'bacsi.nhi-khoa@gmail.com', password: 'BacSiNhiKhoa@123456', phoneNumber: '0902300002', specialtyCode: '102', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 8, isDepartmentHead: false },
  { code: '2003', fullName: 'Lê Hoàng Nam', email: 'bacsi.da-lieu@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902300003', specialtyCode: '103', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 10, isDepartmentHead: false },
  { code: '2004', fullName: 'Phan Minh Đức', email: 'bacsi.tim-mach@gmail.com', password: 'BacSiTimMach@123456', phoneNumber: '0902300004', specialtyCode: '104', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 11, isDepartmentHead: false },
  { code: '2005', fullName: 'Nguyễn Thanh Tùng', email: 'bacsi.tai-mui-hong@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902300005', specialtyCode: '105', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 9, isDepartmentHead: false },
  { code: '2006', fullName: 'Đinh Quốc Huy', email: 'bacsi.co-xuong-khop@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902300006', specialtyCode: '108', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 12, isDepartmentHead: false },

  // Bác sĩ thường
  { code: '2007', fullName: 'Đỗ Hoàng Phúc', email: 'bacsi.noi@gmail.com', password: 'BacSiNoi@123456', phoneNumber: '0902200001', specialtyCode: '101', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2008', fullName: 'Phạm Gia Hân', email: 'bacsi.nhi@gmail.com', password: 'BacSiNhi@123456', phoneNumber: '0902200002', specialtyCode: '102', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2009', fullName: 'Nguyễn Ngọc Thảo', email: 'bacsi.dalieu@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902200003', specialtyCode: '103', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 4, isDepartmentHead: false },
  { code: '2010', fullName: 'Võ Thành Luân', email: 'bacsi.timmach@gmail.com', password: 'BacSiTimMach@123456', phoneNumber: '0902200004', specialtyCode: '104', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 7, isDepartmentHead: false },
  { code: '2011', fullName: 'Lâm Minh Khoa', email: 'bacsi.taimuihong@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902200005', specialtyCode: '105', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2012', fullName: 'Trương Như Quỳnh', email: 'bacsi.sanphu@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200006', specialtyCode: '106', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2013', fullName: 'Bùi Khánh Linh', email: 'bacsi.mat@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200007', specialtyCode: '107', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2014', fullName: 'Trịnh Anh Dũng', email: 'bacsi.coxuongkhop@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902200008', specialtyCode: '108', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2015', fullName: 'Tạ Ngọc Diệp', email: 'bacsi.ngocdiep@gmail.com', password: 'BacSiNgocDiep@123456', phoneNumber: '0902200009', specialtyCode: '104', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 8, isDepartmentHead: false },

  // Các bác sĩ bổ sung để đảm bảo đủ ca trực (ít nhất 4 bác sĩ / khoa)
  { code: '2024', fullName: 'Đinh Tuấn Tài', email: 'bacsi.noi2@gmail.com', password: 'BacSiNoi@123456', phoneNumber: '0902200010', specialtyCode: '101', academicDegree: 'Bác sĩ', experienceYears: 3, isDepartmentHead: false },
  { code: '2025', fullName: 'Lê Thảo My', email: 'bacsi.noi3@gmail.com', password: 'BacSiNoi@123456', phoneNumber: '0902200011', specialtyCode: '101', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  
  { code: '2026', fullName: 'Trần Gia Bảo', email: 'bacsi.nhi2@gmail.com', password: 'BacSiNhi@123456', phoneNumber: '0902200012', specialtyCode: '102', academicDegree: 'Bác sĩ', experienceYears: 3, isDepartmentHead: false },
  { code: '2027', fullName: 'Ngô Tường Vy', email: 'bacsi.nhi3@gmail.com', password: 'BacSiNhi@123456', phoneNumber: '0902200013', specialtyCode: '102', academicDegree: 'Bác sĩ', experienceYears: 2, isDepartmentHead: false },
  
  { code: '2028', fullName: 'Phạm Đức Trí', email: 'bacsi.dalieu2@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902200014', specialtyCode: '103', academicDegree: 'Bác sĩ', experienceYears: 5, isDepartmentHead: false },
  { code: '2029', fullName: 'Bùi Thị Hà', email: 'bacsi.dalieu3@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902200015', specialtyCode: '103', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  
  { code: '2030', fullName: 'Hoàng Nhật Minh', email: 'bacsi.timmach2@gmail.com', password: 'BacSiTimMach@123456', phoneNumber: '0902200016', specialtyCode: '104', academicDegree: 'Bác sĩ', experienceYears: 3, isDepartmentHead: false },
  { code: '2031', fullName: 'Lý Lan Hương', email: 'bacsi.timmach3@gmail.com', password: 'BacSiTimMach@123456', phoneNumber: '0902200017', specialtyCode: '104', academicDegree: 'Bác sĩ', experienceYears: 5, isDepartmentHead: false },
  
  { code: '2032', fullName: 'Đoàn Hữu Quốc', email: 'bacsi.taimuihong2@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902200018', specialtyCode: '105', academicDegree: 'Bác sĩ', experienceYears: 2, isDepartmentHead: false },
  { code: '2033', fullName: 'Vũ Ngọc Hân', email: 'bacsi.taimuihong3@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902200019', specialtyCode: '105', academicDegree: 'Bác sĩ', experienceYears: 3, isDepartmentHead: false },
  
  { code: '2034', fullName: 'Lưu Tiến Đạt', email: 'bacsi.sanphu2@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200020', specialtyCode: '106', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2035', fullName: 'Trần Bích Liên', email: 'bacsi.sanphu3@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200021', specialtyCode: '106', academicDegree: 'Bác sĩ', experienceYears: 5, isDepartmentHead: false },
  
  { code: '2036', fullName: 'Tô Vĩnh Kiên', email: 'bacsi.mat2@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200022', specialtyCode: '107', academicDegree: 'Bác sĩ', experienceYears: 2, isDepartmentHead: false },
  { code: '2037', fullName: 'Dương Cẩm Tú', email: 'bacsi.mat3@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200023', specialtyCode: '107', academicDegree: 'Bác sĩ', experienceYears: 3, isDepartmentHead: false },
  
  { code: '2038', fullName: 'Khúc Cảnh Tùng', email: 'bacsi.coxuongkhop2@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902200024', specialtyCode: '108', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2039', fullName: 'Hồ Ánh Tuyết', email: 'bacsi.coxuongkhop3@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902200025', specialtyCode: '108', academicDegree: 'Bác sĩ', experienceYears: 6, isDepartmentHead: false },

  // Trưởng khoa — vẫn là bác sĩ, được gán thêm QuanLyDonVi
  { code: '2016', fullName: 'Nguyễn Minh Anh', email: 'truongkhoa.noi@gmail.com', password: 'TruongKhoaNoi@123456', phoneNumber: '0902100001', specialtyCode: '101', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 14, isDepartmentHead: true },
  { code: '2017', fullName: 'Lê Thu Trang', email: 'truongkhoa.nhi@gmail.com', password: 'TruongKhoaNhi@123456', phoneNumber: '0902100002', specialtyCode: '102', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 12, isDepartmentHead: true },
  { code: '2018', fullName: 'Phạm Hoàng Long', email: 'truongkhoa.dalieu@gmail.com', password: 'TruongKhoaDaLieu@123456', phoneNumber: '0902100003', specialtyCode: '103', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 13, isDepartmentHead: true },
  { code: '2019', fullName: 'Trần Quốc Bảo', email: 'truongkhoa.timmach@gmail.com', password: 'TruongKhoaTimMach@123456', phoneNumber: '0902100004', specialtyCode: '104', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 15, isDepartmentHead: true },
  { code: '2020', fullName: 'Vũ Ngọc Mai', email: 'truongkhoa.taimuihong@gmail.com', password: 'TruongKhoaTaiMuiHong@123456', phoneNumber: '0902100005', specialtyCode: '105', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 13, isDepartmentHead: true },
  { code: '2021', fullName: 'Đặng Hải Yến', email: 'truongkhoa.sanphu@gmail.com', password: 'TruongKhoaSanPhu@123456', phoneNumber: '0902100006', specialtyCode: '106', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 14, isDepartmentHead: true },
  { code: '2022', fullName: 'Hoàng Đức Nam', email: 'truongkhoa.mat@gmail.com', password: 'TruongKhoaMat@123456', phoneNumber: '0902100007', specialtyCode: '107', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 16, isDepartmentHead: true },
  { code: '2023', fullName: 'Bùi Thanh Sơn', email: 'truongkhoa.coxuongkhop@gmail.com', password: 'TruongKhoaCoXuongKhop@123456', phoneNumber: '0902100008', specialtyCode: '108', academicDegree: 'Bác sĩ chuyên khoa II', experienceYears: 17, isDepartmentHead: true },
  // Bổ sung đủ tối thiểu 5 bác sĩ cho các khoa cần phủ lịch trực cuối tuần.
  { code: '2040', fullName: 'Nguyễn Thùy Dương', email: 'bacsi.sanphu4@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200026', specialtyCode: '106', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2041', fullName: 'Phạm Minh Ngọc', email: 'bacsi.mat4@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200027', specialtyCode: '107', academicDegree: 'Bác sĩ', experienceYears: 5, isDepartmentHead: false },

  // Bổ sung nhân sự để mỗi khoa có tối thiểu 7 bác sĩ phục vụ ca ngày và trực đêm.
  { code: '2042', fullName: 'Trần Minh Quang', email: 'bacsi.noi4@gmail.com', password: 'BacSiNoi@123456', phoneNumber: '0902200028', specialtyCode: '101', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2043', fullName: 'Võ Thu Hà', email: 'bacsi.noi5@gmail.com', password: 'BacSiNoi@123456', phoneNumber: '0902200029', specialtyCode: '101', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2044', fullName: 'Nguyễn Hải Đăng', email: 'bacsi.nhi4@gmail.com', password: 'BacSiNhi@123456', phoneNumber: '0902200030', specialtyCode: '102', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2045', fullName: 'Phan Ngọc Diễm', email: 'bacsi.nhi5@gmail.com', password: 'BacSiNhi@123456', phoneNumber: '0902200031', specialtyCode: '102', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2046', fullName: 'Lê Tuấn Kiệt', email: 'bacsi.dalieu4@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902200032', specialtyCode: '103', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2047', fullName: 'Đặng Minh Châu', email: 'bacsi.dalieu5@gmail.com', password: 'BacSiDaLieu@123456', phoneNumber: '0902200033', specialtyCode: '103', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2048', fullName: 'Nguyễn Hoài Phương', email: 'bacsi.timmach4@gmail.com', password: 'BacSiTimMach@123456', phoneNumber: '0902200034', specialtyCode: '104', academicDegree: 'Thạc sĩ, Bác sĩ', experienceYears: 7, isDepartmentHead: false },
  { code: '2049', fullName: 'Trương Đức Anh', email: 'bacsi.taimuihong4@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902200035', specialtyCode: '105', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 5, isDepartmentHead: false },
  { code: '2050', fullName: 'Bùi Thanh Thảo', email: 'bacsi.taimuihong5@gmail.com', password: 'BacSiTaiMuiHong@123456', phoneNumber: '0902200036', specialtyCode: '105', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2051', fullName: 'Hoàng Ngọc Trâm', email: 'bacsi.sanphu5@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200037', specialtyCode: '106', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2052', fullName: 'Nguyễn Mỹ Linh', email: 'bacsi.sanphu6@gmail.com', password: 'BacSiSanPhu@123456', phoneNumber: '0902200038', specialtyCode: '106', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2053', fullName: 'Phạm Quốc Khánh', email: 'bacsi.mat5@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200039', specialtyCode: '107', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2054', fullName: 'Lê Khánh Vy', email: 'bacsi.mat6@gmail.com', password: 'BacSiMat@123456', phoneNumber: '0902200040', specialtyCode: '107', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
  { code: '2055', fullName: 'Nguyễn Trung Hiếu', email: 'bacsi.coxuongkhop4@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902200041', specialtyCode: '108', academicDegree: 'Bác sĩ chuyên khoa I', experienceYears: 6, isDepartmentHead: false },
  { code: '2056', fullName: 'Trần Thảo Nguyên', email: 'bacsi.coxuongkhop5@gmail.com', password: 'BacSiCoXuongKhop@123456', phoneNumber: '0902200042', specialtyCode: '108', academicDegree: 'Bác sĩ', experienceYears: 4, isDepartmentHead: false },
];

await seedDoctorAccounts(DOCTOR_ACCOUNTS);
const departmentHeadCount = DOCTOR_ACCOUNTS.filter(
  (account) => account.isDepartmentHead,
).length;
console.log(
  `Đã seed ${DOCTOR_ACCOUNTS.length} bác sĩ, gồm ${departmentHeadCount} trưởng khoa`,
);
