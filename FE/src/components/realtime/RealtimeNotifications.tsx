import { useCallback } from 'react';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import type { Appointment } from '@/modules/lich-hen/types/appointment.types';

export default function RealtimeNotifications() {
  const { showToast } = useAppToast();

  const notifyNewAppointment = useCallback(
    (appointment: Appointment) => {
      showToast(
        `Có lịch hẹn mới từ ${appointment.patient.fullName}`,
        'info',
      );
    },
    [showToast],
  );

  const notifyNewTicket = useCallback(
    (appointment: Appointment) => {
      showToast(
        `${appointment.patient.fullName} vừa được cấp phiếu ${appointment.ticket?.queueNumber ?? ''}`,
        'info',
      );
    },
    [showToast],
  );

  useRealtimeEvent('appointment.created', notifyNewAppointment);
  useRealtimeEvent('queue.ticket_created', notifyNewTicket);
  return null;
}
