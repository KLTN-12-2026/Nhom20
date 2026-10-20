import { Injectable } from '@nestjs/common';
import {
  HinhThucKham,
  Prisma,
  TrangThaiChung,
  TrangThaiHangCho,
  TrangThaiLichHen,
  TrangThaiLuotKham,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  appointmentInclude,
  type AppointmentFilters,
  type AppointmentRepository,
  type AppointmentWithRelations,
  type ExistingPatientAppointmentData,
  type GuestAppointmentData,
} from './appointment.repository.interface';

@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayStats(today: Date, doctorId?: number) {
    const doctorFilter = doctorId ? { bacSiId: doctorId } : {};
    const [total, pending, confirmed, checkedIn] =
      await this.prisma.$transaction([
        this.prisma.lichHen.count({
          where: { ngayHen: today, ...doctorFilter },
        }),
        this.prisma.lichHen.count({
          where: {
            ngayHen: today,
            ...doctorFilter,
            trangThai: TrangThaiLichHen.CHO_XAC_NHAN,
          },
        }),
        this.prisma.lichHen.count({
          where: {
            ngayHen: today,
            ...doctorFilter,
            // Lịch đã cấp phiếu bắt buộc đã qua bước xác nhận nên vẫn tính vào chỉ số này.
            trangThai: {
              in: [
                TrangThaiLichHen.DA_XAC_NHAN,
                TrangThaiLichHen.DA_CHECK_IN,
              ],
            },
          },
        }),
        this.prisma.lichHen.count({
          where: {
            ngayHen: today,
            ...doctorFilter,
            trangThai: TrangThaiLichHen.DA_CHECK_IN,
          },
        }),
      ]);
    return { total, pending, confirmed, checkedIn };
  }

  async findDoctorIdByUserId(userId: number) {
    const doctor = await this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    return doctor?.id ?? null;
  }

  async findAll(filters: AppointmentFilters) {
    const where = {
      ...(filters.specialtyId ? { chuyenKhoaId: filters.specialtyId } : {}),
      ...(filters.doctorId ? { bacSiId: filters.doctorId } : {}),
      ...(filters.date ? { ngayHen: filters.date } : {}),
      ...(filters.status ? { trangThai: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                maLichHen: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                benhNhan: {
                  hoTen: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                benhNhan: {
                  soDienThoai: { contains: filters.search },
                },
              },
            ],
          }
        : {}),
    };
    const [allItems, total] = await this.prisma.$transaction([
      this.prisma.lichHen.findMany({
        where,
        include: appointmentInclude,
      }),
      this.prisma.lichHen.count({ where }),
    ]);

    // Danh sách điều phối ưu tiên lịch hôm nay, sau đó đến ngày gần nhất.
    // Sắp xếp tại Repository trước khi phân trang để FE nhận đúng thứ tự dữ liệu thật.
    const today = this.today();
    const items = allItems
      .sort((left, right) => this.compareAppointments(left, right, today))
      .slice(filters.skip, filters.skip + filters.take);
    return { items, total };
  }

  private compareAppointments(
    left: AppointmentWithRelations,
    right: AppointmentWithRelations,
    today: Date,
  ) {
    const leftDate = left.ngayHen.getTime();
    const rightDate = right.ngayHen.getTime();
    const todayTime = today.getTime();
    const rank = (date: number) =>
      date === todayTime ? 0 : date > todayTime ? 1 : 2;
    const rankDifference = rank(leftDate) - rank(rightDate);
    if (rankDifference) return rankDifference;

    if (leftDate !== rightDate) {
      // Lịch tương lai gần nhất trước; lịch quá khứ gần nhất cũng đứng đầu nhóm quá khứ.
      return leftDate > todayTime ? leftDate - rightDate : rightDate - leftDate;
    }
    return left.gioBatDau.getTime() - right.gioBatDau.getTime();
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  findById(id: number) {
    return this.prisma.lichHen.findUnique({
      where: { id },
      include: appointmentInclude,
    });
  }

  async specialtyExists(id: number) {
    return Boolean(
      await this.prisma.chuyenKhoa.findFirst({
        where: { id, trangThai: TrangThaiChung.DANG_HOAT_DONG },
        select: { id: true },
      }),
    );
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

  findDuplicate(phoneNumber: string, date: Date, startTime: Date) {
    return this.prisma.lichHen.findFirst({
      where: {
        benhNhan: { soDienThoai: phoneNumber },
        ngayHen: date,
        gioBatDau: startTime,
        trangThai: {
          in: [TrangThaiLichHen.CHO_XAC_NHAN, TrangThaiLichHen.DA_XAC_NHAN],
        },
      },
      select: { id: true },
    });
  }

  async findPatientByUserId(userId: number) {
    let patient = await this.prisma.benhNhan.findFirst({
      where: { nguoiDungId: userId },
      select: { id: true, hoTen: true, soDienThoai: true },
    });

    if (!patient) {
      const user = await this.prisma.nguoiDung.findUnique({
        where: { id: userId },
        include: { benhNhan: true },
      });
      if (user) {
        if (user.benhNhan) {
          patient = {
            id: user.benhNhan.id,
            hoTen: user.benhNhan.hoTen,
            soDienThoai: user.benhNhan.soDienThoai,
          };
        } else if (user.soDienThoai) {
          const existingByPhone = await this.prisma.benhNhan.findFirst({
            where: { soDienThoai: user.soDienThoai },
          });
          if (existingByPhone) {
            await this.prisma.benhNhan.update({
              where: { id: existingByPhone.id },
              data: { nguoiDungId: user.id },
            });
            patient = {
              id: existingByPhone.id,
              hoTen: existingByPhone.hoTen,
              soDienThoai: existingByPhone.soDienThoai,
            };
          } else {
            const code = `BN-${Date.now()}-${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, '0')}`;
            const created = await this.prisma.benhNhan.create({
              data: {
                nguoiDungId: user.id,
                maBenhNhan: code,
                hoTen: user.hoTen,
                soDienThoai: user.soDienThoai,
                email: user.email,
              },
            });
            patient = {
              id: created.id,
              hoTen: created.hoTen,
              soDienThoai: created.soDienThoai,
            };
          }
        }
      }
    }

    return patient
      ? {
          id: patient.id,
          fullName: patient.hoTen,
          phoneNumber: patient.soDienThoai,
        }
      : null;
  }

  findPatientForAppointment(patientId: number) {
    return this.prisma.benhNhan
      .findFirst({
        where: {
          OR: [{ id: patientId }, { nguoiDungId: patientId }],
        },
        select: { id: true, hoTen: true, soDienThoai: true },
      })
      .then((patient) =>
        patient
          ? {
              id: patient.id,
              fullName: patient.hoTen,
              phoneNumber: patient.soDienThoai,
            }
          : null,
      );
  }

  createGuest(data: GuestAppointmentData) {
    return this.prisma.$transaction(async (transaction) => {
      let patient = await transaction.benhNhan.findFirst({
        where: { soDienThoai: data.patient.phoneNumber },
        orderBy: { id: 'asc' },
      });
      if (patient) {
        patient = await transaction.benhNhan.update({
          where: { id: patient.id },
          data: {
            hoTen: data.patient.fullName,
            ngaySinh: data.patient.dateOfBirth,
            gioiTinh: data.patient.gender,
            email: data.patient.email,
          },
        });
      } else {
        patient = await transaction.benhNhan.create({
          data: {
            maBenhNhan: data.patient.code,
            hoTen: data.patient.fullName,
            soDienThoai: data.patient.phoneNumber,
            ngaySinh: data.patient.dateOfBirth,
            gioiTinh: data.patient.gender,
            email: data.patient.email,
          },
        });
      }
      return transaction.lichHen.create({
        data: {
          maLichHen: data.appointment.code,
          benhNhanId: patient.id,
          chuyenKhoaId: data.appointment.specialtyId,
          bacSiId: data.appointment.doctorId,
          ngayHen: data.appointment.date,
          gioBatDau: data.appointment.startTime,
          gioKetThuc: data.appointment.endTime,
          nguonDatLich: data.appointment.source,
          lyDoKham: data.appointment.reason,
          ghiChu: data.appointment.note,
          trangThai: TrangThaiLichHen.CHO_XAC_NHAN,
        },
        include: appointmentInclude,
      });
    });
  }

  createForExistingPatient(data: ExistingPatientAppointmentData) {
    return this.prisma.lichHen.create({
      data: {
        maLichHen: data.appointment.code,
        benhNhanId: data.patientId,
        chuyenKhoaId: data.appointment.specialtyId,
        bacSiId: data.appointment.doctorId,
        ngayHen: data.appointment.date,
        gioBatDau: data.appointment.startTime,
        gioKetThuc: data.appointment.endTime,
        nguonDatLich: data.appointment.source,
        lyDoKham: data.appointment.reason,
        ghiChu: data.appointment.note,
        trangThai: TrangThaiLichHen.CHO_XAC_NHAN,
      },
      include: appointmentInclude,
    });
  }

  update(
    id: number,
    data: {
      specialtyId?: number;
      doctorId?: number | null;
      date?: Date;
      startTime?: Date;
      endTime?: Date;
      reason?: string;
      note?: string | null;
      status?: TrangThaiLichHen;
      confirmerId?: number | null;
      confirmedAt?: Date | null;
      rejectionOrCancellationReason?: string | null;
    },
  ) {
    return this.prisma.lichHen.update({
      where: { id },
      data: {
        ...(data.specialtyId !== undefined
          ? { chuyenKhoaId: data.specialtyId }
          : {}),
        ...(data.doctorId !== undefined ? { bacSiId: data.doctorId } : {}),
        ...(data.date !== undefined ? { ngayHen: data.date } : {}),
        ...(data.startTime !== undefined ? { gioBatDau: data.startTime } : {}),
        ...(data.endTime !== undefined ? { gioKetThuc: data.endTime } : {}),
        ...(data.reason !== undefined ? { lyDoKham: data.reason } : {}),
        ...(data.note !== undefined ? { ghiChu: data.note } : {}),
        ...(data.status !== undefined ? { trangThai: data.status } : {}),
        ...(data.confirmerId !== undefined
          ? { nguoiXacNhanId: data.confirmerId }
          : {}),
        ...(data.confirmedAt !== undefined
          ? { thoiGianXacNhan: data.confirmedAt }
          : {}),
        ...(data.rejectionOrCancellationReason !== undefined
          ? {
              lyDoTuChoiHoacHuy: data.rejectionOrCancellationReason,
            }
          : {}),
      },
      include: appointmentInclude,
    });
  }

  async delete(id: number) {
    await this.prisma.lichHen.delete({ where: { id } });
  }

  async checkIn(data: {
    appointmentId: number;
    patientId: number;
    specialtyId: number;
    doctorId: number;
    visitCode: string;
    queueCodePrefix: string;
    queueDate: Date;
    appointmentAt: Date;
    reason: string;
    initialSymptoms: string | null;
    currentUserId: number;
  }) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const lastTicket = await transaction.phieuHangCho.findFirst({
              where: {
                ngayXepHang: data.queueDate,
                chuyenKhoaId: data.specialtyId,
              },
              orderBy: { soThuTu: 'desc' },
              select: { soThuTu: true },
            });
            const queueNumber = (lastTicket?.soThuTu ?? 0) + 1;

            await transaction.luotKham.create({
              data: {
                lichHenId: data.appointmentId,
                maLuotKham: data.visitCode,
                benhNhanId: data.patientId,
                chuyenKhoaId: data.specialtyId,
                bacSiId: data.doctorId,
                hinhThucKham: HinhThucKham.DAT_LICH_TRUOC,
                thoiGianHen: data.appointmentAt,
                lyDoKham: data.reason,
                trieuChungBanDau: data.initialSymptoms,
                trangThai: TrangThaiLuotKham.DANG_CHO,
                phieuHangCho: {
                  create: {
                    soThuTu: queueNumber,
                    maSoThuTu: `${data.queueCodePrefix}-${queueNumber.toString().padStart(3, '0')}`,
                    ngayXepHang: data.queueDate,
                    chuyenKhoaId: data.specialtyId,
                    trangThai: TrangThaiHangCho.CHO_GOI,
                    thoiGianXacNhan: new Date(),
                    nguoiXacNhanId: data.currentUserId,
                  },
                },
              },
            });

            return transaction.lichHen.update({
              where: { id: data.appointmentId },
              data: { trangThai: TrangThaiLichHen.DA_CHECK_IN },
              include: appointmentInclude,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const existing = await this.findById(data.appointmentId);
        if (existing?.luotKham?.phieuHangCho) {
          return existing;
        }
        const canRetry =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034');
        if (!canRetry || attempt === 2) {
          throw error;
        }
      }
    }

    throw new Error('Không thể cấp số thứ tự sau nhiều lần thử');
  }
}
