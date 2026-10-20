export type QueueStatus =
  | 'CHO_GOI'
  | 'DANG_GOI'
  | 'DA_VAO_PHONG'
  | 'DA_HOAN_TAT'
  | 'BO_QUA'
  | 'DA_HUY';

export interface QueueTicket {
  id: number;
  queueNumber: string;
  ordinalNumber: number;
  status: QueueStatus;
  calledAt: string | null;
  patient: {
    id: number;
    code: string;
    fullName: string;
    phoneNumber: string | null;
  };
  doctor: { id: number; fullName: string } | null;
  specialty: { id: number; name: string };
  room: { id: number; name: string } | null;
  visit: { id: number; reason: string; appointmentId: number | null };
}
