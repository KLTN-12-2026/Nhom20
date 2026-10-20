export type ChatRole = 'NGUOI_DUNG' | 'TRO_LY';

export interface ChatSession {
  id: number;
  code: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: string;
  isPending?: boolean;
}

export interface ChatSessionStorage {
  session: ChatSession;
  sessionToken: string;
}

export interface CreateChatSessionResult {
  session: ChatSession;
  sessionToken: string | null;
}

export interface ChatMessagesResult {
  session: ChatSession;
  messages: ChatMessage[];
  bookingDraft: BookingDraft | null;
}

export interface SendChatMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  bookingDraft: BookingDraft | null;
}

export interface BookingDraft {
  id: number;
  status: 'DANG_CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DA_HUY';
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: 'NAM' | 'NU' | 'KHAC';
  email: string | null;
  specialtyId: number;
  specialtyName: string | null;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  note: string | null;
  createdAt: string;
}

export interface ConfirmBookingResult {
  appointment: { id: number; code: string; status: string };
  assistantMessage: ChatMessage;
}
