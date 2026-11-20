import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThanhToanService } from './thanh-toan.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TrangThaiHoaDon, TrangThaiThanhToan } from '@prisma/client';

describe('ThanhToanService', () => {
  let service: ThanhToanService;
  let mockPrisma: any;
  let mockRealtime: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => cb(mockPrisma)),
      $queryRaw: jest.fn(),
      hoaDon: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    mockRealtime = {
      emitToRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThanhToanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    }).compile();

    service = module.get<ThanhToanService>(ThanhToanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelInvoice', () => {
    it('throws NotFoundException if invoice does not exist', async () => {
      mockPrisma.hoaDon.findUnique.mockResolvedValue(null);
      await expect(service.cancelInvoice(999, 'Lý do hủy', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if invoice is already DA_HUY', async () => {
      mockPrisma.hoaDon.findUnique.mockResolvedValue({
        id: 1,
        trangThai: TrangThaiHoaDon.DA_HUY,
        thanhToan: [],
      });
      await expect(service.cancelInvoice(1, 'Lý do hủy', 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if invoice is already DA_THANH_TOAN', async () => {
      mockPrisma.hoaDon.findUnique.mockResolvedValue({
        id: 1,
        trangThai: TrangThaiHoaDon.DA_THANH_TOAN,
        thanhToan: [],
      });
      await expect(service.cancelInvoice(1, 'Lý do hủy', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if invoice has successful payment', async () => {
      mockPrisma.hoaDon.findUnique.mockResolvedValue({
        id: 1,
        trangThai: TrangThaiHoaDon.BAN_NHAP,
        thanhToan: [{ trangThai: TrangThaiThanhToan.THANH_CONG }],
      });
      await expect(service.cancelInvoice(1, 'Lý do hủy', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully cancels invoice and emits realtime event', async () => {
      mockPrisma.hoaDon.findUnique.mockResolvedValue({
        id: 1,
        maHoaDon: 'HD-12345',
        trangThai: TrangThaiHoaDon.CHO_THANH_TOAN,
        thanhToan: [],
      });
      mockPrisma.hoaDon.update.mockResolvedValue({
        id: 1,
        maHoaDon: 'HD-12345',
        trangThai: TrangThaiHoaDon.DA_HUY,
        lyDoHuy: 'Bệnh nhân không mang đủ tiền',
        nguoiHuyId: 2,
        thoiGianHuy: new Date(),
      });

      const res = await service.cancelInvoice(
        1,
        '  Bệnh nhân không mang đủ tiền  ',
        2,
      );
      expect(res.message).toBe('Hủy hóa đơn thành công');
      expect(mockPrisma.hoaDon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            trangThai: TrangThaiHoaDon.DA_HUY,
            lyDoHuy: 'Bệnh nhân không mang đủ tiền',
            nguoiHuyId: 2,
          }),
        }),
      );
      expect(mockRealtime.emitToRoom).toHaveBeenCalledWith(
        'role:RECEPTIONIST',
        'invoice.cancelled',
        expect.objectContaining({
          id: 1,
          maHoaDon: 'HD-12345',
          lyDoHuy: 'Bệnh nhân không mang đủ tiền',
        }),
      );
    });
  });
});
