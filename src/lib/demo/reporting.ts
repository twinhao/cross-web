import { canAccessFeature } from "../feature-access.ts";
import type { DisplayBoard, DoctorDurations, FacilityAnalytics } from "../types/clinic.ts";
import { demoDay, type DemoAppointment, type DemoData } from "./data.ts";

const count = (list: DemoAppointment[], status: string) => list.filter(a => a.status === status).length;
const ratio = (n: number, d: number) => d ? Math.round(n / d * 10_000) / 10_000 : 0;
function windowFor(params: URLSearchParams) {
  const value = Number(params.get("range") ?? 30);
  const days = Number.isInteger(value) && value >= 1 && value <= 365 ? value : 30;
  return { range_days: days, start_date: demoDay(1 - days), end_date: demoDay() };
}
function inWindow(state: DemoData, window: { start_date: string; end_date: string }) {
  return state.appointments.filter(a => String(a.appointment_date) >= window.start_date && String(a.appointment_date) <= window.end_date);
}
function bucket(date: string, granularity: FacilityAnalytics["granularity"]) {
  if (granularity === "month") return date.slice(0, 7) + "-01";
  if (granularity === "day") return date;
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
export function demoAnalytics(state: DemoData, params: URLSearchParams): FacilityAnalytics {
  const window = windowFor(params), list = inWindow(state, window);
  const value = params.get("granularity");
  const granularity = value === "week" || value === "month" ? value : "day";
  const patients = new Map<string, number>(), periods = new Map<string, number>(), methods = new Map<string, number>(), hours = new Map<number, number>();
  for (const row of list) {
    const patient = String(row.patient_id), period = bucket(String(row.appointment_date), granularity), method = String(row.booking_method), hour = Number(String(row.appointment_time).slice(0, 2));
    patients.set(patient, (patients.get(patient) ?? 0) + 1);
    periods.set(period, (periods.get(period) ?? 0) + 1);
    methods.set(method, (methods.get(method) ?? 0) + 1);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
  }
  const completed = count(list, "completed"), cancelled = count(list, "cancelled"), no_show = count(list, "no_show");
  return { ...window, granularity, total: list.length, confirmed: count(list, "confirmed"), completed, cancelled, no_show,
    no_show_rate: ratio(no_show, completed + cancelled + no_show), unique_patients: patients.size,
    repeat_patient_rate: ratio([...patients.values()].filter(n => n >= 2).length, patients.size),
    trend: [...periods].sort(([a], [b]) => a.localeCompare(b)).map(([period, count]) => ({ period, count })),
    by_method: [...methods].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([method, count]) => ({ method, count })),
    by_hour: hours.size ? Array.from({ length: Math.max(...hours.keys()) - Math.min(...hours.keys()) + 1 }, (_, i) => { const hour = Math.min(...hours.keys()) + i; return { hour, count: hours.get(hour) ?? 0 }; }) : [],
  };
}
export function demoVisitors(state: DemoData, params: URLSearchParams) {
  const window = windowFor(params);
  return { ...window, visitor_count: new Set(inWindow(state, window).map(a => a.patient_id)).size,
    page_view_count: state.pageViewDays.filter(day => day >= window.start_date && day <= window.end_date).length };
}

