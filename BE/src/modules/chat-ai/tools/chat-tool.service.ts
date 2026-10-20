import { BadRequestException, Injectable } from '@nestjs/common';
import { GioiTinh, TrangThaiChung } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { DoctorsService } from '../../bac-si/doctors.service';
import { WorkSchedulesService } from '../../ca-lam-viec/work-schedules.service';
import { SpecialtiesService } from '../../chuyen-khoa/specialties.service';
import { ServicesService } from '../../dich-vu/services.service';
import { CreateGuestAppointmentDto } from '../../lich-hen/dto/create-guest-appointment.dto';
import {
  CHAT_REPOSITORY,
  type ChatRepository,
} from '../repositories/chat.repository.interface';
import { Inject } from '@nestjs/common';

export const CHAT_TOOL_DEFINITIONS = [
  {
    name: 'tim_chuyen_khoa',
    description:
      'Tra cứu chuyên khoa đang hoạt động. Dùng khi người dùng hỏi chuyên khoa.',
    parametersJsonSchema: {
      type: 'object',
      properties: { keyword: { type: 'string' } },
    },
  },
  {
    name: 'tim_bac_si',
    description: 'Tra cứu bác sĩ đang hoạt động theo tên hoặc chuyên khoa.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        specialtyId: { type: 'integer' },
      },
    },
  },
  {
    name: 'tim_dich_vu',
    description: 'Tra cứu dịch vụ, phí và chuyên khoa liên quan.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        specialtyId: { type: 'integer' },
      },
    },
  },
  {
    name: 'xem_lich_bac_si',
    description:
      'Xem ca làm đã công bố của một bác sĩ. Người dùng nhập ngày theo dd/MM/yyyy; trước khi gọi tool hãy đổi sang YYYY-MM-DD.',
    parametersJsonSchema: {
      type: 'object',
      properties: { doctorId: { type: 'integer' }, date: { type: 'string' } },
      required: ['doctorId', 'date'],
    },
  },
  {
    name: 'tao_ban_nhap_dat_lich',
    description:
      'Tạo bản nháp đặt lịch khi đã có đủ họ tên, số điện thoại, ngày sinh dd/MM/yyyy, giới tính NAM/NU/KHAC, chuyên khoa (specialtyId hoặc specialtyName), ngày hẹn dd/MM/yyyy, giờ HH:mm và lý do khám. Không tạo lịch thật. Trước khi gọi tool, đổi hai ngày sang YYYY-MM-DD.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        phoneNumber: { type: 'string' },
        dateOfBirth: { type: 'string' },
        gender: { type: 'string', enum: ['NAM', 'NU', 'KHAC'] },
        email: { type: 'string' },
        specialtyId: { type: 'integer', description: 'ID chuyên khoa nếu đã biết' },
        specialtyName: { type: 'string', description: 'Tên chuyên khoa (ví dụ: Nội tổng quát, Tai mũi họng,...)' },
        appointmentDate: { type: 'string' },
        appointmentTime: { type: 'string' },
        reason: { type: 'string' },
        note: { type: 'string' },
      },
      required: [
        'fullName',
        'phoneNumber',
        'dateOfBirth',
        'gender',
        'appointmentDate',
        'appointmentTime',
        'reason',
      ],
    },
  },
] as const;

export interface ChatToolResult {
  name: string;
  data: Record<string, unknown>;
  bookingDraft?: Record<string, unknown>;
}

@Injectable()
export class ChatToolService {
  constructor(
    private readonly specialtiesService: SpecialtiesService,
    private readonly doctorsService: DoctorsService,
    private readonly servicesService: ServicesService,
    private readonly workSchedulesService: WorkSchedulesService,
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: ChatRepository,
  ) {}

