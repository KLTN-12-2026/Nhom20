import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThanhToanService } from './thanh-toan.service';

describe('ThanhToanService', () => {
  let service: ThanhToanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThanhToanService,
        { provide: PrismaService, useValue: {} },
        { provide: RealtimeService, useValue: { emitToRoom: jest.fn() } },
      ],
    }).compile();

    service = module.get<ThanhToanService>(ThanhToanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
