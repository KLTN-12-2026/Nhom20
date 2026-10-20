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
          },
        },
      ],
    }).compile();

    controller = module.get<ThanhToanController>(ThanhToanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
