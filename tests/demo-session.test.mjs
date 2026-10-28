import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoSession, isDemoPath } from "../src/lib/demo/session.ts";
import { DEMO_ID, demoDay } from "../src/lib/demo/data.ts";

const publicBase = `/api/v1/booking/clinics/${DEMO_ID}`;
const adminBase = `/api/v1/medical-facilities/${DEMO_ID}`;
const post = body => ({ method: "POST", body: JSON.stringify(body) });

test("示範資料互相隔離；未知路徑、真實院所與外部網址全部拒絕", async () => {
  assert.equal(isDemoPath("/demo"), true); assert.equal(isDemoPath("/demo/"), true); assert.equal(isDemoPath("/demo-other"), false);
  const session = createDemoSession();
  for (const path of ["/api/v1/auth/me", "/api/v1/otp/send", "/api/v1/medical-facilities/real-clinic", "https://cross.twinhao.com/api/v1/booking/clinics"]) await assert.rejects(session.request(path, post({})), error => error.status === 403);
  await session.request(adminBase, { method: "PATCH", body: JSON.stringify({ name: "編輯後的示範名稱" }) });
  assert.equal((await createDemoSession().request(adminBase)).name, "澄光美學診所｜示範");
  session.reset(); assert.equal(session.snapshot().facility.name, "澄光美學診所｜示範");
});

test("完整示範預約與後台共用資料，重複預約阻擋，取消後恢復時段", async () => {
  const session = createDemoSession();
  const slots = await session.request(publicBase + "/slots?service_id=demo-consult&doctor_id=demo-doctor");
  const date = slots[1].date, time = slots[1].slots.find(s => s.isAvailable).time;
  const body = { clinic_id: DEMO_ID, service_id: "demo-consult", doctor_id: "demo-doctor", member_patient_id: "demo-patient-0", appointment_date: date, appointment_time: time, notes: "示範" };
  const receipt = await session.request(publicBase + "/appointments", post(body));
  assert.match(receipt.booking_number, /^DEMO-/);
  const list = await session.request(adminBase + "/appointments?date=" + date);
  assert.ok(list.some(row => row.id === receipt.id && row.patient_name === "陳小晴（示範）"));
  await assert.rejects(session.request(publicBase + "/appointments", post(body)), error => error.status === 409);
  await session.request(adminBase + "/appointments/" + receipt.id, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
  assert.ok((await session.request(publicBase + "/slots?service_id=demo-consult&doctor_id=demo-doctor")).find(day => day.date === date).slots.find(slot => slot.time === time).isAvailable);
  session.reset(); assert.equal(session.booking(receipt.id), null);
});

test("示範門面反映後台服務調整，圖片只允許分頁內的安全格式", async () => {
  const session = createDemoSession();
  await session.request(adminBase + "/services/demo-consult", { method: "PATCH", body: JSON.stringify({ service_name: "調整後示範諮詢", show_price: false }) });
  const service = (await session.request(publicBase + "/services")).find(row => row.id === "demo-consult");
  assert.equal(service.service_name, "調整後示範諮詢"); assert.equal(service.show_price, false);
  assert.equal((await session.request(adminBase + "/photos")).photos.length, 3);
  const data = new FormData(); data.append("file", new File(["<svg/>"], "unsafe.svg", { type: "image/svg+xml" }));
  await assert.rejects(session.request(adminBase + "/photos", { method: "POST", body: data }), error => error.status === 422);
  assert.ok(session.snapshot().schedules.some(row => row.schedule_date === demoDay(29)));
});
