export interface BatchAllocationDto { batchId: number; quantity: number; }
export interface DispenseLineDto { prescriptionItemId: number; batches: BatchAllocationDto[]; }
export interface DispensePrescriptionDto { items: DispenseLineDto[]; notes?: string; }

export interface DispensingBatch {
  batchId: number;
  batchCode: string;
  expiryDate: string;
  remainingStock: number;
}

export interface DispensingPrescriptionItem {
  id: number;
  medicine: { id: number; name: string; unit: string; };
  quantity: number;
  dosage: string;
  frequency?: string;
  days?: number;
  instructions: string | null;
  availableBatches: DispensingBatch[];
  suggestedAllocations: BatchAllocationDto[];
  isStockSufficient: boolean;
}

export interface DispensingPrescription {
  id: number; code: string; status: string;
  patient: { id: number; fullName: string; code: string; };
  doctor: { id: number; fullName: string; specialty: string; };
  pharmacist: { id: number; fullName: string; } | null;
  refusal: {
    reason: string;
    refusedAt: string | null;
    pharmacist: { id: number; fullName: string; } | null;
  } | null;
  diagnosis: string | null; createdAt: string; dispensedAt: string | null;
  items: DispensingPrescriptionItem[];
}
