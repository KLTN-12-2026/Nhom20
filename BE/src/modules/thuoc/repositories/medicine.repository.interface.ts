import { Thuoc, Prisma, TrangThaiChung } from '@prisma/client';
import { StockInDto } from '../dto/stock-in.dto';

// Giữ quan hệ lô và hoạt chất trong cùng một truy vấn, tránh đọc cột text lặp.
export const medicineInclude = {
  loThuoc: true,
  hoatChatCauThanh: { include: { hoatChat: true } },
} satisfies Prisma.ThuocInclude;

export type MedicineWithRelations = Prisma.ThuocGetPayload<{
  include: typeof medicineInclude;
}>;

export interface MedicineRepository {
  findAll(
    search?: string,
    group?: string,
    status?: TrangThaiChung,
  ): Promise<MedicineWithRelations[]>;
  findById(id: number): Promise<MedicineWithRelations | null>;
  findConflict(name: string, excludeId?: number): Promise<Thuoc | null>;
  findLastCode(): Promise<string | null>;
  create(data: Prisma.ThuocCreateInput): Promise<MedicineWithRelations>;
  update(
    id: number,
    data: Prisma.ThuocUpdateInput,
  ): Promise<MedicineWithRelations>;
  delete(id: number): Promise<Thuoc>;
  stockIn(
    id: number,
    userId: number,
    dto: StockInDto,
  ): Promise<MedicineWithRelations>;
  replaceActiveIngredient(
    medicineId: number,
    activeIngredient?: string,
  ): Promise<MedicineWithRelations>;
  findBatches(
    search?: string,
  ): Promise<Array<Prisma.LoThuocGetPayload<{ include: { thuoc: true } }>>>;
  isDepartmentHead(userId: number): Promise<boolean>;
}

export const MEDICINE_REPOSITORY = Symbol('MEDICINE_REPOSITORY');
