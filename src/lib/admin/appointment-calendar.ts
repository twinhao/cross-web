import type { ApiAppointment } from "../types/clinic.ts";
import { minutes } from "./scheduling.ts";

export const CALENDAR_HOUR_HEIGHT = 96;
export const CALENDAR_MINUTE_HEIGHT = CALENDAR_HOUR_HEIGHT / 60;

/** 同一人員的重疊預約分欄；短預約保留可閱讀高度，也納入碰撞計算。 */
export function calendarEvents(rows: ApiAppointment[], fallbackDuration: number) {
  const events = rows.map(appointment => {
    const start = minutes(appointment.appointment_time);
    const duration = appointment.duration_minutes ?? fallbackDuration;
    return { appointment, start, end: start + Math.max(15, duration),
      height: Math.max(24, duration * CALENDAR_MINUTE_HEIGHT - 2), lane: 0, lanes: 1 };
  }).sort((a, b) => a.start - b.start || b.end - a.end || a.appointment.id.localeCompare(b.appointment.id));
  let group: typeof events = [], ends: number[] = [], groupEnd = -1;
  function finishGroup() {
    for (const event of group) event.lanes = ends.length;
    group = [];
    ends = [];
  }
  for (const event of events) {
    if (event.start >= groupEnd) finishGroup();
    const available = ends.findIndex(end => end <= event.start);
    event.lane = available < 0 ? ends.length : available;
    ends[event.lane] = event.end;
    group.push(event);
    groupEnd = Math.max(groupEnd, event.end);
  }
  finishGroup();
  return events;
}
