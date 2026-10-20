import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TrangThaiBanGiaoCa,
  TrangThaiHoaDon,
  TrangThaiLichHen,
  TrangThaiPhanCongCa,
} from '@prisma/client';

import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { SaveDutyScheduleDto } from './dto/save-duty-schedule.dto';
import { SaveHandoverDto } from './dto/save-handover.dto';
import { SaveStaffDutyScheduleDto } from './dto/save-staff-duty-schedule.dto';
import {
  WORK_SCHEDULE_REPOSITORY,
  type DoctorScheduleIdentity,
  type ReceptionistScheduleIdentity,
  type ScheduleAssignment,
  type WorkScheduleRepository,
} from './repositories/work-schedule.repository.interface';

@Injectable()
export class WorkSchedulesService {
  constructor(
    @Inject(WORK_SCHEDULE_REPOSITORY)
    private readonly repository: WorkScheduleRepository,
    private readonly realtimeService: RealtimeService,
    private readonly thongBaoService: ThongBaoService,
  ) { }

  // Lấy thông tin chi tiết cho chức năng: ca làm việc
  async findMine(userId: number, weekStartInput: string) {
    const doctor = await this.repository.findDoctorByUserId(userId);
    if (!doctor)
      throw new NotFoundException('Tài khoản chưa liên kết hồ sơ bác sĩ');
    const { from, to } = this.requireWeek(weekStartInput);

    // Lấy từ Chủ nhật tuần trước để xử lý ngày nghỉ bù rơi vào Thứ 2.
    const previousSunday = this.addDays(from, -1);
    const assignments = await this.repository.findAssignments(
      [userId],
      previousSunday,
      to,
    );

    return {
      message: 'Lấy lịch làm việc thành công',
      data: this.buildDoctorSchedule(doctor, assignments, from),
    };
  }