function duration(row: DemoAppointment) {
  const times = (status: string) => row.events.filter(e => e.to_status === status && e.created_at).map(e => Date.parse(e.created_at!)).filter(Number.isFinite);
  const checked = times("checked_in"), started = times("in_progress"), done = times("completed");
  const minutes = (end: number, start: number) => end > start ? Math.min(360, (end - start) / 60_000) : null;
  const lastStart = Math.max(...started);
  return { consult: started.length && done.length ? minutes(Math.min(...done), lastStart) : null,
    wait: started.length && checked.length ? minutes(lastStart, Math.min(...checked)) : null };
}
const average = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : null;
export function demoDurations(state: DemoData, params: URLSearchParams): DoctorDurations {
  const window = windowFor(params), list = inWindow(state, window);
  const ids = [...new Set(list.map(a => a.staff_id == null ? null : String(a.staff_id)))];
  return { range_days: window.range_days, doctors: ids.map(id => {
    const samples = list.filter(a => (a.staff_id ?? null) === id).map(duration);
    const consults = samples.map(s => s.consult).filter((v): v is number => v != null), waits = samples.map(s => s.wait).filter((v): v is number => v != null);
    return { staff_id: id, staff_name: state.staff.find(s => s.id === id)?.name as string ?? null,
      avg_consult_minutes: average(consults), consult_count: consults.length, avg_wait_minutes: average(waits), wait_count: waits.length };
  }).filter(d => d.consult_count || d.wait_count).sort((a, b) => (b.avg_consult_minutes ?? -1) - (a.avg_consult_minutes ?? -1)) };
}
export function demoPatientStats(list: DemoAppointment[]) {
  const completed = count(list, "completed"), no_show = count(list, "no_show"), dates = list.map(a => String(a.appointment_date)).sort();
  const staff = new Map<string, number>();
  for (const row of list) if (row.staff_name) staff.set(String(row.staff_name), (staff.get(String(row.staff_name)) ?? 0) + 1);
  return { total: list.length, completed, cancelled: count(list, "cancelled"), no_show,
    upcoming: list.filter(a => ["confirmed", "checked_in", "in_progress"].includes(String(a.status))).length,
    no_show_rate: ratio(no_show, completed + no_show), first_visit: dates[0] ?? null, last_visit: dates.at(-1) ?? null,
    top_staff_name: [...staff].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null };
}
export function demoCurrentNumber(list: DemoAppointment[]): number | null {
  const numbers = (status: string) => list.filter(a => a.status === status && a.queue_number != null).map(a => Number(a.queue_number));
  const active = numbers("in_progress"), completed = numbers("completed");
  return active.length ? Math.max(...active) : completed.length ? Math.max(...completed) : null;
}
function maskedName(value: unknown) {
  const name = String(value ?? "").replace(/（示範）$/, "").trim(), letters = [...name];
  return letters.length <= 1 ? "＊" : letters[0] + "＊".repeat(Math.max(1, letters.length - 2)) + (letters.length > 2 ? letters.at(-1) : "");
}
export function demoBoard(state: DemoData, date = demoDay()): DisplayBoard {
  const enabled = state.facility.is_active && canAccessFeature(state.facility, "advanced_queue");
  const board: DisplayBoard = { enabled, facility_name: state.facility.name, date, groups: [] };
  if (!enabled) return board;
  const today = state.appointments.filter(a => a.appointment_date === date), ids = [...new Set(today.map(a => a.staff_id == null ? null : String(a.staff_id)))];
  const historical = inWindow(state, windowFor(new URLSearchParams())).map(a => ({ staff: a.staff_id == null ? null : String(a.staff_id), minutes: duration(a).consult })).filter((a): a is { staff: string | null; minutes: number } => a.minutes != null);
  board.groups = ids.map(id => {
    const list = today.filter(a => (a.staff_id ?? null) === id), active = list.filter(a => ["checked_in", "in_progress"].includes(String(a.status)) && !a.queue_deferred);
    const waiting_count = active.filter(a => a.status === "checked_in").length;
    let samples = historical.filter(a => a.staff === id);
    if (samples.length < 3) samples = historical;
    const perPatient = Math.max(3, Math.min(30, samples.length >= 3 ? average(samples.map(a => a.minutes))! : 10));
    return { staff_name: state.staff.find(s => s.id === id)?.name as string ?? null, current_number: demoCurrentNumber(list), waiting_count,
      estimated_wait_minutes: Math.round(waiting_count * perPatient),
      appointments: active.sort((a, b) => Number(a.queue_number ?? Infinity) - Number(b.queue_number ?? Infinity) || String(a.appointment_time).localeCompare(String(b.appointment_time))).map(a => ({ queue_number: a.queue_number as number ?? null, masked_name: maskedName(a.patient_name), status: a.status as "checked_in" | "in_progress" })) };
  }).sort((a, b) => (a.staff_name ?? "").localeCompare(b.staff_name ?? ""));
  return board;
}
