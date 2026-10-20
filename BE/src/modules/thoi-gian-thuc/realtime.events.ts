export const REALTIME_EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  QUEUE_TICKET_CREATED: 'queue.ticket_created',
  QUEUE_PATIENT_CALLED: 'queue.patient_called',
  QUEUE_UPDATED: 'queue.updated',
  NEW_NOTIFICATION: 'new_notification',
  WORK_SCHEDULE_PUBLISHED: 'work_schedule.published',
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_UPDATED: 'prescription.updated',
  PRESCRIPTION_DISPENSED: 'prescription.dispensed',
  PRESCRIPTION_WARNING_CREATED: 'prescription.warning_created',
  PAYMENT_SUCCESS: 'payment.success',
} as const;

export const REALTIME_ROOMS = {
  role: (role: string) => `role:${role}`,
  user: (userId: number) => `user:${userId}`,
  doctor: (doctorId: number) => `doctor:${doctorId}`,
  specialty: (specialtyId: number) => `specialty:${specialtyId}`,
  publicWaitingBoard: 'public:waiting-board',
} as const;
