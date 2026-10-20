export interface PrescriptionLineDto {
  medicineId: number;
  quantity: number;
  dosage: string;
  frequency: string;
  days: number;
  instructions?: string;
}

export interface SaveExaminationDto {
  vitals?: Record<string, string | number | null>;
  specialtyContent?: Record<string, string | number | null>;
  specialtyData?: Record<string, string | number | null>;
  symptoms?: string;
  diagnosis?: string;
  icd10Code?: string;
  conclusion?: string;
  doctorNotes?: string;
  followUpDate?: string;
  prescription?: PrescriptionLineDto[];
}

export interface PrescriptionWarning {
  id: number;
  type: string;
  severity: 'THONG_TIN' | 'CAN_THAN' | 'NGHIEM_TRONG';
  source: string;
  title: string;
  content: string;
  recommendation: string | null;
  medicineName: string | null;
  ingredientName: string | null;
  allergyName: string | null;
  allergyReaction: string | null;
  conflictingIngredientName: string | null;
  status: 'CHO_XU_LY' | 'DA_XAC_NHAN' | 'DA_BO_QUA';
  reason: string | null;
  createdAt: string;
  suggestions?: MedicineAlternative[];
}

export interface MedicineAlternative {
  suggestionId: number;
  medicineId: number;
  medicineCode: string;
  medicineName: string;
  unit: string;
  activeIngredients: string[];
  availableQuantity: number;
  professionalNote: string | null;
}

export interface AiRankedMedicineSuggestion extends MedicineAlternative {
  rank: number;
  reason: string;
}

export interface WarningAiSuggestionResult {
  warningId: number;
  suggestions: AiRankedMedicineSuggestion[];
  source: 'GEMINI' | 'HE_THONG';
  status: 'SUCCESS' | 'NO_CANDIDATE';
  notice?: string;
}
