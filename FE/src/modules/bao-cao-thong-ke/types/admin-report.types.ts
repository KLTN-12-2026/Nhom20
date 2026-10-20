export interface ReportMetricItem {
  label: string;
  value: number;
}

export interface AdminReportOverview {
  period: { from: string; to: string };
  summary: {
    appointmentCount: number;
    pendingAppointmentCount: number;
    completedVisitCount: number;
    patientCount: number;
    revenue: number;
    paymentCount: number;
    reviewCount: number;
    averageRating: number | null;
  };
  appointmentsByDay: ReportMetricItem[];
  appointmentsByStatus: ReportMetricItem[];
  visitsBySpecialty: ReportMetricItem[];
  revenueByDay: ReportMetricItem[];
  paymentMethods: ReportMetricItem[];
}
