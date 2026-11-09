import type { QueueAppointmentItem, QueueGroup } from '../types/clinic.ts';

/** 與叫號端點一致：依號碼，未配號者最後，再依預約時間。 */
export function queueOrder(a: QueueAppointmentItem, b: QueueAppointmentItem): number {
  return (a.queue_number ?? Infinity) - (b.queue_number ?? Infinity) || a.appointment_time.localeCompare(b.appointment_time);
}

export function receptionGroup(group: QueueGroup) {
  return {
    ...group,
    arrivals: group.appointments.filter(a => a.status === 'confirmed').sort((a, b) => a.appointment_time.localeCompare(b.appointment_time) || queueOrder(a, b)),
    waiting: group.appointments.filter(a => a.status === 'checked_in').sort(queueOrder),
    serving: group.appointments.filter(a => a.status === 'in_progress').sort(queueOrder),
    ended: group.appointments.filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status)),
  };
}
