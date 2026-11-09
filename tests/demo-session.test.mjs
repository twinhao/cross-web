import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoSession, isDemoPath } from "../src/lib/demo/session.ts";
import { DEMO_ID, demoDay } from "../src/lib/demo/data.ts";

const publicBase = `/api/v1/booking/clinics/${DEMO_ID}`;
const adminBase = `/api/v1/medical-facilities/${DEMO_ID}`;
const post = body => ({ method: "POST", body: JSON.stringify(body) });

test("示範後台既有客戶沿用紀錄，一般預約可建立且新客不混入他人紀錄", async () => {
  const session=createDemoSession(),count=session.snapshot().patients.length;
  const existing=await session.request(adminBase+"/appointments",post({patient_id:"demo-patient-0",staff_id:"demo-doctor",appointment_date:demoDay(1),appointment_time:"09:00"}));
  assert.equal(existing.patient_id,"demo-patient-0");assert.equal(existing.patient_name,"陳小晴（示範）");
  assert.equal(existing.duration_minutes,session.snapshot().facility.slot_duration);
  assert.equal(session.snapshot().patients.length,count);
  const guest=await session.request(adminBase+"/appointments",post({patient_name:"新虛構客戶",patient_national_id:"A123456789",service_id:"demo-consult",staff_id:"demo-doctor",appointment_date:demoDay(1),appointment_time:"10:00"}));
  assert.equal(guest.patient_name,"新虛構客戶");assert.notEqual(guest.patient_id,existing.patient_id);
  assert.equal(session.snapshot().patients.length,count+1);
});

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

test("示範報到冪等；現場叫號需先完成服務、核對下一位，舊格式保持相容", async () => {
  const session = createDemoSession();
  const path = adminBase + "/appointments/demo-appointment-0/check-in";
  const count = session.snapshot().appointments.length;
  const first = await session.request(path, post({}));
  assert.equal(first.status, "checked_in");
  assert.equal((await session.request(path, post({}))).check_in_time, first.check_in_time);
  assert.equal(session.snapshot().appointments.length, count);
  await assert.rejects(session.request(path), error => error.status === 405);
  await assert.rejects(session.request(adminBase + "/appointments/demo-appointment-0/unknown", post({})), error => error.status === 403);
  const nextBody={date:demoDay(),staff_id:"demo-doctor",require_idle:true,expected_appointment_id:"demo-appointment-0"};
  await assert.rejects(session.request(adminBase+"/queue/call-next",post(nextBody)),error=>error.status===409);
  assert.equal(session.snapshot().appointments.find(row=>row.id==="demo-appointment-2").status,"in_progress");
  await session.request(adminBase+"/appointments/demo-appointment-2",{method:"PATCH",body:JSON.stringify({status:"completed"})});
  await assert.rejects(session.request(adminBase+"/queue/call-next",post({...nextBody,expected_appointment_id:"other"})),error=>error.status===409);
  const result=await session.request(adminBase + "/queue/call-next", post(nextBody));
  assert.equal(result.called.id,"demo-appointment-0");
  const legacy=createDemoSession();await legacy.request(path,post({}));
  await legacy.request(adminBase+"/queue/call-next",post({date:demoDay(),staff_id:"demo-doctor"}));
  assert.equal(legacy.snapshot().appointments.find(row=>row.id==="demo-appointment-2").status,"completed");
  const rows = session.snapshot().appointments;
  assert.equal(rows.find(row => row.id === "demo-appointment-0").status, "in_progress");
  assert.equal(rows.find(row => row.id === "demo-appointment-2").status, "completed");
  await assert.rejects(session.request(path, post({})), error => error.status === 409);
});

test("示範常用時段可讀取儲存及重置，不改動既有班表", async () => {
  const session = createDemoSession();
  const schedules = session.snapshot().schedules;
  const settings = await session.request(adminBase + "/settings");
  settings.schedule_presets.morning.start = "09:30";
  const updated = await session.request(adminBase + "/settings", { method: "PATCH", body: JSON.stringify({ schedule_presets: settings.schedule_presets }) });
  assert.equal(updated.schedule_presets.morning.start, "09:30");
  assert.equal((await session.request(adminBase + "/settings")).schedule_presets.morning.start, "09:30");
  assert.deepEqual(session.snapshot().schedules, schedules);
  await assert.rejects(session.request(adminBase + "/settings", { method: "PATCH", body: JSON.stringify({ schedule_presets: {} }) }), error => error.status === 422);
  session.reset();
  assert.equal((await session.request(adminBase + "/settings")).schedule_presets.morning.start, "09:00");
});

test("示範客戶搜尋、停用篩選及分頁實際影響名單", async () => {
  const session = createDemoSession();
  assert.deepEqual((await session.request(adminBase + "/patients?q=" + encodeURIComponent("陳小晴"))).map(row => row.id), ["demo-patient-0"]);
  assert.equal((await session.request(adminBase + "/patients?q=0900000000")).length, 3);
  assert.deepEqual(await session.request(adminBase + "/patients?q=" + encodeURIComponent("不存在")), []);
  assert.deepEqual((await session.request(adminBase + "/patients?limit=1&offset=1")).map(row => row.id), ["demo-patient-1"]);
  await session.request(adminBase + "/patients/demo-patient-0", { method: "PATCH", body: JSON.stringify({ is_active: false }) });
  assert.equal((await session.request(adminBase + "/patients")).length, 2);
  assert.equal((await session.request(adminBase + "/patients?include_inactive=true")).length, 3);
});

test('示範過號不等於完成，跳過後返回保留原號碼且不打斷服務', async () => {
  const session=createDemoSession();
  const path=adminBase+'/appointments/demo-appointment-2/queue-defer';
  const deferred=await session.request(path,post({deferred:true,expected_status:'in_progress'}));
  assert.equal(deferred.status,'checked_in');assert.equal(deferred.queue_deferred,true);
  const number=deferred.queue_number;
  await session.request(adminBase+'/appointments/demo-appointment-0/check-in',post({}));
  const called=await session.request(adminBase+'/queue/call-next',post({date:demoDay(),staff_id:'demo-doctor',require_idle:true}));
  assert.equal(called.called.id,'demo-appointment-0');
  const returned=await session.request(path,post({deferred:false,expected_status:'checked_in'}));
  assert.equal(returned.queue_number,number);assert.equal(returned.queue_deferred,false);
  assert.equal(session.snapshot().appointments.find(a=>a.id==='demo-appointment-0').status,'in_progress');
});
