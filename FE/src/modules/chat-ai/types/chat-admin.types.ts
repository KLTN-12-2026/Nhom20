export type ChatVisitorFilter = '' | 'GUEST' | 'PATIENT';
export type ChatSessionFilter = '' | 'DANG_HOAT_DONG' | 'DA_KET_THUC';

export interface ChatAdminOverview {
  todaySessionCount: number;
  todayMessageCount: number;
  successfulRunCount: number;
  failedRunCount: number;
  averageLatencyMs: number | null;
  guestSessionCount: number;
  patientSessionCount: number;
  confirmedBookingCount: number;
}

export interface ChatAdminSession {
  id: number;
  code: string;
  title: string | null;
  status: string;
  sessionType: string;
  createdAt: string;
  updatedAt: string;
  visitor: {
    type: 'GUEST' | 'PATIENT' | 'ACCOUNT';
    fullName: string;
    phoneNumber: string | null;
    email?: string | null;
  };
  lastMessage: { content: string; role: string; createdAt: string } | null;
  messageCount: number;
  bookingStatus: string | null;
  appointmentId: number | null;
  latestRun: { status: string; latencyMs: number | null; errorCode: string | null } | null;
}

export interface ChatAdminSessionDetail extends ChatAdminSession {
  messages: Array<{ id: number; role: string; content: string; createdAt: string }>;
  bookingDrafts: Array<{
    id: number;
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    specialtyId: number;
    status: string;
    appointmentId: number | null;
  }>;
  runs: Array<{
    id: number;
    task: string;
    model: string;
    status: string;
    latencyMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

export interface ChatAdminFilters {
  search: string;
  visitorType: ChatVisitorFilter;
  status: ChatSessionFilter;
  page: number;
  limit: number;
}
