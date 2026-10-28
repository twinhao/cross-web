import { DEMO_CLINIC_ID } from "../clinic-discovery.ts";
import type { MedicalFacility } from "../types/clinic.ts";
import type { User } from "../types/auth.ts";

export const DEMO_ID = DEMO_CLINIC_ID;
export type DemoRow = { id: string; [key: string]: unknown };
export const imageCredits = [
  { id: "17640379", caption: "暖白接待與休憩空間（素材示意）", author: "Rasul Abdurahimov", page: "https://www.pexels.com/photo/white-couch-and-sofas-in-room-17640379/" },
  { id: "17640381", caption: "自然採光與綠意等候區（素材示意）", author: "Rasul Abdurahimov", page: "https://www.pexels.com/photo/waiting-room-in-spa-17640381/" },
  { id: "11774389", caption: "暖色獨立療程空間（素材示意）", author: "Tugce Erten Barrett", page: "https://www.pexels.com/photo/interior-design-of-a-massage-room-11774389/" },
];
export function demoDay(offset = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86400000));
}
export function createDemoData() {
  const created = new Date().toISOString();
  const facility: MedicalFacility = {
    id: DEMO_ID, name: "澄光美學診所｜示範", phone: null, address: "臺北市信義區（虛構地點，請勿前往）",
    description: "把時間留給自己，從一次好好聊聊開始。\n澄光是 Cross 的虛構示範診所，展示諮詢、療程預約與團隊協作。您可以瀏覽服務、挑選時間，或切換到院所後台，親自體驗每天的工作流程。\n空間照片為授權素材；醫師照片為 AI 生成的虛構人像，均非實際院所或醫師。團隊、服務、費用與預約均為示範資料，不提供醫療服務。",
    latitude: null, longitude: null, logo_url: "/demo/logo.svg", service_categories: ["aes_laser", "aes_skin"],
    payment_type: "self_pay", facility_type: "aesthetic",
    business_hours: Object.fromEntries(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => [day, { open: "09:00", close: "18:00", breaks: [{ start: "12:00", end: "13:00" }] }])),
    slot_duration: 30, is_active: true, phone_booking_enabled: false, show_schedule: true,
    subscription_plan: "pro", subscription_status: "active", subscription_started_at: created,
    subscription_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), billing_cycle: "monthly",
    subscription_notes: "展示專業版功能，不會收費。", trial_used_at: created, is_featured: false, featured_until: null,
    created_at: created, updated_at: null,
  };
  const staff: DemoRow[] = [
    { id: "demo-doctor", name: "林醫師（示範）", role: "doctor", department: "皮膚諮詢", main_specialties: ["初次諮詢", "肌膚評估"], education: ["虛構學經歷，僅供版面展示"], experience: ["照片為 AI 生成的虛構人像，非真實醫師", "示範專業介紹，不代表真實執業資格"] },
    { id: "demo-therapist", name: "陳諮詢師（示範）", role: "therapist", department: "療程諮詢", main_specialties: ["療程流程說明", "預約安排"], education: [], experience: ["虛構團隊成員，僅供功能展示"] },
  ].map(row => ({ ...row, facility_id: DEMO_ID, is_active: true, is_public_visible: true, is_bookable: true, avatar_url: row.id === "demo-doctor" ? "/demo/doctor-fictional-v1.jpg" : null, created_at: created, updated_at: null }));
  const services: DemoRow[] = [
    { id: "demo-consult", service_name: "初次肌膚諮詢", description: "認識需求、說明諮詢流程與後續安排。這是示範服務，不提供診斷或醫療建議。", duration_minutes: 30, price: 500, show_price: true },
    { id: "demo-treatment", service_name: "光療療程諮詢", description: "展示需預留較長時間的療程安排，並示範不對外公開價格。實際內容及費用須由真實院所另行確認。", duration_minutes: 60, price: 3000, show_price: false },
    { id: "demo-followup", service_name: "保養追蹤諮詢", description: "體驗回訪客人的短時段預約與指定服務人員。僅供功能展示。", duration_minutes: 30, price: 800, show_price: true },
  ].map(row => ({ ...row, facility_id: DEMO_ID, is_active: true, created_at: created, updated_at: null }));
  const schedules: DemoRow[] = [];
  for (let day = 0; day < 30; day++) for (const person of staff) for (const [start, end, session] of [["09:00", "12:00", "morning"], ["13:00", "18:00", "afternoon"]]) {
    schedules.push({ id: `shift-${day}-${person.id}-${session}`, staff_id: person.id, staff_name: person.name, facility_id: DEMO_ID, schedule_date: demoDay(day), session, start_time: start, end_time: end, max_patients: 1, is_available: true });
  }
  const patients: DemoRow[] = ["陳小晴", "林小宇", "王小安"].map((name, i) => ({ id: `demo-patient-${i}`, name: `${name}（示範）`, phone: "0900000000", gender: i === 1 ? "M" : "F", birth_date: "1995-01-01", national_id_last4: "0000", is_active: true, address: "虛構地址", medical_history: "示範資料", allergy_info: "示範資料", emergency_contact: "示範聯絡人", member_linked: false, preferred_staff_id: null, preferred_staff_name: null, created_at: created }));
  const appointments: DemoRow[] = ["confirmed", "checked_in", "in_progress", "completed"].map((status, i) => ({
    id: `demo-appointment-${i}`, facility_id: DEMO_ID, patient_id: patients[i % 3].id, patient_name: patients[i % 3].name, patient_phone: "0900000000", patient_gender: "female", service_id: services[i % 3].id, service_name: services[i % 3].service_name,
    staff_id: staff[i % 2].id, staff_name: staff[i % 2].name, appointment_date: demoDay(), appointment_time: `${["10", "13", "14", "16"][i]}:00:00`, duration_minutes: services[i % 3].duration_minutes,
    status, booking_method: "online", queue_number: i + 1, notes: "虛構示範預約", check_in_time: status === "checked_in" ? created : null, created_at: created, updated_at: null,
  }));
  return { facility, staff, services, schedules, patients, appointments,
    assignments: Object.fromEntries(staff.map(person => [person.id, services.map(service => service.id)])),
    leaves: [] as DemoRow[],
    photos: imageCredits.map(photo => ({ id: `photo-${photo.id}`, url: `/demo/interior-${photo.id}.jpg`, caption: photo.caption })), galleryRevision: 1,
    announcements: [{ id: "demo-welcome", title: "歡迎體驗完整預約流程", content: "這是虛構示範院所。您可完成示範預約，再切換至後台查看與操作；重新整理頁面即可重置，任何操作都不會發送通知。", is_active: true, created_at: created, updated_at: null }] as DemoRow[],
    favorites: [] as string[],
  };
}
export type DemoData = ReturnType<typeof createDemoData>;
export function demoUser(facility: MedicalFacility, admin = true): User {
  return { id: "demo-user", email: "demo@example.invalid", is_active: true, phone_number: null, facility_id: admin ? DEMO_ID : null, roles: admin ? ["facility_admin"] : [], facility: admin ? facility : null, display_name: admin ? "示範管理員" : "陳小晴（示範）", last_booked_member_patient_id: "demo-patient-0", created_at: facility.created_at, updated_at: null };
}
