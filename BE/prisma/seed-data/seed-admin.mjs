import { createSeedClient, upsertRoleAccount } from './seed-tien-ich.mjs';

const ADMIN_ACCOUNTS = [
  {
    fullName: 'Nguyễn Minh Quân',
    email: 'admin@gmail.com',
    password: 'Admin@123456',
    phoneNumber: '0901000001',
    roleCode: 'ADMIN',
    roleName: 'Quản trị viên',
  },
];

const prisma = createSeedClient();
try {
  await prisma.$transaction(async (transaction) => {
    for (const account of ADMIN_ACCOUNTS) {
      await upsertRoleAccount(transaction, account);
      console.log(`Đã seed ADMIN: ${account.email}`);
    }
  }, { timeout: 30_000 });
} finally {
  await prisma.$disconnect();
}
