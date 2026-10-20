import { Module } from '@nestjs/common';

import { GoiYThuocService } from './goi-y-thuoc.service';
import { GOI_Y_THUOC_REPOSITORY } from './repositories/goi-y-thuoc.repository.interface';
import { PrismaGoiYThuocRepository } from './repositories/prisma-goi-y-thuoc.repository';

@Module({
  providers: [
    GoiYThuocService,
    { provide: GOI_Y_THUOC_REPOSITORY, useClass: PrismaGoiYThuocRepository },
  ],
  exports: [GoiYThuocService],
})
export class GoiYThuocModule {}
