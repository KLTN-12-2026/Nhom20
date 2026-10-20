import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HinhThucKham,
  Prisma,
  TrangThaiHoaDon,
  TrangThaiHoSoKham,
  TrangThaiChung,
  TrangThaiHangCho,
  TrangThaiLichHen,
  TrangThaiLuotKham,
  NguonDatLich,
  ChucVuQuanLyDonVi,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  receptionInclude,
  receptionTicketInclude,
  followUpInclude,
  type CreateReceptionData,
  type ReceptionDashboardData,
  type ReceptionRepository,
} from './reception.repository.interface';

function countAll(item: { _count?: true | { _all?: number } }) {
  return typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
}

@Injectable()
export class PrismaReceptionRepository implements ReceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  searchPatients(search: string) {
    return this.prisma.benhNhan.findMany({
      where: search
        ? {
            AND: [
              {
                luotKham: {
                  some: {
                    hoSoKham: { isNot: null },
                    hoaDon: {
                      is: { trangThai: TrangThaiHoaDon.DA_THANH_TOAN },
                    },
                  },
                },
              },
            ],
            OR: [
              { hoTen: { contains: search, mode: 'insensitive' } },
              { soDienThoai: { contains: search } },
            ],
          }
        : {
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
        diUng: {
          select: {
            id: true,
            tacNhanDiUng: true,
            phanUng: true,
            mucDo: true,
            trangThaiXacNhan: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Lọc danh sách bệnh nhân theo chuyên khoa khi người xem là Trưởng khoa.
  searchAllPatients(search: string, specialtyIds?: number[]) {
    const filters: Prisma.BenhNhanWhereInput[] = [];
    if (search) {
      filters.push({
        OR: [
          { hoTen: { contains: search, mode: 'insensitive' } },
          { maBenhNhan: { contains: search, mode: 'insensitive' } },
          { soDienThoai: { contains: search } },
        ],
      });
    }
    if (specialtyIds?.length) {
      filters.push({
        OR: [
          { luotKham: { some: { chuyenKhoaId: { in: specialtyIds } } } },
          { lichHen: { some: { chuyenKhoaId: { in: specialtyIds } } } },
        ],
      });
    }
    return this.prisma.benhNhan.findMany({
      where: filters.length ? { AND: filters } : undefined,
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
        diUng: {
          select: {
            id: true,
            tacNhanDiUng: true,
            phanUng: true,
            mucDo: true,
            trangThaiXacNhan: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Chỉ trả về lịch sử thuộc khoa Trưởng khoa đang phụ trách.
  findPatientRecord(id: number, specialtyIds?: number[]) {
    const visitWhere = specialtyIds?.length
      ? { chuyenKhoaId: { in: specialtyIds } }
      : undefined;
    return this.prisma.benhNhan.findFirst({
      where: {
        id,
        ...(specialtyIds?.length
          ? {
              OR: [
                { luotKham: { some: { chuyenKhoaId: { in: specialtyIds } } } },
                { lichHen: { some: { chuyenKhoaId: { in: specialtyIds } } } },
              ],
            }
          : {}),
      },
      include: {
        diUng: {
          select: {
            id: true,
            tacNhanDiUng: true,
            phanUng: true,
            mucDo: true,
            trangThaiXacNhan: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        luotKham: {
          where: visitWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            chuyenKhoa: true,
            bacSi: true,
            hoSoKham: {
              include: {
                donThuoc: {
                  include: {
                    nguoiTuChoi: { select: { hoTen: true } },
                    chiTiet: { include: { thuoc: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Lấy chuyên khoa thật mà Trưởng khoa được phân quyền quản lý.
  async findManagedSpecialtyIds(userId: number) {
    const managers = await this.prisma.quanLyDonVi.findMany({
      where: {
        nguoiDungId: userId,
        chucVu: ChucVuQuanLyDonVi.TRUONG_DON_VI,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      select: { donViLamViec: { select: { chuyenKhoaId: true } } },
    });
    const ids = [
      ...new Set(
        managers
          .map((manager) => manager.donViLamViec.chuyenKhoaId)
          .filter((specialtyId): specialtyId is number => specialtyId !== null),
      ),
    ];
    if (ids.length > 0) return ids;

    const doctor = await this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      select: { chuyenKhoaId: true },
    });
    return doctor?.chuyenKhoaId ? [doctor.chuyenKhoaId] : [];
  }

  async doctorMatchesSpecialty(doctorId: number, specialtyId: number) {
    return Boolean(
      await this.prisma.bacSi.findFirst({
        where: {
          id: doctorId,
          chuyenKhoaId: specialtyId,
          trangThai: TrangThaiChung.DANG_HOAT_DONG,
        },
        select: { id: true },
      }),
    );
  }

  async create(data: CreateReceptionData) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            let patientId = data.patientId;
            if (patientId) {
              const patient = await transaction.benhNhan.findUnique({
                where: { id: patientId },
                select: { id: true },
              });
              if (!patient)
                throw new NotFoundException('Không tìm thấy bệnh nhân');
            } else if (data.patient) {
              const existing = await transaction.benhNhan.findFirst({
                where: { soDienThoai: data.patient.phoneNumber },
                orderBy: { id: 'asc' },
              });
              const patient = existing
                ? await transaction.benhNhan.update({
                    where: { id: existing.id },
                    data: {
                      hoTen: data.patient.fullName,
                      ngaySinh: data.patient.dateOfBirth,
                      gioiTinh: data.patient.gender,
                      email: data.patient.email,
                      diaChi: data.patient.address,
                      soCanCuoc: data.patient.identityNumber,
                      maTheBaoHiemYTe: data.patient.healthInsuranceNumber,
                    },
                  })
                : await transaction.benhNhan.create({
                    data: {
                      maBenhNhan: data.patient.code,
                      hoTen: data.patient.fullName,
                      soDienThoai: data.patient.phoneNumber,
                      ngaySinh: data.patient.dateOfBirth,
                      gioiTinh: data.patient.gender,
                      email: data.patient.email,
                      diaChi: data.patient.address,
                      soCanCuoc: data.patient.identityNumber,
                      maTheBaoHiemYTe: data.patient.healthInsuranceNumber,
                    },
                  });
              patientId = patient.id;
            }
            if (!patientId)
              throw new NotFoundException('Thiếu hồ sơ bệnh nhân');

            // DỊ ỨNG BỆNH NHÂN
            for (const allergy of data.allergies) {
              const allergyAgent = allergy.agent.trim();
              if (!allergyAgent) continue;

              const existingAllergy = await transaction.diUngBenhNhan.findFirst(
                {
                  where: {
                    benhNhanId: patientId,
                    tacNhanDiUng: { equals: allergyAgent, mode: 'insensitive' },
                  },
                  select: { id: true },
                },
              );
              if (existingAllergy) {
                await transaction.diUngBenhNhan.update({
                  where: { id: existingAllergy.id },
                  data: {
                    phanUng: allergy.reaction,
                    mucDo: allergy.severity,
                    trangThaiXacNhan: 'CHUA_XAC_NHAN',
                    nguonThongTin: 'TIEP_DON',
                    nguoiGhiNhanId: data.confirmerId,
                  },
                });
              } else {
                await transaction.diUngBenhNhan.create({
                  data: {
                    benhNhanId: patientId,
                    tacNhanDiUng: allergyAgent,
                    phanUng: allergy.reaction,
                    mucDo: allergy.severity,
                    trangThaiXacNhan: 'CHUA_XAC_NHAN',
                    nguonThongTin: 'TIEP_DON',
                    nguoiGhiNhanId: data.confirmerId,
                  },
                });
              }
            }

            const lastTicket = await transaction.phieuHangCho.findFirst({
              where: {
                ngayXepHang: data.date,
                chuyenKhoaId: data.specialtyId,
              },
              orderBy: { soThuTu: 'desc' },
              select: { soThuTu: true },
            });
            const ordinal = (lastTicket?.soThuTu ?? 0) + 1;

            return transaction.lichHen.create({
              data: {
                maLichHen: data.appointmentCode,
                benhNhanId: patientId,
                chuyenKhoaId: data.specialtyId,
                bacSiId: data.doctorId,
                ngayHen: data.date,
                gioBatDau: data.startTime,
                gioKetThuc: data.endTime,
                nguonDatLich: NguonDatLich.NHAN_VIEN,
                lyDoKham: data.reason,
                trieuChungBanDau: data.symptoms,
                ghiChu: data.note,
                trangThai: TrangThaiLichHen.DA_CHECK_IN,
                nguoiXacNhanId: data.confirmerId,
                thoiGianXacNhan: new Date(),
                luotKham: {
                  create: {
                    maLuotKham: data.visitCode,
                    benhNhanId: patientId,
                    chuyenKhoaId: data.specialtyId,
                    bacSiId: data.doctorId,
                    hinhThucKham: HinhThucKham.KHAM_TRUC_TIEP,
                    lyDoKham: data.reason,
                    trieuChungBanDau: data.symptoms,
                    mucDoUuTien: data.priority,
                    trangThai: TrangThaiLuotKham.DANG_CHO,
                    phieuHangCho: {
                      create: {
                        soThuTu: ordinal,
                        maSoThuTu: `${data.queuePrefix}-${ordinal.toString().padStart(3, '0')}`,
                        ngayXepHang: data.date,
                        chuyenKhoaId: data.specialtyId,
                        trangThai: TrangThaiHangCho.CHO_GOI,
                        thoiGianXacNhan: new Date(),
                        nguoiXacNhanId: data.confirmerId,
                      },
                    },
                  },
                },
              },
              include: receptionInclude,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const canRetry =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034');
        if (!canRetry || attempt === 2) throw error;
      }
    }
    throw new Error('Không thể cấp phiếu sau nhiều lần thử');
  }

  findTicketByQueueNumber(queueNumber: string) {
    return this.prisma.phieuHangCho.findFirst({
      where: { maSoThuTu: queueNumber },
      include: receptionTicketInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findTodayQueue(date: Date) {
    return this.prisma.lichHen.findMany({
      // Hàng đợi chỉ nhận các lượt check-in đã được cấp phiếu.
      // Lượt check-in cũ thiếu phiếu không được làm lỗi toàn bộ danh sách.
      where: {
        ngayHen: date,
        trangThai: TrangThaiLichHen.DA_CHECK_IN,
        luotKham: {
          is: {
            phieuHangCho: {
              is: {
                trangThai: {
                  in: [
                    TrangThaiHangCho.CHO_GOI,
                    TrangThaiHangCho.DANG_GOI,
                    TrangThaiHangCho.BO_QUA,
                  ],
                },
              },
            },
          },
        },
      },
      include: receptionInclude,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  findFollowUps(from: Date, to: Date) {
    return this.prisma.hoSoKham.findMany({
      where: {
        trangThai: TrangThaiHoSoKham.DA_HOAN_TAT,
        ngayTaiKham: { gte: from, lte: to },
      },
      include: followUpInclude,
      orderBy: [{ ngayTaiKham: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getDashboardData(
    from: Date,
    to: Date,
  ): Promise<ReceptionDashboardData> {
    const upcomingStatuses = [
      TrangThaiLichHen.CHO_XAC_NHAN,
      TrangThaiLichHen.DA_XAC_NHAN,
      TrangThaiLichHen.DA_CHECK_IN,
    ];

    const [
      appointmentsByDay,
      appointmentStatuses,
      queueStatuses,
      queueBySpecialty,
      upcomingAppointments,
    ] = await this.prisma.$transaction([
      this.prisma.lichHen.groupBy({
        by: ['ngayHen'],
        where: { ngayHen: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { ngayHen: 'asc' },
      }),
      this.prisma.lichHen.groupBy({
        by: ['trangThai'],
        where: { ngayHen: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { trangThai: 'asc' },
      }),
      this.prisma.phieuHangCho.groupBy({
        by: ['trangThai'],
        where: { ngayXepHang: from },
        _count: { _all: true },
        orderBy: { trangThai: 'asc' },
      }),
      this.prisma.phieuHangCho.groupBy({
        by: ['chuyenKhoaId'],
        where: { 
          ngayXepHang: from,
          trangThai: { in: [TrangThaiHangCho.CHO_GOI, TrangThaiHangCho.DANG_GOI] }
        },
        _count: { _all: true },
        orderBy: { chuyenKhoaId: 'asc' },
      }),
      this.prisma.lichHen.findMany({
        where: {
          ngayHen: { gte: from, lte: to },
          trangThai: { in: upcomingStatuses },
        },
        include: receptionInclude,
        orderBy: [{ ngayHen: 'asc' }, { gioBatDau: 'asc' }],
        take: 6,
      }),
    ]);

    const specialtyIds = new Set([
      ...queueBySpecialty.map((item) => item.chuyenKhoaId),
    ]);
    const specialties = specialtyIds.size
      ? await this.prisma.chuyenKhoa.findMany({
          where: { id: { in: [...specialtyIds] } },
          select: { id: true, tenChuyenKhoa: true },
        })
      : [];

    return {
      appointmentsByDay: appointmentsByDay.map((item) => ({
        ngayHen: item.ngayHen,
        _count: { _all: countAll(item) },
      })),
      appointmentStatuses: appointmentStatuses.map((item) => ({
        trangThai: item.trangThai,
        _count: { _all: countAll(item) },
      })),
      queueStatuses: queueStatuses.map((item) => ({
        trangThai: item.trangThai,
        _count: { _all: countAll(item) },
      })),
      queueBySpecialty: queueBySpecialty.map((item) => ({
        chuyenKhoaId: item.chuyenKhoaId,
        _count: { _all: countAll(item) },
      })),
      specialties,
      upcomingAppointments,
    };
  }

  async findSpecialtyName(specialtyId: number): Promise<string | null> {
    const specialty = await this.prisma.chuyenKhoa.findUnique({
      where: { id: specialtyId },
      select: { tenChuyenKhoa: true },
    });
    return specialty?.tenChuyenKhoa ?? null;
  }
}
