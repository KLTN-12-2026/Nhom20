export interface PatientVisit {
  id: number;
  code: string;
  examinedAt: string;
  status: string;
  specialty: { name: string } | null;
  doctor: { name: string } | null;
  diagnosis: string | null;
  conclusion: string | null;
  prescription: {
    code: string;
    status: string;
    items: Array<{ name: string; activeIngredient: string | null; unit: string; quantity: number; dosage: string; frequency: string; days: number; instruction: string | null }>;
  } | null;
  invoice: { code: string; total: number; status: string; paidAt: string | null; payments: Array<{ amount: number; method: string; status: string; paidAt: string | null }> } | null;
  review: { rating: number; comment: string | null; status: string; createdAt: string } | null;
  isReviewable: boolean;
}
