import { createDemoData, DEMO_ID, demoDay, type DemoRow } from "./data.ts";
import { FALLBACK_TAXONOMY } from "../api/service-categories.ts";
import { schedulePresets, validSchedulePresets, SESSION_KEYS, type SchedulePresets } from "../schedule-presets.ts";

export class DemoError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown) => String(value ?? "");
const minutes = (value: unknown) => { const [h, m] = text(value).split(":").map(Number); return h * 60 + m; };
const clock = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const live = (row: DemoRow) => ["confirmed", "checked_in", "in_progress"].includes(text(row.status));
type Options = RequestInit & { params?: Record<string, string> };

/** 僅在本分頁記憶體運作；無資料庫、認證、網路或通知能力。未實作端點一律拒絕。 */
export function createDemoSession() {
  let state = createDemoData();
  let presets = schedulePresets();
  const objectUrls = new Set<string>();
  const newId = () => `demo-${crypto.randomUUID()}`;
  function reset() { for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls.clear(); state = createDemoData(); presets = schedulePresets(); }
  function upload(body: RequestInit["body"]) {
    const file = body instanceof FormData ? body.get("file") : null;
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new DemoError(422, "請選擇 5MB 內的 JPG、PNG、WebP 或 AVIF 圖片；圖片只保留在此分頁。");
    const url = URL.createObjectURL(file); objectUrls.add(url); return url;
  }
  function gallery() { return { photos: state.photos, revision: String(state.galleryRevision), max_photos: 12 }; }
  function rows(collection: DemoRow[], id: string | undefined, method: string, body: Record<string, unknown>, defaults = {}) {
    if (!id) {
      if (method === "GET") return collection;
      if (method === "POST") { const row = { ...defaults, ...body, id: newId(), facility_id: DEMO_ID, created_at: new Date().toISOString() }; collection.push(row); return row; }
    }
    const index = collection.findIndex(row => row.id === id);
    if (index < 0) throw new DemoError(404, "找不到這筆示範資料，請重新整理後再試。");
    if (method === "DELETE") { collection.splice(index, 1); return {}; }
    if (method === "PATCH") Object.assign(collection[index], body, { id, facility_id: DEMO_ID });
    if (!["GET", "PATCH"].includes(method)) throw new DemoError(405, "此示範操作尚未提供。");
    return collection[index];
  }
  function available(serviceId: string, staffId: string | null, allowGeneral = false) {
    const service = state.services.find(row => row.id === serviceId && row.is_active);
    if (serviceId && !service || !serviceId && !allowGeneral || !state.facility.is_active) return [];
    const duration = number(service?.duration_minutes ?? state.facility.slot_duration), step = Math.max(15, state.facility.slot_duration);
    const now = new Date(), taipeiTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" }).format(now);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = demoDay(offset), start = new Date(`${date}T00:00:00+08:00`);
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const hours = state.facility.business_hours?.[days[new Date(`${date}T12:00:00Z`).getUTCDay()]];
      const candidates = state.staff.filter(person => person.is_active && person.is_bookable && person.is_public_visible && (!staffId || person.id === staffId) && (!serviceId || state.assignments[person.id]?.includes(serviceId)));
      const slots = [];
      if (hours && duration > 0) for (let t = minutes(hours.open); t + duration <= minutes(hours.close); t += step) {
        if (offset === 0 && t <= minutes(taipeiTime)) continue;
        if (hours.breaks?.some(rest => t < minutes(rest.end) && t + duration > minutes(rest.start))) continue;
        const free = candidates.some(person => state.schedules.some(shift => shift.staff_id === person.id && shift.schedule_date === date && shift.is_available !== false && t >= minutes(shift.start_time) && t + duration <= minutes(shift.end_time)) &&
          !state.leaves.some(leave => leave.staff_id === person.id && text(leave.start_date) <= date && text(leave.end_date) >= date) &&
          !state.appointments.some(appointment => appointment.staff_id === person.id && appointment.appointment_date === date && live(appointment) && t < minutes(appointment.appointment_time) + number(appointment.duration_minutes) && t + duration > minutes(appointment.appointment_time)));
        slots.push({ id: `${date}-${clock(t)}`, time: clock(t), period: t < 720 ? "morning" : t < 1080 ? "afternoon" : "evening", isAvailable: free });
      }
      return { date, dayOfWeek: new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", weekday: "short" }).format(start).replace("週", ""), dayNumber: Number(date.slice(-2)), isToday: offset === 0, isAvailable: slots.some(slot => slot.isAvailable), slots };
    });
  }
  function booking(row: DemoRow) {
    const service = state.services.find(s => s.id === row.service_id), person = state.staff.find(s => s.id === row.staff_id);
    return { id: row.id, booking_number: `DEMO-${row.id.slice(-8).toUpperCase()}`, status: row.status, clinic: { name: state.facility.name, address: state.facility.address, phone: "" }, service: { name: service?.service_name, duration_minutes: row.duration_minutes }, doctor: person ? { name: person.name, title: person.department } : null, appointment_datetime: `${row.appointment_date}T${text(row.appointment_time).slice(0, 5)}:00+08:00`, patient_name: row.patient_name, patient_phone: row.patient_phone, queue_number: row.queue_number };
  }
  function addAppointment(body: Record<string, unknown>, online: boolean) {
    const serviceId = text(body.service_id), date = text(body.appointment_date), time = text(body.appointment_time).slice(0, 5);
    const requestedStaff = text(body.staff_id ?? body.doctor_id) || null;
    const person = state.staff.find(person => (!requestedStaff || person.id === requestedStaff) && available(serviceId, person.id, !online).some(day => day.date === date && day.slots.some(slot => slot.time === time && slot.isAvailable)));
    if (!person) throw new DemoError(409, "此示範時段已不可用，請重新選擇。");
    const service = state.services.find(row => row.id === serviceId);
    let patient = state.patients.find(row => row.id === (online ? body.member_patient_id : body.patient_id));
    if (!online && body.patient_id) {
      if (!patient) throw new DemoError(404, "示範客戶不存在。");
      if (!patient.is_active) throw new DemoError(409, "此示範客戶已停用。");
      if ([body.patient_name, body.patient_national_id, body.patient_phone, body.patient_gender].some(value => value != null)) throw new DemoError(422, "已選取客戶，請勿另送身分資料。");
    }
    if (!online && !body.patient_id) {
      patient = {id: newId(), name: text(body.patient_name), phone: text(body.patient_phone), gender: body.patient_gender ?? null,
        national_id_last4: text(body.patient_national_id).slice(-4), is_active: true, appointment_count: 0, no_show_count: 0};
      state.patients.push(patient);
    }
    patient ??= state.patients[0];
    const row: DemoRow = { ...body, id: newId(), facility_id: DEMO_ID, staff_id: person.id, staff_name: person.name, service_id: service?.id ?? null, service_name: service?.service_name ?? null, duration_minutes: service?.duration_minutes ?? state.facility.slot_duration,
      patient_id: patient.id, patient_name: patient.name, patient_phone: patient.phone,
      appointment_date: date, appointment_time: `${time}:00`, status: "confirmed", booking_method: online ? "online" : body.booking_method, queue_number: state.appointments.filter(a => a.appointment_date === date).length + 1, notes: body.notes ?? null, check_in_time: null, created_at: new Date().toISOString(), updated_at: null };
    state.appointments.push(row); return online ? booking(row) : row;
  }
  function handle(endpoint: string, options: Options = {}): unknown {
    const url = new URL(endpoint, "https://demo.invalid");
    if (url.origin !== "https://demo.invalid") throw new DemoError(403, "示範環境不允許外部請求。");
    for (const [key, value] of Object.entries(options.params ?? {})) url.searchParams.set(key, value);
    const path = url.pathname, method = options.method ?? "GET";
    const body: Record<string, unknown> = typeof options.body === "string" ? JSON.parse(options.body) : {};
    if (path === "/api/v1/service-categories" && method === "GET") return FALLBACK_TAXONOMY;
    if (path === "/api/v1/member/patients/" && method === "GET") return state.patients.map(row => ({ ...row, user_id: "demo-user", identifier_type: "national_id", identifier_last4: "0000", relation: "self" }));
    if (/^\/api\/v1\/member\/favorites/.test(path)) {
      if (method === "GET") return state.favorites.map(id => ({ ...state.facility, id }));
      if (method === "POST") state.favorites.push(DEMO_ID); else state.favorites = [];
      return {};
    }
    const publicBase = `/api/v1/booking/clinics/${DEMO_ID}`;
    if (path === "/api/v1/booking/clinics" && method === "GET") return [{ ...state.facility, logo: state.facility.logo_url, online_booking_enabled: true, members: state.staff }];
    if (path === publicBase && method === "GET") return { ...state.facility, logo: state.facility.logo_url, online_booking_enabled: true, members: state.staff };
    if (path.startsWith(publicBase + "/")) {
      const suffix = path.slice(publicBase.length);
      if (suffix === "/config" && method === "GET") return { ...state.facility, clinic_name: state.facility.name, logo: state.facility.logo_url, primary_color: "#315d50", online_booking_enabled: true };
      if (suffix === "/services" && method === "GET") return state.services.filter(row => row.is_active);
      if (suffix === "/doctors" && method === "GET") return state.staff.filter(row => row.is_active && row.is_public_visible).map(row => ({ ...row, specialties: row.main_specialties, avatar: row.avatar_url }));
      if (suffix === "/photos" && method === "GET") return state.photos;
      if (suffix === "/announcements" && method === "GET") return state.announcements.filter(row => row.is_active);
      if (suffix === "/slots" && method === "GET") return available(url.searchParams.get("service_id") ?? "", url.searchParams.get("doctor_id"));
      if (suffix === "/appointments" && method === "POST") return addAppointment(body, true);
      if (suffix === "/schedule" && method === "GET") {
        const offset = Number(url.searchParams.get("week_offset") ?? 0), current = new Date(`${demoDay()}T12:00:00Z`), weekday = (current.getUTCDay() + 6) % 7;
        const monday = demoDay(-weekday + offset * 7), end = demoDay(6 - weekday + offset * 7);
        return { week_start: monday, week_end: end, week_offset: offset, entries: state.schedules.filter(row => text(row.schedule_date) >= monday && text(row.schedule_date) <= end).map(row => ({ date: row.schedule_date, weekday: (new Date(`${row.schedule_date}T12:00Z`).getUTCDay() + 6) % 7, session: row.session, start_time: row.start_time, end_time: row.end_time, doctor_id: row.staff_id, doctor_name: row.staff_name, department: "示範團隊" })) };
      }
    }
    const base = `/api/v1/medical-facilities/${DEMO_ID}`;
    if (path === base) {
      if (method === "PATCH") Object.assign(state.facility, body, { id: DEMO_ID });
      if (!["GET", "PATCH"].includes(method)) throw new DemoError(403, "示範院所無法刪除，請使用重置示範。");
      return state.facility;
    }
    if (path.startsWith(base + "/")) {
      const parts = path.slice(base.length + 1).split("/"), [resource, id, child, childId] = parts;
      if (resource === "settings" && !id) {
        if (!["GET", "PATCH"].includes(method)) throw new DemoError(405, "請使用讀取或更新設定。");
        if (method === "PATCH") {
          if ("schedule_presets" in body) {
            const value = body.schedule_presets;
            if (value !== null) {
              const entries = value as Partial<SchedulePresets> | undefined;
              if (!entries || !SESSION_KEYS.every(key => typeof entries[key]?.start === "string" && typeof entries[key]?.end === "string") || !validSchedulePresets(entries as SchedulePresets)) throw new DemoError(422, "請填寫有效的常用時段。");
            }
            presets = schedulePresets(value as SchedulePresets | null);
          }
          if ("business_hours" in body) state.facility.business_hours = body.business_hours as typeof state.facility.business_hours;
          if ("slot_duration" in body) {
            const duration = number(body.slot_duration);
            if (!Number.isInteger(duration) || duration < 15 || duration > 240) throw new DemoError(422, "請填寫有效的預約間隔。");
            state.facility.slot_duration = duration;
          }
        }
        return { business_hours: state.facility.business_hours, slot_duration: state.facility.slot_duration, schedule_presets: presets };
      }
      if (resource === "photos") {
        if (method === "POST") { if (state.photos.length >= 12) throw new DemoError(422, "示範相簿最多 12 張照片。"); state.photos.push({ id: newId(), url: upload(options.body), caption: "自行上傳的示範照片" }); }
        if (method === "PATCH") { if (String(state.galleryRevision) !== text(body.revision)) throw new DemoError(409, "示範相簿已更新，請重新開啟。"); const photos = body.photos as { id: string; caption: string }[]; state.photos = photos.map(p => ({ ...state.photos.find(row => row.id === p.id)!, caption: p.caption })).filter(p => p.url); }
        if (method === "DELETE") state.photos = state.photos.filter(p => p.id !== id);
        if (method !== "GET") state.galleryRevision++;
        return gallery();
      }
      if (resource === "logo") { state.facility.logo_url = method === "DELETE" ? null : upload(options.body); return state.facility; }
      if (resource === "subscription" && method === "PATCH") { Object.assign(state.facility, body); return state.facility; }
      if (resource === "staff" && id && child === "services") {
        const links = state.assignments[id] ??= [];
        if (method === "POST" && !links.includes(text(body.service_id))) links.push(text(body.service_id));
        if (method === "DELETE") state.assignments[id] = links.filter(serviceId => serviceId !== childId);
        return state.assignments[id].map(serviceId => ({ id: `${id}-${serviceId}`, service_id: serviceId, staff_id: id }));
      }
      if (resource === "staff" && id && child === "avatar") { const person = state.staff.find(row => row.id === id); if (!person) throw new DemoError(404, "找不到示範人員。"); person.avatar_url = method === "DELETE" ? null : upload(options.body); return person; }
      if (resource === "staff" && id && child === "leaves") return method === "GET" && !childId ? state.leaves.filter(row => row.staff_id === id) : rows(state.leaves, childId, method, { ...body, staff_id: id });
      if (resource === "staff" && id && child === "schedules") return method === "GET" && !childId ? state.schedules.filter(row => row.staff_id === id) : rows(state.schedules, childId, method, { ...body, staff_id: id, staff_name: state.staff.find(row => row.id === id)?.name }, { is_available: true });
      if (resource === "staff") return rows(state.staff, id, method, body, { is_active: true, is_public_visible: true, is_bookable: true });
      if (resource === "services") return rows(state.services, id, method, body, { is_active: true, show_price: true });
      if (resource === "announcements") return rows(state.announcements, id, method, body, { is_active: true });
      if (resource === "staff-leaves") return state.leaves;
      if (resource === "schedules" && id === "batch" && method === "POST") { const created = (body.items as Record<string, unknown>[]).map(item => rows(state.schedules, undefined, "POST", item, { is_available: true })); return { created, created_count: created.length, skipped_existing: 0, skipped_leave: 0, skipped_invalid: 0 }; }
      if (resource === "schedules") {
        if (method !== "GET") return rows(state.schedules, id, method, body);
        return state.schedules.filter(row => (!url.searchParams.get("start_date") || text(row.schedule_date) >= url.searchParams.get("start_date")!) && (!url.searchParams.get("end_date") || text(row.schedule_date) <= url.searchParams.get("end_date")!));
      }
      if (resource === "patients") {
        if (id) { const person = rows(state.patients, id, method, body) as DemoRow; const list = state.appointments.filter(a => a.patient_id === id); return { ...person, stats: { total: list.length, completed: list.filter(a => a.status === "completed").length, cancelled: 0, no_show: 0, upcoming: list.filter(live).length, no_show_rate: 0, first_visit: demoDay(), last_visit: demoDay(), top_staff_name: "林醫師（示範）" }, timeline: list.map(a => ({ ...a, appointment_id: a.id, events: [] })) }; }
        const query = (url.searchParams.get("q") ?? "").trim().toLocaleLowerCase();
        const offset = Math.max(0, number(url.searchParams.get("offset")) || 0);
        const limit = Math.min(50, Math.max(1, number(url.searchParams.get("limit")) || 50));
        return state.patients.filter(person => (url.searchParams.get("include_inactive") === "true" || person.is_active) && (!query || [person.name, person.phone, person.national_id_last4].some(value => text(value).toLocaleLowerCase().includes(query))))
          .slice(offset, offset + limit).map(person => ({ ...person, appointment_count: state.appointments.filter(a => a.patient_id === person.id).length, no_show_count: state.appointments.filter(a => a.patient_id === person.id && a.status === "no_show").length, last_visit_date: demoDay() }));
      }
      if (resource === "appointments") {
        if (child) {
          if (!id || !["check-in", "queue-defer"].includes(child)) throw new DemoError(403, "此示範預約操作尚未提供。");
          if (method !== "POST") throw new DemoError(405, "報到請使用送出操作。");
          const row = state.appointments.find(row => row.id === id);
          if (!row) throw new DemoError(404, "找不到示範預約。");
          if (child === "queue-defer") {
            const deferred = body.deferred === true;
            if (row.appointment_date !== demoDay()) throw new DemoError(409, "過號與返回僅能操作今天的預約");
            if (row.status !== "checked_in" && !(deferred && row.status === "in_progress")) throw new DemoError(409, "目前狀態無法處理過號或返回，請重新讀取名單");
            if (!!row.queue_deferred === deferred) return row;
            if (row.status !== body.expected_status) throw new DemoError(409, "此客戶的服務狀態已更新，請重新讀取名單後確認");
            Object.assign(row, { queue_deferred: deferred, status: "checked_in" }); return row;
          }
          if (!["confirmed", "checked_in"].includes(text(row.status))) throw new DemoError(409, "目前狀態無法報到，請先核對預約。");
          if (row.status === "confirmed") Object.assign(row, { status: "checked_in", check_in_time: new Date().toISOString() });
          return row;
        }
        if (!id && method === "POST") return addAppointment(body, false);
        if (id) return rows(state.appointments, id, method, body);
        const start = url.searchParams.get("start_date") ?? url.searchParams.get("date") ?? "0000", end = url.searchParams.get("end_date") ?? url.searchParams.get("date") ?? "9999";
        return state.appointments.filter(a => text(a.appointment_date) >= start && text(a.appointment_date) <= end);
      }
      if (resource === "queue") {
        const date = url.searchParams.get("date") ?? (text(body.date) || demoDay());
        if (method === "POST") {
          const group = state.appointments.filter(a => a.appointment_date === date && (a.staff_id ?? null) === (body.staff_id ?? null));
          const current = group.filter(a => a.status === "in_progress");
          if (body.require_idle === true && current.length) throw new DemoError(409, "目前仍有服務中的客戶，請先完成服務並重新整理叫號台");
          const waiting = group.filter(a => a.status === "checked_in" && !a.queue_deferred).sort((a, b) => (a.queue_number == null ? Infinity : number(a.queue_number)) - (b.queue_number == null ? Infinity : number(b.queue_number)) || text(a.appointment_time).localeCompare(text(b.appointment_time)))[0];
          if (!waiting) throw new DemoError(409, "目前沒有已報到的示範客人。");
          if (body.expected_appointment_id && body.expected_appointment_id !== waiting.id) throw new DemoError(409, "候診順序已更新，請重新整理後確認下一位客戶");
          current.forEach(a => { a.status = "completed"; }); waiting.status = "in_progress";
          return { called: { id: waiting.id, queue_number: waiting.queue_number ?? null, patient_name: waiting.patient_name, appointment_time: text(waiting.appointment_time).slice(0, 5), status: waiting.status }, current_number: waiting.queue_number ?? null };
        }
        return { date, groups: state.staff.map(person => { const list = state.appointments.filter(a => a.staff_id === person.id && a.appointment_date === date); return { staff_id: person.id, staff_name: person.name, current_number: list.find(a => a.status === "in_progress")?.queue_number ?? null, waiting_count: list.filter(a => a.status === "checked_in" && !a.queue_deferred).length, appointments: list }; }) };
      }
      if (resource === "analytics") {
        const list = state.appointments, completed = list.filter(a => a.status === "completed").length;
        if (id === "visitor-count") return { visitor_count: 126, page_view_count: 248 };
        if (id === "doctor-durations") return { doctors: state.staff.map(person => ({ staff_id: person.id, staff_name: person.name, avg_consult_minutes: 30, avg_wait_minutes: 5, consult_count: completed, wait_count: completed })) };
        return { start_date: url.searchParams.get("start_date") ?? demoDay(-30), end_date: url.searchParams.get("end_date") ?? demoDay(), total: list.length, confirmed: list.filter(a => a.status === "confirmed").length, completed, cancelled: list.filter(a => a.status === "cancelled").length, no_show: 0, no_show_rate: 0, unique_patients: state.patients.length, repeat_patient_rate: 0.25, trend: [{ period: demoDay(), count: list.length }], by_method: [{ method: "online", count: list.filter(a => a.booking_method === "online").length }], by_hour: [{ hour: 10, count: list.length }] };
      }
    }
    throw new DemoError(403, "此操作不提供示範；不會連線至正式資料或發送通知。請使用目前的示範功能或重置資料。");
  }
  return { reset, snapshot: () => structuredClone(state), booking: (id: string) => { const row = state.appointments.find(a => a.id === id); return row ? booking(row) : null; }, async request(endpoint: string, options?: Options): Promise<unknown> { return structuredClone(handle(endpoint, options)); } };
}

let session: ReturnType<typeof createDemoSession> | undefined;
export function getDemoSession() { if (typeof window === "undefined") throw new Error("示範操作僅限瀏覽器分頁。"); return session ??= createDemoSession(); }
export const isDemoPath = (path: string) => path === "/demo" || path === "/demo/";

/** SSR 資料讀取器的本機相容介面，永不呼叫網路 fetch。 */
export const demoFetch: typeof fetch = async (input, init) => {
  const path = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : new URL(input.url).pathname;
  try { return Response.json(await getDemoSession().request(path, init)); }
  catch (error) { return Response.json({ detail: error instanceof Error ? error.message : "示範資料無法讀取" }, { status: error instanceof DemoError ? error.status : 500 }); }
};