  // Tra cứu công khai lịch đã công bố của bác sĩ cho Chatbox.
  async findDoctorPublicSchedule(doctorId: number, dateInput: string) {
    const doctor = await this.repository.findDoctorById(doctorId);
    if (!doctor) throw new NotFoundException('Không tìm thấy bác sĩ');
    const date = this.date(dateInput);
    const assignments = await this.repository.findAssignments(
      [doctor.nguoiDungId],
      date,
      date,
    );
    const published = assignments.filter(
      (item) => item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
    );
    return {
      message: 'Đã tra cứu lịch bác sĩ',
      data: {
        doctor: { id: doctor.id, fullName: doctor.hoTen },
        date: this.dateKey(date),
        shifts: published.map((item) => ({
          code: item.caLamViec.maCa,
          name: item.caLamViec.tenCa,
          startTime: item.caLamViec.gioBatDau.toISOString().slice(11, 16),
          endTime: item.caLamViec.gioKetThuc.toISOString().slice(11, 16),
          overnight: item.caLamViec.quaNgay,
        })),
      },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: ca làm việc
  async findDepartment(userId: number, weekStartInput: string) {
    const { access, doctors, assignments, from, to } =
      await this.loadDepartment(userId, weekStartInput);
    return {
      message: 'Lấy lịch trực của khoa thành công',
      data: {
        unit: {
          id: access.donViLamViec.id,
          name: access.donViLamViec.tenDonVi,
        },
        weekStart: this.dateKey(from),
        weekEnd: this.dateKey(to),
        published: assignments.some(
          (item) =>
            item.ngayLamViec >= from &&
            item.ngayLamViec <= to &&
            item.caLamViec.maCa === 'TRUC_DEM' &&
            item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
        ),
        doctors: doctors.map((doctor) =>
          this.buildDoctorSchedule(
            doctor,
            assignments.filter(
              (item) => item.nguoiDungId === doctor.nguoiDungId,
            ),
            from,
          ),
        ),
      },
    };
  }

  // Cập nhật dữ liệu cho chức năng: ca làm việc
  async saveDraft(userId: number, dto: SaveDutyScheduleDto) {
    const { access, doctors, assignments, from, to } = await this.loadDepartment(
      userId,
      dto.weekStart,
    );

    // Cần ít nhất 7 bác sĩ để mỗi người trực 2 đêm mà vẫn phủ đủ 2 người mỗi đêm.
    if (doctors.length < 7) {
      throw new BadRequestException(
        'Khoa cần tối thiểu 7 bác sĩ để xếp đủ 2 bác sĩ trực đêm mỗi ngày',
      );
    }

    const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
    const seenDoctors = new Set<number>();
    const prepared: Array<{ userId: number; date: Date }> = [];
    const prisma = (this.repository as any).prisma;
    const publishedCount = await prisma.phanCongCa.count({
      where: {
        donViLamViecId: access.donViLamViecId,
        ngayLamViec: { gte: from, lte: to },
        trangThai: 'DA_DUYET',
      },
    });
    const isEmergency = publishedCount > 0 && !!dto.lyDoThayDoi;

    for (const row of dto.assignments) {
      const doctor = doctorById.get(row.doctorId);
      if (!doctor)
        throw new BadRequestException(
          `Bác sĩ ${row.doctorId} không thuộc khoa`,
        );
      if (seenDoctors.has(row.doctorId)) {
        throw new BadRequestException(
          `Bác sĩ ${doctor.hoTen} xuất hiện nhiều lần`,
        );
      }
      seenDoctors.add(row.doctorId);
      const dates = row.dutyDates.map((value) => this.date(value));
      this.validateDutyDates(doctor.hoTen, dates, from, to, isEmergency);
      prepared.push(
        ...dates.map((date) => ({ userId: doctor.nguoiDungId, date })),
      );
    }

    if (!isEmergency && seenDoctors.size !== doctors.length) {
      throw new BadRequestException(
        'Phải phân đủ hai ca trực cho tất cả bác sĩ trong khoa',
      );
    }
    const coverage = Array(7).fill(0);
    prepared.forEach(
      ({ date }) =>
        coverage[Math.round((date.getTime() - from.getTime()) / 86400000)]++,
    );
    this.validateNightCoverage(coverage, from);
    // Ngăn bác sĩ trực Chủ nhật rồi tiếp tục trực Thứ 2 của tuần liền kề.
    this.validateDutyWeekBoundaries(prepared, assignments, from, to);

    const role = await this.repository.findDoctorRole();
    const nightShift = await this.repository.findOrCreateNightShift();
    if (!role) throw new NotFoundException('Chưa cấu hình vai trò DOCTOR');
    await this.repository.saveDraft({
      unitId: access.donViLamViecId,
      roleId: role.id,
      shiftId: nightShift.id,
      managerId: userId,
      from,
      to,
      assignments: prepared,
      ghiChu: dto.lyDoThayDoi,
    });
    return {
      message: 'Đã lưu bản nháp lịch trực',
      data: { assignmentCount: prepared.length },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: ca làm việc
  async publish(userId: number, weekStartInput: string, lyDoThayDoi?: string) {
    const { access, doctors, assignments, from, to } =
      await this.loadDepartment(userId, weekStartInput);
    const coverage = Array(7).fill(0);
    const isEmergency = !!lyDoThayDoi;

    for (const doctor of doctors) {
      const duties = assignments.filter(
        (item) =>
          item.nguoiDungId === doctor.nguoiDungId &&
          item.ngayLamViec >= from &&
          item.ngayLamViec <= to &&
          item.caLamViec.maCa === 'TRUC_DEM',
      );
      if (!isEmergency && duties.length !== 2) {
        throw new BadRequestException(
          `Bác sĩ ${doctor.hoTen} chưa được phân đủ hai ca trực`,
        );
      }
      this.validateDutyDates(
        doctor.hoTen,
        duties.map((item) => item.ngayLamViec),
        from,
        to,
        isEmergency,
      );
      duties.forEach((item) => {
        const dayIndex = Math.round(
          (item.ngayLamViec.getTime() - from.getTime()) / 86_400_000,
        );
        coverage[dayIndex] += 1;
      });
    }
    // Không công bố lịch nếu bất kỳ đêm nào chưa đủ hai bác sĩ trực.
    this.validateNightCoverage(coverage, from);
    this.validateDutyWeekBoundaries(
      assignments
        .filter(
          (item) =>
            item.ngayLamViec >= from &&
            item.ngayLamViec <= to &&
            item.caLamViec.maCa === 'TRUC_DEM',
        )
        .map((item) => ({ userId: item.nguoiDungId, date: item.ngayLamViec })),
      assignments,
      from,
      to,
    );
    const count = await this.repository.publish(
      access.donViLamViecId,
      from,
      to,
      userId,
      true,
    );
    if (!count)
      throw new BadRequestException('Không có bản nháp lịch trực để công bố');

    const doctorIds = doctors.map((d) => d.nguoiDungId);
    await this.thongBaoService.notifyUsers(doctorIds, {
      title: 'Lịch trực mới',
      content: `Lịch trực tuần ${this.displayDate(from)} đã được công bố. Hãy kiểm tra lịch của bạn.`,
      type: 'LICH_LAM_VIEC',
      link: '/bac-si', // Link trang lịch cá nhân
    });

    for (const doctor of doctors) {
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.user(doctor.nguoiDungId),
        REALTIME_EVENTS.WORK_SCHEDULE_PUBLISHED,
        { weekStart: this.dateKey(from), weekEnd: this.dateKey(to) },
      );
    }
    return {
      message: 'Đã công bố lịch làm việc',
      data: { assignmentCount: count },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: ca làm việc
  async findPharmacistMine(userId: number, weekStartInput: string) {
    const staff = await this.repository.findPharmacistByUserId(userId);
    if (!staff)
      throw new NotFoundException('Tài khoản chưa liên kết hồ sơ dược sĩ');
    const { from, to } = this.requireWeek(weekStartInput);
    const assignments = await this.repository.findAssignments(
      [userId],
      this.addDays(from, -1),
      to,
    );
    return {
      message: 'Lấy lịch làm việc dược sĩ thành công',
      data: this.buildStaffSchedule(staff, assignments, from),
    };
  }

  async findPharmacistDepartment(userId: number, weekStartInput: string) {
    const { access, pharmacists, assignments, from, to } =
      await this.loadPharmacistDepartment(userId, weekStartInput);
    return {
      message: 'Lấy lịch trực dược thành công',
      data: {
        unit: {
          id: access.donViLamViec.id,
          name: access.donViLamViec.tenDonVi,
        },
        weekStart: this.dateKey(from),
        weekEnd: this.dateKey(to),
        published: assignments.some(
          (item) =>
            item.ngayLamViec >= from &&
            item.ngayLamViec <= to &&
            item.caLamViec.maCa === 'TRUC_DEM' &&
            item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
        ),
        pharmacists: pharmacists.map((staff) =>
          this.buildStaffSchedule(
            staff,
            assignments.filter(
              (item) => item.nguoiDungId === staff.nguoiDungId,
            ),
            from,
          ),
        ),
      },
    };
  }

  async savePharmacistDraft(userId: number, dto: SaveStaffDutyScheduleDto) {
    const { access, pharmacists, from, to } =
      await this.loadPharmacistDepartment(userId, dto.weekStart);
    const byId = new Map(pharmacists.map((staff) => [staff.id, staff]));
    const prepared: Array<{ userId: number; date: Date }> = [];
    const prisma = (this.repository as any).prisma;
    const publishedCount = await prisma.phanCongCa.count({
      where: {
        donViLamViecId: access.donViLamViecId,
        ngayLamViec: { gte: from, lte: to },
        trangThai: 'DA_DUYET',
      },
    });
    const isEmergency = publishedCount > 0 && !!dto.lyDoThayDoi;

    for (const row of dto.assignments) {
      const staff = byId.get(row.staffId);
      if (!staff)
        throw new BadRequestException('Dược sĩ không thuộc bộ phận Dược');
      const dates = row.dutyDates.map((value) => this.date(value));
      this.validateDutyDates(staff.hoTen, dates, from, to, isEmergency);
      prepared.push(
        ...dates.map((date) => ({ userId: staff.nguoiDungId, date })),
      );
    }

    if (!isEmergency && prepared.length !== pharmacists.length * 2) {
      throw new BadRequestException(
        'Phải phân đủ hai ca trực cho tất cả dược sĩ',
      );
    }
    const coverage = Array(7).fill(0);
    prepared.forEach(
      ({ date }) =>
        coverage[Math.round((date.getTime() - from.getTime()) / 86400000)]++,
    );
    if (
      coverage.slice(0, 4).some((count) => count < 1) ||
      coverage.slice(4).some((count) => count < 2)
    ) {
      throw new BadRequestException(
        'Lịch trực Dược phải có người mỗi ngày và tối thiểu 2 người vào Thứ 6, Thứ 7, Chủ nhật',
      );
    }
    const role = await this.repository.findPharmacistRole();
    const nightShift = await this.repository.findOrCreateNightShift();
    if (!role) throw new NotFoundException('Chưa cấu hình vai trò PHARMACIST');
    await this.repository.saveDraft({
      unitId: access.donViLamViecId,
      roleId: role.id,
      shiftId: nightShift.id,
      managerId: userId,
      from,
      to,
      assignments: prepared,
      ghiChu: dto.lyDoThayDoi,
    });
    return {
      message: 'Đã lưu bản nháp lịch trực dược',
      data: { assignmentCount: prepared.length },
    };
  }

  async publishPharmacist(userId: number, weekStartInput: string, lyDoThayDoi?: string) {
    const { access, pharmacists, assignments, from, to } =
      await this.loadPharmacistDepartment(userId, weekStartInput);
    const isEmergency = !!lyDoThayDoi;

    for (const staff of pharmacists) {
      const duties = assignments.filter(
        (item) =>
          item.nguoiDungId === staff.nguoiDungId &&
          item.ngayLamViec >= from &&
          item.ngayLamViec <= to &&
          item.caLamViec.maCa === 'TRUC_DEM',
      );
      if (!isEmergency && duties.length !== 2)
        throw new BadRequestException(
          `${staff.hoTen} chưa được phân đủ hai ca trực`,
        );
      this.validateDutyDates(
        staff.hoTen,
        duties.map((item) => item.ngayLamViec),
        from,
        to,
        isEmergency,
      );
    }
    const count = await this.repository.publish(
      access.donViLamViecId,
      from,
      to,
      userId,
      true,
    );
    if (!count)
      throw new BadRequestException('Không có bản nháp lịch trực để công bố');
    const pharmacistIds = pharmacists.map((staff) => staff.nguoiDungId);
    await this.thongBaoService.notifyUsers(pharmacistIds, {
      title: 'Lịch Dược đã được công bố',
      content: `Lịch trực tuần ${this.displayDate(from)}–${this.displayDate(to)} đã được trưởng khoa Dược công bố.`,
      type: 'LICH_LAM_VIEC',
      link: '/duoc-si/lich-lam-viec',
    });
    pharmacistIds.forEach((id) =>
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.user(id),
        REALTIME_EVENTS.WORK_SCHEDULE_PUBLISHED,
        { weekStart: this.dateKey(from), weekEnd: this.dateKey(to) },
      ),
    );
    return {
      message: 'Đã công bố lịch dược',
      data: { assignmentCount: count },
    };
  }

  private async loadPharmacistDepartment(
    userId: number,
    weekStartInput: string,
  ) {
    const { from, to } = this.requireWeek(weekStartInput);
    const access = await this.repository.findManagerAccess(userId, from);
    if (!access || access.donViLamViec.maDonVi !== 'BO_PHAN_DUOC')
      throw new ForbiddenException('Chỉ trưởng khoa Dược được phân lịch');
    const pharmacists = await this.repository.findPharmacists();
    const assignments = await this.repository.findAssignments(
      pharmacists.map((staff) => staff.nguoiDungId),
      this.addDays(from, -1),
      to,
    );
    return { access, pharmacists, assignments, from, to };
  }

  private buildStaffSchedule(
    staff: ReceptionistScheduleIdentity,
    assignments: ScheduleAssignment[],
    weekStart: Date,
  ) {
    const weekEnd = this.addDays(weekStart, 6);
    const publishedAssignments = assignments.filter(
      (item) => item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
    );
    const currentDuties = publishedAssignments.filter(
      (item) =>
        item.ngayLamViec >= weekStart &&
        item.ngayLamViec <= weekEnd &&
        item.caLamViec.maCa === 'TRUC_DEM',
    );
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(weekStart, index);
      const key = this.dateKey(date);
      const previous = this.dateKey(this.addDays(date, -1));
      const duty = publishedAssignments.find(
        (item) =>
          this.dateKey(item.ngayLamViec) === key &&
          item.caLamViec.maCa === 'TRUC_DEM',
      );
      const rest =
        !duty &&
        publishedAssignments.some(
          (item) =>
            this.dateKey(item.ngayLamViec) === previous &&
            item.caLamViec.maCa === 'TRUC_DEM',
        );
      return {
        date: key,
        workType: rest
          ? 'NGHI_BU'
          : duty
            ? 'HANH_CHINH_VA_TRUC_DEM'
            : 'HANH_CHINH',
        administrativeHours: rest ? null : { start: '07:00', end: '16:30' },
        nightDutyHours: duty
          ? { start: '16:30', end: '07:00', overnight: true }
          : null,
      };
    });
    return {
      staff: { id: staff.id, code: staff.maNhanVien, fullName: staff.hoTen },
      published: currentDuties.length > 0,
      dutyCount: currentDuties.length,
      restCount: days.filter((day) => day.workType === 'NGHI_BU').length,
      days,
    };
  }

  private async loadDepartment(userId: number, weekStartInput: string) {
    const { from, to } = this.requireWeek(weekStartInput);
    const access = await this.repository.findManagerAccess(userId, from);
    if (!access || !access.donViLamViec.chuyenKhoaId) {
      throw new ForbiddenException('Chỉ trưởng khoa được phân lịch làm việc');
    }
    const doctors = await this.repository.findDepartmentDoctors(
      access.donViLamViec.chuyenKhoaId,
    );
    // Lấy cả hai ngày giáp tuần để kiểm tra ca trực liền nhau qua biên tuần.
    const previousSunday = this.addDays(from, -1);
    const nextMonday = this.addDays(to, 1);
    const assignments = await this.repository.findAssignments(
      doctors.map((doctor) => doctor.nguoiDungId),
      previousSunday,
      nextMonday,
    );
    return { access, doctors, assignments, from, to };
  }

  private buildDoctorSchedule(
    doctor: DoctorScheduleIdentity,
    assignments: ScheduleAssignment[],
    weekStart: Date,
  ) {
    // Chỉ TRUC_DEM tạo ngày nghỉ bù. Ca sáng không được hiển thị thành ca trực.
    const publishedDuties = assignments.filter(
      (item) =>
        item.trangThai === TrangThaiPhanCongCa.DA_DUYET &&
        item.caLamViec.maCa === 'TRUC_DEM',
    );
    const dutyKeys = new Set(
      publishedDuties.map((item) => this.dateKey(item.ngayLamViec)),
    );
    const weekEnd = this.addDays(weekStart, 6);
    // Khóa Thứ 2 hoặc Chủ nhật khi bác sĩ đã trực ở tuần liền kề để tránh hai đêm liên tiếp.
    const blockedDutyDays = [
      ...(dutyKeys.has(this.dateKey(this.addDays(weekStart, -1))) ? [0] : []),
      ...(dutyKeys.has(this.dateKey(this.addDays(weekEnd, 1))) ? [6] : []),
    ];
    const currentWeekDuties = publishedDuties.filter((item) => {
      const date = item.ngayLamViec;
      return date >= weekStart && date <= weekEnd;
    });
    const published = currentWeekDuties.length > 0;
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(weekStart, index);
      const previous = this.addDays(date, -1);
      const isDuty = dutyKeys.has(this.dateKey(date));
      const isRest = dutyKeys.has(this.dateKey(previous));
      return {
        date: this.dateKey(date),
        workType: isRest
          ? 'NGHI_BU'
          : isDuty
            ? 'HANH_CHINH_VA_TRUC_DEM'
            : 'HANH_CHINH',
        administrativeHours: isRest ? null : { start: '07:00', end: '16:30' },
        nightDutyHours: isDuty
          ? { start: '16:30', end: '07:00', overnight: true }
          : null,
      };
    });
    return {
      doctor: { id: doctor.id, code: doctor.maBacSi, fullName: doctor.hoTen },
      specialty: {
        id: doctor.chuyenKhoa.id,
        name: doctor.chuyenKhoa.tenChuyenKhoa,
      },
      published,
      dutyCount: currentWeekDuties.length,
      restCount: days.filter((day) => day.workType === 'NGHI_BU').length,
      blockedDutyDays,
      days,
    };
  }

