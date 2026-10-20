import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '.env', quiet: true });

export function createSeedClient() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không được chạy tài khoản phát triển trên production');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Thiếu biến môi trường DATABASE_URL');
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function upsertRoleAccount(transaction, account) {
  const [passwordHash, role] = await Promise.all([
    hash(account.password, 12),
    transaction.vaiTro.upsert({
      where: { maVaiTro: account.roleCode },
      update: { tenVaiTro: account.roleName },
      create: {
        maVaiTro: account.roleCode,
        tenVaiTro: account.roleName,
        moTa: `Vai trò ${account.roleName} của Smart Clinic`,
      },
    }),
  ]);

  const user = await transaction.nguoiDung.upsert({
    where: { email: account.email },
    update: {
      hoTen: account.fullName,
      soDienThoai: account.phoneNumber,
      matKhau: passwordHash,
      trangThai: 'DANG_HOAT_DONG',
    },
    create: {
      email: account.email,
      hoTen: account.fullName,
      soDienThoai: account.phoneNumber,
      matKhau: passwordHash,
      trangThai: 'DANG_HOAT_DONG',
    },
  });

  await transaction.nguoiDungVaiTro.upsert({
    where: {
      nguoiDungId_vaiTroId: { nguoiDungId: user.id, vaiTroId: role.id },
    },
    update: {},
    create: { nguoiDungId: user.id, vaiTroId: role.id },
  });
  return { user, role };
}

export async function seedDoctorAccounts(accounts) {
  const prisma = createSeedClient();
  const preparedAccounts = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      passwordHash: await hash(account.password, 12),
    })),
  );

  try {
    await prisma.$transaction(async (transaction) => {
      const role = await transaction.vaiTro.upsert({
        where: { maVaiTro: 'DOCTOR' },
        update: { tenVaiTro: 'Bác sĩ' },
        create: {
          maVaiTro: 'DOCTOR',
          tenVaiTro: 'Bác sĩ',
          moTa: 'Bác sĩ khám và điều trị tại Smart Clinic',
        },
      });

      for (const account of preparedAccounts) {
        const isDepartmentHead = account.isDepartmentHead === true;
        const specialty = await transaction.chuyenKhoa.findUniqueOrThrow({
          where: { maChuyenKhoa: account.specialtyCode },
        });
        const user = await transaction.nguoiDung.upsert({
          where: { email: account.email },
          update: {
            hoTen: account.fullName,
            soDienThoai: account.phoneNumber,
            matKhau: account.passwordHash,
            trangThai: 'DANG_HOAT_DONG',
          },
          create: {
            email: account.email,
            hoTen: account.fullName,
            soDienThoai: account.phoneNumber,
            matKhau: account.passwordHash,
            trangThai: 'DANG_HOAT_DONG',
          },
        });
        await transaction.nguoiDungVaiTro.upsert({
          where: {
            nguoiDungId_vaiTroId: { nguoiDungId: user.id, vaiTroId: role.id },
          },
          update: {},
          create: { nguoiDungId: user.id, vaiTroId: role.id },
        });
        await transaction.bacSi.upsert({
          where: { nguoiDungId: user.id },
          update: {
            maBacSi: account.code,
            chuyenKhoaId: specialty.id,
            hoTen: account.fullName,
            soDienThoai: account.phoneNumber,
            hocVi: account.academicDegree,
            soNamKinhNghiem: account.experienceYears,
            moTa: isDepartmentHead
              ? 'Trưởng khoa phụ trách chuyên môn và duyệt lịch làm việc.'
              : 'Bác sĩ khám và điều trị theo phân công của chuyên khoa.',
            trangThai: 'DANG_HOAT_DONG',
          },
          create: {
            nguoiDungId: user.id,
            maBacSi: account.code,
            chuyenKhoaId: specialty.id,
            hoTen: account.fullName,
            soDienThoai: account.phoneNumber,
            hocVi: account.academicDegree,
            soNamKinhNghiem: account.experienceYears,
            moTa: isDepartmentHead
              ? 'Trưởng khoa phụ trách chuyên môn và duyệt lịch làm việc.'
              : 'Bác sĩ khám và điều trị theo phân công của chuyên khoa.',
            trangThai: 'DANG_HOAT_DONG',
          },
        });

        if (isDepartmentHead) {
          const unit = await transaction.donViLamViec.upsert({
            where: { chuyenKhoaId: specialty.id },
            update: { trangThai: 'DANG_HOAT_DONG' },
            create: {
              maDonVi: `DV_${account.specialtyCode}`,
              tenDonVi: specialty.tenChuyenKhoa,
              loaiDonVi: 'CHUYEN_KHOA',
              chuyenKhoaId: specialty.id,
              trangThai: 'DANG_HOAT_DONG',
            },
          });
          await transaction.quanLyDonVi.upsert({
            where: {
              donViLamViecId_nguoiDungId_chucVu_ngayBatDau: {
                donViLamViecId: unit.id,
                nguoiDungId: user.id,
                chucVu: 'TRUONG_DON_VI',
                ngayBatDau: new Date('2026-01-01'),
              },
            },
            update: { ngayKetThuc: null, trangThai: 'DANG_HOAT_DONG' },
            create: {
              donViLamViecId: unit.id,
              nguoiDungId: user.id,
              chucVu: 'TRUONG_DON_VI',
              ngayBatDau: new Date('2026-01-01'),
              trangThai: 'DANG_HOAT_DONG',
            },
          });
        }
      }
    }, { maxWait: 20_000, timeout: 120_000 });
  } finally {
    await prisma.$disconnect();
  }
}
