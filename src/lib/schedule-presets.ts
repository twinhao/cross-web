import type { ScheduleEntry, ScheduleSession } from "./types/schedule.ts";

export interface SchedulePreset { start: string; end: string }
export type SchedulePresets = Record<ScheduleSession, SchedulePreset>;
export const SESSION_LABELS: Record<ScheduleSession, string> = {
  morning: "上午", afternoon: "下午", evening: "晚間",
};
export const SESSION_KEYS: ScheduleSession[] = ["morning", "afternoon", "evening"];
export function schedulePresets(value?: SchedulePresets | null): SchedulePresets {
  const defaults: SchedulePresets = {
    morning: { start: "09:00", end: "12:00" },
    afternoon: { start: "13:00", end: "17:00" },
    evening: { start: "18:00", end: "21:00" },
  };
  // 逐段複製亦可接受 Svelte 的響應式物件，不對 Proxy 呼叫 structuredClone。
  return {
    morning: { ...(value?.morning ?? defaults.morning) },
    afternoon: { ...(value?.afternoon ?? defaults.afternoon) },
    evening: { ...(value?.evening ?? defaults.evening) },
  };
}
export function validSchedulePresets(value: SchedulePresets): boolean {
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return SESSION_KEYS.every(key => time.test(value[key].start) && time.test(value[key].end) && value[key].start < value[key].end);
}
/** 只去除完全重複的班段，保留同人同日的休息前後與不同時間。 */
export function timetableEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const seen = new Set<string>();
  return [...entries].sort((a,b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time) || a.doctor_name.localeCompare(b.doctor_name)).filter(entry => {
    const key = JSON.stringify([entry.date, entry.doctor_id, entry.session, entry.start_time, entry.end_time]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