  // Gemini chỉ gọi lớp này; không được chạm Prisma/Neon trực tiếp.
  async execute(
    name: string,
    args: Record<string, unknown>,
    sessionId: number,
  ): Promise<ChatToolResult> {
    if (name === 'tim_chuyen_khoa') {
      const result = await this.specialtiesService.findAll({
        search: this.text(args.keyword),
        status: TrangThaiChung.DANG_HOAT_DONG,
      });
      return { name, data: { items: result.data } };
    }
    if (name === 'tim_bac_si') {
      const result = await this.doctorsService.findAll({
        search: this.text(args.keyword),
        specialtyId: this.positiveInt(args.specialtyId),
        status: TrangThaiChung.DANG_HOAT_DONG,
      });
      return { name, data: { items: result.data } };
    }
    if (name === 'tim_dich_vu') {
      const result = await this.servicesService.findAll({
        search: this.text(args.keyword),
        specialtyId: this.positiveInt(args.specialtyId),
        status: TrangThaiChung.DANG_HOAT_DONG,
      });
      return { name, data: { items: result.data } };
    }
    if (name === 'xem_lich_bac_si') {
      const doctorId = this.positiveInt(args.doctorId);
      const date = this.text(args.date);
      if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? ''))
        throw new BadRequestException('Thiếu bác sĩ hoặc ngày cần tra cứu');
      const result = await this.workSchedulesService.findDoctorPublicSchedule(
        doctorId,
        date!,
      );
      return { name, data: result.data };
    }
    if (name === 'tao_ban_nhap_dat_lich') {
      let specialtyId = this.positiveInt(args.specialtyId);
      if (!specialtyId && (typeof args.specialtyName === 'string' || typeof args.specialty === 'string')) {
        const specName = String(args.specialtyName || args.specialty).trim();
        const specs = await this.specialtiesService.findAll({
          search: specName,
          status: TrangThaiChung.DANG_HOAT_DONG,
        });
        if (specs.data.length > 0) {
          specialtyId = specs.data[0].id;
        }
      }

      let gender = typeof args.gender === 'string' ? args.gender.trim().toUpperCase() : 'KHAC';
      if (gender === 'NỮ' || gender === 'NU') gender = 'NU';
      else if (gender === 'NAM') gender = 'NAM';
      else gender = 'KHAC';

      const normalizeDate = (d: unknown) => {
        if (typeof d !== 'string') return '';
        const trimmed = d.trim();
        const ddmmyyyy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(trimmed);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return trimmed;
      };

      const normalizeTime = (t: unknown) => {
        if (typeof t !== 'string') return '08:00';
        const trimmed = t.trim();
        const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
        if (match) {
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        }
        return trimmed;
      };

      const dto = plainToInstance(CreateGuestAppointmentDto, {
        ...args,
        specialtyId,
        gender,
        dateOfBirth: normalizeDate(args.dateOfBirth),
        appointmentDate: normalizeDate(args.appointmentDate),
        appointmentTime: normalizeTime(args.appointmentTime),
        doctorId: undefined,
      });
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      const specialty = await this.specialtiesService.findOne(dto.specialtyId);
      const draft = await this.chatRepository.createBookingDraft({
        sessionId,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber.replace(/[\s.-]/g, ''),
        dateOfBirth: new Date(`${dto.dateOfBirth}T00:00:00.000Z`),
        gender: dto.gender,
        email: dto.email?.trim().toLowerCase() || null,
        specialtyId: dto.specialtyId,
        appointmentDate: new Date(`${dto.appointmentDate}T00:00:00.000Z`),
        appointmentTime: dto.appointmentTime,
        reason: dto.reason.trim(),
        note: dto.note?.trim() || null,
      });
      const bookingDraft = this.toDraftResponse(draft, specialty.data.name);
      return {
        name,
        data: { message: 'Đã tạo bản nháp, chờ người dùng xác nhận.' },
        bookingDraft,
      };
    }
    throw new BadRequestException(`Công cụ ${name} không được hỗ trợ`);
  }

  toDraftResponse(
    draft: Awaited<ReturnType<ChatRepository['createBookingDraft']>>,
    specialtyName?: string,
  ) {
    return {
      id: draft.id,
      status: draft.trangThai,
      fullName: draft.hoTen,
      phoneNumber: draft.soDienThoai,
      dateOfBirth: draft.ngaySinh.toISOString().slice(0, 10),
      gender: draft.gioiTinh,
      email: draft.email,
      specialtyId: draft.chuyenKhoaId,
      specialtyName: specialtyName ?? null,
      appointmentDate: draft.ngayHen.toISOString().slice(0, 10),
      appointmentTime: draft.gioBatDau.toISOString().slice(11, 16),
      reason: draft.lyDoKham,
      note: draft.ghiChu,
      createdAt: draft.createdAt,
    };
  }

  private text(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  private positiveInt(value: unknown) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : undefined;
  }
}
