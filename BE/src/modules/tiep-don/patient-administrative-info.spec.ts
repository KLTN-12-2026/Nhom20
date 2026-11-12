import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TrangThaiHoaDon } from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { PrismaReceptionRepository } from './repositories/prisma-reception.repository';
import { RECEPTION_REPOSITORY } from './repositories/reception.repository.interface';
import { ReceptionsController } from './receptions.controller';
import { ReceptionsService } from './receptions.service';

describe('Thông tin hành chính bệnh nhân cho thu ngân', () => {
  let app: INestApplication;
  const patient = {
    id: 1,
    maBenhNhan: 'BN-TEST',
    hoTen: 'Bệnh nhân kiểm thử',
    soDienThoai: '0900000000',
    email: null,
    ngaySinh: new Date('2000-01-02T00:00:00Z'),
    gioiTinh: 'NU',
    diaChi: null,
    soCanCuoc: null,
    maTheBaoHiemYTe: null,
    nguoiLienHeKhanCap: 'Người liên hệ',
    soDienThoaiKhanCap: '0900000001',
  };
  const repository = {
    findPatientAdministrativeInfo: jest.fn((id: number) =>
      Promise.resolve(id === 1 ? patient : null),
    ),
    findPatientRecord: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReceptionsController],
      providers: [
        ReceptionsService,
        { provide: RECEPTION_REPOSITORY, useValue: repository },
        { provide: AuditLogsService, useValue: {} },
        { provide: RealtimeService, useValue: {} },
        { provide: ThongBaoService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: import('@nestjs/common').ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { id: number; roles: string[]; permissions: string[] };
          }>();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = {
            id: 1,
            roles: [role],
            permissions: (req.headers['x-test-permissions'] ?? '')
              .split(',')
              .filter(Boolean),
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('trả riêng thông tin hành chính khi thu ngân có quyền xem', async () => {
    const res = await request(app.getHttpServer())
      .get('/receptions/patients/1/administrative')
      .set('x-test-role', 'RECEPTIONIST')
      .set('x-test-permissions', 'BENH_NHAN.VIEW')
      .expect(200);
    const body = res.body as { data: unknown };
    expect(body.data).toEqual({
      id: 1,
      code: 'BN-TEST',
      fullName: patient.hoTen,
      phoneNumber: patient.soDienThoai,
      email: null,
      dateOfBirth: '2000-01-02',
      gender: 'NU',
      address: null,
      identityNumber: null,
      healthInsuranceNumber: null,
      emergencyContactName: patient.nguoiLienHeKhanCap,
      emergencyContactPhone: patient.soDienThoaiKhanCap,
    });
    expect(body.data).not.toHaveProperty('visits');
    expect(body.data).not.toHaveProperty('prescription');
    expect(body.data).not.toHaveProperty('allergies');
    expect(repository.findPatientRecord).not.toHaveBeenCalled();
  });

  it.each(['RECEPTIONIST', 'TIEP_DON_THU_NGAN'])(
    'hỗ trợ vai trò %s khi có quyền xem bệnh nhân',
    async (role) => {
      await request(app.getHttpServer())
        .get('/receptions/patients/1/administrative')
        .set('x-test-role', role)
        .set('x-test-permissions', 'BENH_NHAN.VIEW')
        .expect(200);
    },
  );

  it('chặn khi chưa đăng nhập hoặc không có quyền xem bệnh nhân', async () => {
    await request(app.getHttpServer())
      .get('/receptions/patients/1/administrative')
      .expect(401);
    await request(app.getHttpServer())
      .get('/receptions/patients/1/administrative')
      .set('x-test-role', 'RECEPTIONIST')
      .set('x-test-permissions', 'TIEP_DON.VIEW')
      .expect(403);
    expect(repository.findPatientAdministrativeInfo).not.toHaveBeenCalled();
  });

  it('không mở rộng quyền xem bệnh án cho thu ngân', async () => {
    await request(app.getHttpServer())
      .get('/receptions/patients/1')
      .set('x-test-role', 'RECEPTIONIST')
      .set('x-test-permissions', 'BENH_NHAN.VIEW')
      .expect(403);
    expect(repository.findPatientRecord).not.toHaveBeenCalled();
  });

  it('trả 404 nếu bệnh nhân không thuộc danh sách tiếp đón', async () => {
    await request(app.getHttpServer())
      .get('/receptions/patients/999/administrative')
      .set('x-test-role', 'RECEPTIONIST')
      .set('x-test-permissions', 'BENH_NHAN.VIEW')
      .expect(404);
  });

  it('truy vấn chỉ chọn trường hành chính và giữ điều kiện danh sách cũ', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repo = new PrismaReceptionRepository({
      benhNhan: { findFirst },
    } as never);
    await repo.findPatientAdministrativeInfo(1);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        luotKham: {
          some: {
            hoSoKham: { isNot: null },
            hoaDon: { is: { trangThai: TrangThaiHoaDon.DA_THANH_TOAN } },
          },
        },
      },
      select: {
        id: true,
        maBenhNhan: true,
        hoTen: true,
        soDienThoai: true,
        email: true,
        ngaySinh: true,
        gioiTinh: true,
        diaChi: true,
        soCanCuoc: true,
        maTheBaoHiemYTe: true,
        nguoiLienHeKhanCap: true,
        soDienThoaiKhanCap: true,
      },
    });
  });
});