  private validateDutyDates(name: string, dates: Date[], from: Date, to: Date, isEmergency = false) {
    const unique = [...new Set(dates.map((date) => this.dateKey(date)))].sort();
    if (!isEmergency && unique.length !== 2)
      throw new BadRequestException(`${name} phải có đúng hai ca trực`);
    if (dates.some((date) => date < from || date > to)) {
      throw new BadRequestException(
        `Ngày trực của ${name} nằm ngoài tuần đang phân`,
      );
    }
    for (let i = 0; i < unique.length - 1; i++) {
      const distance = Math.abs(
        (this.date(unique[i + 1]).getTime() - this.date(unique[i]).getTime()) /
        86_400_000,
      );
      if (distance === 1 || distance === 6) {
        throw new BadRequestException(
          `${name} không được trực hai đêm liên tiếp, kể cả Chủ nhật và Thứ 2`,
        );
      }
    }
  }

  private nightDutyPairs() {
    const pairs: Array<[number, number]> = [];
    for (let first = 0; first < 7; first += 1) {
      for (let second = first + 1; second < 7; second += 1) {
        const isAdjacent =
          second - first === 1 || (first === 0 && second === 6);
        if (!isAdjacent) pairs.push([first, second]);
      }
    }
    return pairs;
  }

  private validateNightCoverage(coverage: number[], from: Date) {
    const missing = coverage
      .map((count, index) => ({
        count,
        date: this.dateKey(this.addDays(from, index)),
      }))
      .filter((item) => item.count < 2);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Chưa đủ tối thiểu 2 nhân viên trực đêm vào: ${missing.map((item) => item.date).join(', ')}.`,
      );
    }
  }

  private validateDutyWeekBoundaries(
    currentDuties: Array<{ userId: number; date: Date }>,
    assignments: ScheduleAssignment[],
    from: Date,
    to: Date,
  ) {
    const previousSundayKey = this.dateKey(this.addDays(from, -1));
    const nextMondayKey = this.dateKey(this.addDays(to, 1));
    const previousSundayUsers = new Set(
      assignments
        .filter(
          (item) =>
            item.caLamViec.maCa === 'TRUC_DEM' &&
            this.dateKey(item.ngayLamViec) === previousSundayKey,
        )
        .map((item) => item.nguoiDungId),
    );
    const nextMondayUsers = new Set(
      assignments
        .filter(
          (item) =>
            item.caLamViec.maCa === 'TRUC_DEM' &&
            this.dateKey(item.ngayLamViec) === nextMondayKey,
        )
        .map((item) => item.nguoiDungId),
    );
    const conflict = currentDuties.find((item) => {
      const dateKey = this.dateKey(item.date);
      return (
        (dateKey === this.dateKey(from) && previousSundayUsers.has(item.userId)) ||
        (dateKey === this.dateKey(to) && nextMondayUsers.has(item.userId))
      );
    });
    if (conflict) {
      throw new BadRequestException(
        'Bác sĩ không được trực hai đêm liên tiếp ở hai tuần liền kề',
      );
    }
  }

  private requireWeek(input: string) {
    const from = this.date(input);
    if (from.getUTCDay() !== 1)
      throw new BadRequestException('Ngày bắt đầu tuần phải là thứ Hai');
    return { from, to: this.addDays(from, 6) };
  }

  private date(input: string) {
    return new Date(`${input.slice(0, 10)}T00:00:00.000Z`);
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  // Chuẩn hóa ngày hiển thị trong nội dung thông báo lịch làm việc.
  private displayDate(date: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  // Lấy danh sách dữ liệu cho chức năng: ca làm việc
  async getNextShiftStaff(userId: number) {
    // Lấy đơn vị làm việc của tài khoản (trực tiếp hoặc qua quản lý).
    const access = await this.repository.findManagerAccess(userId, new Date());
    let unitId: number;
    if (access) {
      unitId = access.donViLamViecId;
    } else {
      // Nếu không phải quản lý, tìm đơn vị qua vai trò RECEPTIONIST
      const department = await this.repository.findReceptionistDepartment();
      if (!department)
        throw new NotFoundException('Không tìm thấy bộ phận Tiếp đón');
      unitId = department.id;
    }

    const prisma = (this.repository as any).prisma;
    const now = new Date();
    // Convert UTC sang múi giờ Việt Nam (UTC+7)
    const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayUtc = new Date(
      Date.UTC(
        bangkokNow.getUTCFullYear(),
        bangkokNow.getUTCMonth(),
        bangkokNow.getUTCDate(),
      ),
    );
    const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000);
    const tomorrowUtc = new Date(todayUtc.getTime() + 24 * 60 * 60 * 1000);
    const currentHour =
      bangkokNow.getUTCHours() + bangkokNow.getUTCMinutes() / 60;

    // 1. Kiểm tra ca làm việc hôm nay của người dùng
    let userAssignment = await prisma.phanCongCa.findFirst({
      where: {
        nguoiDungId: userId,
        ngayLamViec: todayUtc,
        trangThai: TrangThaiPhanCongCa.DA_DUYET,
      },
      include: { caLamViec: true },
      orderBy: { caLamViec: { gioBatDau: 'desc' } },
    });

    // Nếu không có ca hôm nay và đang sáng sớm (< 8h), kiểm tra ca TRUC_DEM từ hôm qua
    if (!userAssignment && currentHour < 8) {
      userAssignment = await prisma.phanCongCa.findFirst({
        where: {
          nguoiDungId: userId,
          ngayLamViec: yesterdayUtc,
          trangThai: TrangThaiPhanCongCa.DA_DUYET,
          caLamViec: { quaNgay: true },
        },
        include: { caLamViec: true },
      });
    }

    // 2. Xác định ca trực tiếp theo:
    // Cặp ca: SANG (07:00-16:30) và TRUC_DEM (16:30-07:00)
    // - Nếu đang làm Ca sáng -> Ca tiếp theo nhận bàn giao là TRỰC ĐÊM HÔM NAY.
    // - Nếu đang làm Ca trực đêm -> Ca tiếp theo nhận bàn giao là CA SÁNG NGÀY MAI (hoặc sáng nay nếu ca đêm từ hôm qua).
    // - Nếu tài khoản không có lịch trực (quản lý / test):
    //   + 06:00 đến 18:30: Ca tiếp theo là TRỰC ĐÊM HÔM NAY.
    //   + Sau 18:30 đến 23:59: Buổi tối/đêm -> ưu tiên ca Trực đêm hôm nay và Ca sáng mai.
    //   + 00:00 đến 06:00: Ca tiếp theo là Ca sáng hôm nay.

    let primaryShiftCode = 'TRUC_DEM';
    let primaryDate = todayUtc;
    let secondaryShiftCode = 'SANG';
    let secondaryDate = tomorrowUtc;

    if (userAssignment) {
      if (userAssignment.caLamViec.maCa === 'SANG') {
        primaryShiftCode = 'TRUC_DEM';
        primaryDate = todayUtc;
        secondaryShiftCode = 'SANG';
        secondaryDate = tomorrowUtc;
      } else {
        primaryShiftCode = 'SANG';
        primaryDate =
          userAssignment.ngayLamViec.getTime() === yesterdayUtc.getTime()
            ? todayUtc
            : tomorrowUtc;
        secondaryShiftCode = 'TRUC_DEM';
        secondaryDate = primaryDate;
      }
    } else {
      if (currentHour >= 6 && currentHour < 18.5) {
        primaryShiftCode = 'TRUC_DEM';
        primaryDate = todayUtc;
        secondaryShiftCode = 'SANG';
        secondaryDate = tomorrowUtc;
      } else if (currentHour < 6) {
        primaryShiftCode = 'SANG';
        primaryDate = todayUtc;
        secondaryShiftCode = 'TRUC_DEM';
        secondaryDate = todayUtc;
      } else {
        primaryShiftCode = 'TRUC_DEM';
        primaryDate = todayUtc;
        secondaryShiftCode = 'SANG';
        secondaryDate = tomorrowUtc;
      }
    }

    const [primaryStaff, secondaryStaff] = await Promise.all([
      this.repository.findNextShiftStaff(
        unitId,
        primaryDate,
        primaryShiftCode,
      ),
      this.repository.findNextShiftStaff(
        unitId,
        secondaryDate,
        secondaryShiftCode,
      ),
    ]);

    const formatDateLabel = (d: Date) => {
      if (d.getTime() === todayUtc.getTime()) return 'Hôm nay';
      if (d.getTime() === tomorrowUtc.getTime()) return 'Ngày mai';
      return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
    };

    const formatShiftLabel = (ca: { maCa: string; tenCa: string }, d: Date) => {
      const dateStr = formatDateLabel(d);
      return `${ca.tenCa} (${dateStr})`;
    };

    const combinedList: Array<{
      id: number;
      fullName: string;
      shift: string;
      shiftCode: string;
      shiftDate: string;
      group: string;
    }> = [];

    const primaryGroupLabel =
      primaryStaff.length > 0
        ? formatShiftLabel(primaryStaff[0].caLamViec, primaryDate)
        : primaryShiftCode === 'TRUC_DEM'
          ? 'Trực đêm'
          : 'Ca sáng';

    for (const s of primaryStaff) {
      if (s.nguoiDung.id !== userId) {
        combinedList.push({
          id: s.nguoiDung.id,
          fullName: s.nguoiDung.hoTen,
          shift: formatShiftLabel(s.caLamViec, primaryDate),
          shiftCode: s.caLamViec.maCa,
          shiftDate: primaryDate.toISOString().slice(0, 10),
          group: primaryGroupLabel,
        });
      }
    }

    if (secondaryStaff.length > 0) {
      const secondaryGroupLabel = formatShiftLabel(
        secondaryStaff[0].caLamViec,
        secondaryDate,
      );
      for (const s of secondaryStaff) {
        if (
          s.nguoiDung.id !== userId &&
          !combinedList.some((item) => item.id === s.nguoiDung.id)
        ) {
          combinedList.push({
            id: s.nguoiDung.id,
            fullName: s.nguoiDung.hoTen,
            shift: formatShiftLabel(s.caLamViec, secondaryDate),
            shiftCode: s.caLamViec.maCa,
            shiftDate: secondaryDate.toISOString().slice(0, 10),
            group: secondaryGroupLabel,
          });
        }
      }
    }

    return {
      message: 'Lấy danh sách nhân viên ca tiếp theo thành công',
      data: {
        nextShift: primaryShiftCode === 'SANG' ? 'Ca sáng' : 'Trực đêm',
        date: primaryDate.toISOString().slice(0, 10),
        staff: combinedList,
      },
    };
  }

  // Lấy danh sách dữ liệu cho chức năng: ca làm việc
  async getShiftReport(userId: number) {
    const now = new Date();
    // Lấy hóa đơn trong ngày hôm nay của nhân viên thu ngân này
    const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const startOfDay = new Date(
      Date.UTC(
        bangkokNow.getUTCFullYear(),
        bangkokNow.getUTCMonth(),
        bangkokNow.getUTCDate(),
      ) -
      7 * 60 * 60 * 1000,
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const prisma = (this.repository as any).prisma;

    let startTime = startOfDay;
    const currentHour = bangkokNow.getUTCHours();
    if (currentHour < 8) {
      const yesterdayUtc = new Date(
        Date.UTC(
          bangkokNow.getUTCFullYear(),
          bangkokNow.getUTCMonth(),
          bangkokNow.getUTCDate() - 1,
        ),
      );
      const nightDuty = await prisma.phanCongCa.findFirst({
        where: {
          nguoiDungId: userId,
          ngayLamViec: yesterdayUtc,
          trangThai: TrangThaiPhanCongCa.DA_DUYET,
          caLamViec: { quaNgay: true },
        },
      });
      if (nightDuty) {
        startTime = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000 + 16.5 * 60 * 60 * 1000);
      }
    }

    const thanhToans = await prisma.thanhToan.findMany({
      where: {
        nguoiThuTienId: userId,
        thoiGianThanhToan: { gte: startTime, lte: endOfDay },
      },
      include: {
        hoaDon: {
          include: { benhNhan: true },
        },
      },
      orderBy: { thoiGianThanhToan: 'desc' },
    });

    let systemCash = 0;
    let transferAmount = 0;
    const transactions = thanhToans.map((tt) => {
      if (tt.phuongThuc === 'TIEN_MAT') systemCash += Number(tt.soTien);
      else if (tt.phuongThuc === 'CHUYEN_KHOAN' || tt.phuongThuc === 'SEPAY')
        transferAmount += Number(tt.soTien);

      return {
        time:
          tt.thoiGianThanhToan?.toLocaleTimeString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
          }) || '',
        patientName: tt.hoaDon.benhNhan.hoTen,
        invoiceCode: tt.hoaDon.maHoaDon,
        amount: Number(tt.soTien),
        method: tt.phuongThuc === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản',
      };
    });

    const [pendingInvoices, pendingAppointments] = await Promise.all([
      prisma.hoaDon.findMany({
        where: {
          trangThai: {
            in: [
              TrangThaiHoaDon.BAN_NHAP,
              TrangThaiHoaDon.CHUA_THANH_TOAN,
              TrangThaiHoaDon.CHO_THANH_TOAN,
            ],
          },
        },
        include: { thanhToan: { where: { trangThai: 'THANH_CONG' } } },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      prisma.lichHen.findMany({
        where: {
          trangThai: TrangThaiLichHen.CHO_XAC_NHAN,
          ngayHen: { gte: startOfDay },
        },
        orderBy: [{ ngayHen: 'asc' }, { gioBatDau: 'asc' }],
        take: 20,
      }),
    ]);
    const pendingItems = [
      ...pendingInvoices.map((invoice) => {
        const paid = invoice.thanhToan.reduce(
          (sum, payment) => sum + Number(payment.soTien),
          0,
        );
        const remaining = Math.max(0, Number(invoice.tongTien) - paid);
        return {
          code: invoice.maHoaDon,
          content: `Còn phải thu ${new Intl.NumberFormat('vi-VN').format(remaining)} ₫`,
          status: paid > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán',
        };
      }),
      ...pendingAppointments.map((appointment) => ({
        code: appointment.maLichHen,
        content: `Lịch hẹn ngày ${appointment.ngayHen.toLocaleDateString('vi-VN', { timeZone: 'UTC' })}`,
        status: 'Chờ xác nhận',
      })),
    ];

    return {
      message: 'Lấy báo cáo ca trực thành công',
      data: {
        systemCash,
        transferAmount,
        transactions,
        pendingItems,
      },
    };
  }

  // Lưu hoặc gửi báo cáo bàn giao ca của lễ tân/thu ngân.
  async saveHandover(userId: number, dto: SaveHandoverDto, submit: boolean) {
    const prisma = (this.repository as any).prisma;
    const receiverId = dto.receiverId ?? null;
    const validReceiverId = receiverId !== null && receiverId > 0;
    const actualCash = dto.actualCash ?? null;
    const hasActualCash = actualCash !== null;
    if (submit && (!validReceiverId || actualCash === null || actualCash < 0)) {
      throw new BadRequestException(
        'Vui lòng chọn người nhận và nhập tiền mặt thực tế hợp lệ',
      );
    }
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const workingDate = new Date(
      Date.UTC(
        bangkokNow.getUTCFullYear(),
        bangkokNow.getUTCMonth(),
        bangkokNow.getUTCDate(),
      ),
    );
    let assignment = await prisma.phanCongCa.findFirst({
      where: {
        nguoiDungId: userId,
        ngayLamViec: workingDate,
        trangThai: TrangThaiPhanCongCa.DA_DUYET,
      },
      include: { caLamViec: true },
      orderBy: { caLamViec: { gioBatDau: 'desc' } },
    });

    // Nếu không tìm thấy ca hôm nay (ví dụ nhân viên trực đêm kết thúc ca vào sáng hôm sau)
    if (!assignment) {
      const yesterday = new Date(workingDate.getTime() - 24 * 60 * 60 * 1000);
      assignment = await prisma.phanCongCa.findFirst({
        where: {
          nguoiDungId: userId,
          ngayLamViec: yesterday,
          trangThai: TrangThaiPhanCongCa.DA_DUYET,
          caLamViec: { quaNgay: true },
        },
        include: { caLamViec: true },
      });
    }

    if (!assignment)
      throw new BadRequestException(
        'Tài khoản chưa có ca làm đã duyệt để bàn giao',
      );
    const report = await this.getShiftReport(userId);
    const systemCash = Number(report.data.systemCash);
    const transferAmount = Number(report.data.transferAmount);
    const difference = hasActualCash ? Number(actualCash) - systemCash : null;
    if (
      submit &&
      difference !== 0 &&
      !String(dto.differenceReason ?? '').trim()
    ) {
      throw new BadRequestException('Cần ghi rõ lý do chênh lệch tiền mặt');
    }
    const status = submit
      ? TrangThaiBanGiaoCa.CHO_XAC_NHAN
      : TrangThaiBanGiaoCa.BAN_NHAP;
    const data = {
      nguoiNhanBanGiaoId: validReceiverId ? receiverId : null,
      tongDoanhThu: systemCash + transferAmount,
      tienMatHeThong: systemCash,
      tienChuyenKhoan: transferAmount,
      soPhieuChoXuLy: report.data.pendingItems.length,
      tienMatThucTe: actualCash,
      chenhLechTienMat: difference,
      lyDoChenhLech: String(dto.differenceReason ?? '').trim() || null,
      checklist: dto.checklist ?? [],
      ghiChu: String(dto.note ?? '').trim() || null,
      trangThai: status,
      thoiGianBanGiao: submit ? new Date() : null,
    };
    const handover = await prisma.banGiaoCa.upsert({
      where: { phanCongCaId: assignment.id },
      update: data,
      create: {
        phanCongCaId: assignment.id,
        nguoiBanGiaoId: userId,
        tienSepay: 0,
        ...data,
      },
    });
    return {
      message: submit
        ? 'Đã gửi bàn giao, chờ người nhận xác nhận'
        : 'Đã lưu bản nháp bàn giao',
      data: { id: handover.id, status: handover.trangThai },
    };
  }

  // Danh sách bàn giao để Admin giám sát và xử lý chênh lệch.
  async listHandovers() {
    const prisma = (this.repository as any).prisma;
    const rows = await prisma.banGiaoCa.findMany({
      include: {
        nguoiBanGiao: true,
        nguoiNhanBanGiao: true,
        phanCongCa: { include: { caLamViec: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return {
      message: 'Lấy danh sách bàn giao ca thành công',
      data: rows.map((row: any) => ({
        id: row.id,
        status: row.trangThai,
        sender: row.nguoiBanGiao.hoTen,
        receiver: row.nguoiNhanBanGiao?.hoTen ?? null,
        shift: row.phanCongCa.caLamViec.tenCa,
        cashSystem: Number(row.tienMatHeThong),
        cashActual:
          row.tienMatThucTe === null ? null : Number(row.tienMatThucTe),
        difference:
          row.chenhLechTienMat === null ? null : Number(row.chenhLechTienMat),
        note: row.ghiChu,
        createdAt: row.createdAt,
        submittedAt: row.thoiGianBanGiao,
        confirmedAt:
          row.trangThai === TrangThaiBanGiaoCa.DA_BAN_GIAO
            ? row.updatedAt
            : null,
      })),
    };
  }

  // Người nhận chỉ thấy các bàn giao được gửi đúng cho tài khoản của mình.
  async getMyPendingHandovers(userId: number) {
    const prisma = (this.repository as any).prisma;
    const rows = await prisma.banGiaoCa.findMany({
      where: {
        nguoiNhanBanGiaoId: userId,
        trangThai: TrangThaiBanGiaoCa.CHO_XAC_NHAN,
      },
      include: {
        nguoiBanGiao: { select: { hoTen: true, soDienThoai: true } },
        phanCongCa: { include: { caLamViec: true } },
      },
      orderBy: { thoiGianBanGiao: 'desc' },
    });

    return {
      message: 'Lấy danh sách bàn giao đang chờ xác nhận thành công',
      data: rows.map((row: any) => ({
        id: row.id,
        sender: row.nguoiBanGiao.hoTen,
        senderPhone: row.nguoiBanGiao.soDienThoai,
        shift: row.phanCongCa.caLamViec.tenCa,
        workingDate: row.phanCongCa.ngayLamViec,
        submittedAt: row.thoiGianBanGiao,
        systemCash: Number(row.tienMatHeThong),
        actualCash:
          row.tienMatThucTe === null ? null : Number(row.tienMatThucTe),
        transferAmount: Number(row.tienChuyenKhoan),
        difference:
          row.chenhLechTienMat === null ? null : Number(row.chenhLechTienMat),
        differenceReason: row.lyDoChenhLech,
        pendingItemCount: row.soPhieuChoXuLy,
        checklist: Array.isArray(row.checklist) ? row.checklist : [],
        note: row.ghiChu,
      })),
    };
  }

  async confirmHandoverReceipt(userId: number, handoverId: number) {
    const prisma = (this.repository as any).prisma;
    const handover = await prisma.banGiaoCa.findFirst({
      where: {
        id: handoverId,
        nguoiNhanBanGiaoId: userId,
        trangThai: TrangThaiBanGiaoCa.CHO_XAC_NHAN,
      },
    });
    if (!handover) {
      throw new NotFoundException(
        'Không tìm thấy bàn giao đang chờ xác nhận của bạn',
      );
    }

    // updatedAt là mốc xác nhận nhận ca, được cập nhật nguyên tử cùng trạng thái.
    await prisma.banGiaoCa.update({
      where: { id: handover.id },
      data: { trangThai: TrangThaiBanGiaoCa.DA_BAN_GIAO },
    });

    return {
      message: 'Đã xác nhận nhận bàn giao ca',
      data: { id: handover.id, status: TrangThaiBanGiaoCa.DA_BAN_GIAO },
    };
  }

  // Lấy thông tin chi tiết cho chức năng: ca làm việc
  async findReceptionistDepartment(userId: number, weekStartInput: string) {
    const { access, receptionists, assignments, from, to } =
      await this.loadReceptionistDepartment(userId, weekStartInput);
    return {
      message: 'Lấy lịch làm việc bộ phận Lễ tân / Thu ngân thành công',
      data: {
        unit: {
          id: access.donViLamViec.id,
          name: access.donViLamViec.tenDonVi,
        },
        weekStart: this.dateKey(from),
        weekEnd: this.dateKey(to),
        published: assignments.some(
          (item) =>
            item.ngayLamViec >= from &&
            item.ngayLamViec <= to &&
            item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
        ),
        receptionists: receptionists.map((staff) =>
          this.buildReceptionistSchedule(
            staff,
            assignments.filter(
              (item) => item.nguoiDungId === staff.nguoiDungId,
            ),
            from,
          ),
        ),
      },
    };
  }

  async findReceptionistMine(userId: number, weekStartInput: string) {
    const { from, to } = this.requireWeek(weekStartInput);
    const receptionists = await this.repository.findReceptionists();
    const staff = receptionists.find((item) => item.nguoiDungId === userId);
    if (!staff)
      throw new NotFoundException(
        'Tài khoản chưa liên kết hồ sơ Lễ tân / Thu ngân',
      );
    const assignments = await this.repository.findAssignments(
      [userId],
      this.addDays(from, -1),
      to,
    );
    return {
      message: 'Lấy lịch làm việc cá nhân thành công',
      data: this.buildReceptionistSchedule(staff, assignments, from),
    };
  }

  // Cập nhật dữ liệu cho chức năng: ca làm việc
  // Thuật toán phân trực đặt ở Backend để giao diện không thể tự tạo lịch sai quy tắc.
  async createReceptionistAutoSchedule(userId: number, weekStartInput: string) {
    const { receptionists, assignments, from, to } =
      await this.loadReceptionistDepartment(userId, weekStartInput);
    if (receptionists.length < 7) {
      throw new BadRequestException(
        'Cần tối thiểu 7 nhân viên Thu ngân để mỗi đêm có đủ 2 người trực.',
      );
    }

    const previousSunday = this.dateKey(this.addDays(from, -1));
    const coverage = Array.from({ length: 7 }, () => 0);
    const generated = receptionists
      .slice()
      .sort((left, right) => left.id - right.id)
      .map((staff) => {
        const hadDutyPreviousSunday = assignments.some(
          (item) =>
            item.nguoiDungId === staff.nguoiDungId &&
            item.caLamViec.maCa === 'TRUC_DEM' &&
            this.dateKey(item.ngayLamViec) === previousSunday,
        );
        const pair = this.nightDutyPairs()
          .filter(
            (candidate) => !hadDutyPreviousSunday || !candidate.includes(0),
          )
          .sort((first, second) => {
            const firstScore = coverage[first[0]] + coverage[first[1]];
            const secondScore = coverage[second[0]] + coverage[second[1]];
            return (
              firstScore - secondScore ||
              first[0] - second[0] ||
              first[1] - second[1]
            );
          })[0];

        if (!pair) {
          throw new BadRequestException(
            `Không thể tìm ca trực phù hợp cho ${staff.hoTen}.`,
          );
        }
        coverage[pair[0]] += 1;
        coverage[pair[1]] += 1;
        return {
          staffId: staff.id,
          dutyDates: pair.map((dayIndex) =>
            this.dateKey(this.addDays(from, dayIndex)),
          ),
        };
      });

    this.validateNightCoverage(coverage, from);
    return {
      message: 'Đã tạo phương án phân trực đêm',
      data: {
        weekStart: this.dateKey(from),
        weekEnd: this.dateKey(to),
        assignments: generated,
      },
    };
  }

  async saveReceptionistDraft(userId: number, dto: SaveStaffDutyScheduleDto) {
    const { access, receptionists, assignments, from, to } =
      await this.loadReceptionistDepartment(userId, dto.weekStart);
    const staffById = new Map(receptionists.map((staff) => [staff.id, staff]));
    const prepared: Array<{ userId: number; date: Date; shiftId: number }> = [];
    const role = await this.repository.findReceptionistRole();
    const morningShift = await this.repository.findOrCreateMorningShift();
    const eveningShift = await this.repository.findOrCreateEveningShift();
    if (!role)
      throw new NotFoundException('Chưa cấu hình vai trò RECEPTIONIST');

    const prisma = (this.repository as any).prisma;
    const publishedCount = await prisma.phanCongCa.count({
      where: {
        donViLamViecId: access.donViLamViecId,
        ngayLamViec: { gte: from, lte: to },
        trangThai: 'DA_DUYET',
      },
    });
    const isEmergency = publishedCount > 0 && !!dto.lyDoThayDoi;

    for (const row of dto.assignments ?? []) {
      const staff = staffById.get(row.staffId);
      if (!staff)
        throw new BadRequestException(
          `Nhân viên ${row.staffId} không thuộc bộ phận`,
        );
      // Lịch hành chính cố định được sinh tự động. Người quản lý chỉ chọn ca trực đêm.
      const dutyDates = row.dutyDates.map((value) => this.date(value));
      this.validateDutyDates(staff.hoTen, dutyDates, from, to, isEmergency);
      const dutyKeys = new Set(dutyDates.map((date) => this.dateKey(date)));
      const previousSunday = this.dateKey(this.addDays(from, -1));
      const hadDutyPreviousSunday = assignments.some(
        (item) =>
          item.nguoiDungId === staff.nguoiDungId &&
          this.dateKey(item.ngayLamViec) === previousSunday &&
          item.caLamViec.maCa === 'TRUC_DEM',
      );
      if (!isEmergency && hadDutyPreviousSunday && dutyKeys.has(this.dateKey(from))) {
        throw new BadRequestException(
          `${staff.hoTen} không được trực hai đêm liên tiếp qua tuần`,
        );
      }

      for (let index = 0; index < 7; index += 1) {
        const date = this.addDays(from, index);
        const key = this.dateKey(date);
        const isRestAfterDuty =
          index === 0
            ? hadDutyPreviousSunday
            : dutyKeys.has(this.dateKey(this.addDays(date, -1)));
        if (!isRestAfterDuty) {
          prepared.push({
            userId: staff.nguoiDungId,
            date,
            shiftId: morningShift.id,
          });
        }
        if (dutyKeys.has(key)) {
          prepared.push({
            userId: staff.nguoiDungId,
            date,
            shiftId: eveningShift.id,
          });
        }
      }
    }

    if (!isEmergency && (dto.assignments ?? []).length !== receptionists.length) {
      throw new BadRequestException(
        'Phải phân lịch trực cho toàn bộ nhân viên Thu ngân',
      );
    }

    this.validateNightCoverage(
      Array.from({ length: 7 }, (_, index) => {
        const dateKey = this.dateKey(this.addDays(from, index));
        return (dto.assignments ?? []).filter((row) =>
          row.dutyDates.some(
            (value) => this.dateKey(this.date(value)) === dateKey,
          ),
        ).length;
      }),
      from,
    );

    await this.repository.saveReceptionistDraft({
      unitId: access.donViLamViecId,
      roleId: role.id,
      managerId: userId,
      from,
      to,
      assignments: prepared,
      ghiChu: dto.lyDoThayDoi,
    });
    return {
      message: 'Đã lưu bản nháp lịch trực',
      data: { assignmentCount: prepared.length },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: ca làm việc
  async publishReceptionist(userId: number, weekStartInput: string, lyDoThayDoi?: string) {
    const { access, receptionists, assignments, from, to } =
      await this.loadReceptionistDepartment(userId, weekStartInput);
    const isEmergency = !!lyDoThayDoi;
    for (const staff of receptionists) {
      const dutyDates = assignments
        .filter(
          (item) =>
            item.nguoiDungId === staff.nguoiDungId &&
            item.ngayLamViec >= from &&
            item.ngayLamViec <= to &&
            item.caLamViec.maCa === 'TRUC_DEM',
        )
        .map((item) => item.ngayLamViec);
      this.validateDutyDates(staff.hoTen, dutyDates, from, to, isEmergency);
    }
    this.validateNightCoverage(
      Array.from({ length: 7 }, (_, index) => {
        const date = this.addDays(from, index);
        return assignments.filter(
          (item) =>
            item.caLamViec.maCa === 'TRUC_DEM' &&
            this.dateKey(item.ngayLamViec) === this.dateKey(date),
        ).length;
      }),
      from,
    );

    const count = await this.repository.publish(
      access.donViLamViecId,
      from,
      to,
      userId,
    );
    if (!count)
      throw new BadRequestException('Không có bản nháp lịch trực để công bố');

    const userIds = receptionists.map((r) => r.nguoiDungId);
    if (userIds.length > 0) {
      await this.thongBaoService.notifyUsers(userIds, {
        title: 'Lịch làm việc đã được công bố',
        content: `Lịch làm việc từ ${this.displayDate(from)} đến ${this.displayDate(to)} của bộ phận Lễ tân / Thu ngân đã được công bố.`,
        type: 'LICH_LAM_VIEC',
      });
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.role('RECEPTIONIST'),
        REALTIME_EVENTS.WORK_SCHEDULE_PUBLISHED,
        { weekStart: this.dateKey(from), weekEnd: this.dateKey(to) },
      );
    }

    return {
      message: 'Đã công bố lịch làm việc',
      data: { assignmentCount: count },
    };
  }

  // Xử lý logic nghiệp vụ cho chức năng: ca làm việc
  private async loadReceptionistDepartment(
    userId: number,
    weekStartInput: string,
  ) {
    const { from, to } = this.requireWeek(weekStartInput);
    const access = await this.repository.findManagerAccess(userId, from);
    if (!access || access.donViLamViec.maDonVi !== 'BO_PHAN_TIEP_DON') {
      throw new ForbiddenException(
        'Chỉ trưởng bộ phận được phân lịch làm việc',
      );
    }
    const receptionists = await this.repository.findReceptionists();
    // Bao gồm Chủ nhật tuần trước để có thể đánh dấu Thứ 2 là nghỉ bù
    // sau ca trực đêm. Giao diện không đổi; API trả thêm dữ liệu mô tả.
    const previousSunday = this.addDays(from, -1);
    const assignments = await this.repository.findAssignments(
      receptionists.map((staff) => staff.nguoiDungId),
      previousSunday,
      to,
    );
    return { access, receptionists, assignments, from, to };
  }

  private buildReceptionistSchedule(
    staff: ReceptionistScheduleIdentity,
    assignments: ScheduleAssignment[],
    weekStart: Date,
  ) {
    const weekEnd = this.addDays(weekStart, 6);
    const currentWeekAssignments = assignments.filter((item) => {
      const date = item.ngayLamViec;
      return (
        date >= weekStart &&
        date <= weekEnd &&
        item.caLamViec.maCa === 'TRUC_DEM'
      );
    });
    const published = assignments.some(
      (item) =>
        item.ngayLamViec >= weekStart &&
        item.ngayLamViec <= weekEnd &&
        item.trangThai === TrangThaiPhanCongCa.DA_DUYET,
    );
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(weekStart, index);
      const dateStr = this.dateKey(date);
      const dailyAssignments = assignments.filter(
        (a) => this.dateKey(a.ngayLamViec) === dateStr,
      );
      const dayDuty = dailyAssignments.find(
        (a) => a.caLamViec.maCa === 'TRUC_DEM',
      );
      const previous = this.addDays(date, -1);
      const hadNightDutyPreviousDay = assignments.some(
        (a) =>
          this.dateKey(a.ngayLamViec) === this.dateKey(previous) &&
          a.caLamViec.maCa === 'TRUC_DEM',
      );
      const compensatoryRest = hadNightDutyPreviousDay;
      return {
        date: dateStr,
        workType: compensatoryRest
          ? 'NGHI_BU'
          : dayDuty
            ? 'HANH_CHINH_VA_TRUC_DEM'
            : 'HANH_CHINH',
        isCompensatoryRest: compensatoryRest,
        restReason: compensatoryRest ? 'NGHI_BU_SAU_TRUC_DEM' : null,
      };
    });
    return {
      staff: { id: staff.id, code: staff.maNhanVien, fullName: staff.hoTen },
      published,
      dutyCount: currentWeekAssignments.length,
      restCount: days.filter((day) => day.workType === 'NGHI_BU').length,
      days,
    };
  }
}
