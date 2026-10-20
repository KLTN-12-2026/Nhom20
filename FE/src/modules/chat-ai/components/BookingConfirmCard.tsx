import { CalendarCheck, Clock3, UserRound } from 'lucide-react';
import type { BookingDraft } from '../types/chat-ai.types';

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function BookingConfirmCard({ draft, onConfirm, isLoading }: {
  draft: BookingDraft; onConfirm: () => void; isLoading: boolean;
}) {
  return <section className="chatbox-v1-booking-card" aria-label="Xác nhận yêu cầu đặt lịch">
    <div className="chatbox-v1-booking-title"><CalendarCheck size={18} /><strong>Xác nhận yêu cầu đặt lịch</strong></div>
    <p><UserRound size={14} /> {draft.fullName} · {draft.phoneNumber}</p>
    <p><strong>Chuyên khoa:</strong> {draft.specialtyName ?? `Mã chuyên khoa ${draft.specialtyId}`}</p>
    <p><Clock3 size={14} /> {formatDate(draft.appointmentDate)} · {draft.appointmentTime}</p>
    <p className="chatbox-v1-booking-reason">Lý do: {draft.reason}</p>
    <small>Lễ tân sẽ xác nhận lịch và phân công bác sĩ sau khi bạn gửi yêu cầu.</small>
    <button type="button" className="chatbox-v1-booking-confirm" onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Đang gửi…' : 'Xác nhận đặt lịch'}</button>
  </section>;
}
