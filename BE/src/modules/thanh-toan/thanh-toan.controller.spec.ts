import { Test, TestingModule } from '@nestjs/testing';
import { ThanhToanController } from './thanh-toan.controller';
import { ThanhToanService } from './thanh-toan.service';

describe('ThanhToanController', () => {
  let controller: ThanhToanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThanhToanController],
      providers: [
        {
          provide: ThanhToanService,
          useValue: {
            handleSePayWebhook: jest.fn(),
            getInvoices: jest.fn(),
            collectCash: jest.fn(),
            collectTransfer: jest.fn(),
            cancelInvoice: jest.fn().mockResolvedValue({
              message: 'Hủy hóa đơn thành công',
              data: { id: 1, trangThai: 'DA_HUY' },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ThanhToanController>(ThanhToanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call cancelInvoice on ThanhToanService', async () => {
    const service = controller['thanhToanService'];
    const mockUser = {
      id: 5,
      email: 'test@clinic.vn',
      roles: ['RECEPTIONIST'],
      vaiTro: 'RECEPTIONIST',
    };
    const result = await controller.cancelInvoice(
      '1',
      { lyDoHuy: 'Bệnh nhân xin hủy do đổi lịch' },
      mockUser as any,
    );

    expect(service.cancelInvoice).toHaveBeenCalledWith(
      1,
      'Bệnh nhân xin hủy do đổi lịch',
      5,
    );
    expect(result.message).toBe('Hủy hóa đơn thành công');
  });
});
