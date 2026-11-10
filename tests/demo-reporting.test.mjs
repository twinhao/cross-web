import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoSession } from "../src/lib/demo/session.ts";
import { createDemoData, DEMO_ID, demoDay } from "../src/lib/demo/data.ts";
import { demoAnalytics, demoBoard, demoDurations } from "../src/lib/demo/reporting.ts";

const admin = `/api/v1/medical-facilities/${DEMO_ID}`, publicBase = `/api/v1/booking/clinics/${DEMO_ID}`;
const post = body => ({ method: "POST", body: JSON.stringify(body) });
const patch = body => ({ method: "PATCH", body: JSON.stringify(body) });

test("示範分析遵循 7／30／90 天區間，未到與回訪隨狀態更新，未來預約不混入", async () => {
  const session = createDemoSession();
  const analytics = range => session.request(`${admin}/analytics?range=${range}`);
  const week = await analytics(7);
  assert.equal(week.total, 8); assert.equal(week.start_date, demoDay(-6));
  assert.equal(week.no_show, 1); assert.equal(week.no_show_rate, 0.2); assert.equal(week.repeat_patient_rate, 0.6667);
  assert.equal((await analytics(30)).total, 12); assert.equal((await analytics(90)).total, 16);
  await session.request(`${admin}/appointments/demo-appointment-0`, patch({ status: "no_show" }));
  const updated = await analytics(7);
  assert.equal(updated.no_show, 2); assert.equal(updated.no_show_rate, 0.3333); assert.equal(updated.confirmed, 0);
  const patient = await session.request(`${admin}/patients/demo-patient-0`);
  assert.equal(patient.stats.no_show, 2);
  assert.equal(patient.timeline.find(a => a.appointment_id === "demo-appointment-0").events.at(-1).to_status, "no_show");
  await session.request(`${admin}/appointments`, post({ patient_name: "新示範客戶", appointment_date: demoDay(1), appointment_time: "09:00", staff_id: "demo-doctor" }));
  assert.deepEqual(await analytics(7), updated);
});

test("日／週／月趨勢、來源與尖峰皆從相同範圍計算；無資料不補虛構數值", () => {
  const state = createDemoData();
  for (const granularity of ["day", "week", "month"]) {
    const report = demoAnalytics(state, new URLSearchParams({ range: "90", granularity }));
    assert.equal(report.trend.reduce((s, p) => s + p.count, 0), 16);
    assert.equal(report.by_method.reduce((s, p) => s + p.count, 0), 16);
    assert.equal(report.by_hour.reduce((s, p) => s + p.count, 0), 16);
    assert.deepEqual(new Set(report.by_method.map(m => m.method)), new Set(["online", "phone", "walk_in"]));
    if (granularity === "week") assert.ok(report.trend.every(p => new Date(`${p.period}T12:00Z`).getUTCDay() === 1));
    if (granularity === "month") assert.ok(report.trend.every(p => p.period.endsWith("-01")));
  }
  assert.equal(demoAnalytics(state, new URLSearchParams("range=0")).range_days, 30);
  state.appointments = [];
  const empty = demoAnalytics(state, new URLSearchParams());
  assert.equal(empty.total, 0); assert.equal(empty.no_show_rate, 0); assert.equal(empty.repeat_patient_rate, 0);
  assert.deepEqual(empty.trend, []); assert.deepEqual(empty.by_hour, []); assert.deepEqual(empty.by_method, []);
});

test("回訪率隨第二筆區間內預約改變，區間外紀錄與無預約客戶不計入", () => {
  const state = createDemoData(), original = state.appointments[0];
  const appointment = (id, patient, date) => ({ ...original, id, patient_id: patient, appointment_date: date });
  state.appointments = [appointment("a", "one", demoDay()), appointment("b", "two", demoDay()), appointment("old", "two", demoDay(-7))];
  assert.equal(demoAnalytics(state, new URLSearchParams("range=7")).repeat_patient_rate, 0);
  state.appointments.push(appointment("c", "one", demoDay(-6)));
  const report = demoAnalytics(state, new URLSearchParams("range=7"));
  assert.equal(report.unique_patients, 2); assert.equal(report.repeat_patient_rate, 0.5);
});

test("造訪僅計本次門面體驗，重複切換當日去重，重置清除", async () => {
  const session = createDemoSession(), endpoint = `${admin}/analytics/visitor-count?range=7`;
  assert.equal((await session.request(endpoint)).page_view_count, 0);
  await session.request(publicBase); await session.request(publicBase);
  assert.equal((await session.request(endpoint)).page_view_count, 1);
  assert.equal((await session.request(endpoint)).visitor_count, 3);
  session.reset(); assert.equal((await session.request(endpoint)).page_view_count, 0);
});

test("看診統計採末次開始、首次報到與完成，缺值／非正時長排除，超長封頂", () => {
  const state = createDemoData(), original = state.appointments[0];
  const event = (status, time) => ({ from_status: "confirmed", to_status: status, reason: null, created_at: `${demoDay()}T${time}:00+08:00` });
  const row = (id, events, extra = {}) => ({ ...original, id, events, status: "completed", ...extra });
  state.appointments = [
    row("a", [event("checked_in", "09:00"), event("in_progress", "09:10"), event("checked_in", "09:12"), event("in_progress", "10:00"), event("completed", "10:20")]),
    row("b", [event("checked_in", "09:00"), event("in_progress", "09:10"), event("completed", "09:50")]),
    row("missing", [event("completed", "09:20")]),
    row("nonpositive", [event("in_progress", "09:00"), event("completed", "09:00")]),
    row("old", [event("in_progress", "09:00"), event("completed", "10:00")], { appointment_date: demoDay(-7) }),
  ];
  const report = demoDurations(state, new URLSearchParams("range=7")).doctors[0];
  assert.equal(report.avg_consult_minutes, 30); assert.equal(report.consult_count, 2);
  assert.equal(report.avg_wait_minutes, 35); assert.equal(report.wait_count, 2);
  state.appointments = [row("long", [event("in_progress", "01:00"), event("completed", "15:00")])];
  assert.equal(demoDurations(state, new URLSearchParams()).doctors[0].avg_consult_minutes, 360);
});

test("看板與現場操作共用狀態：報到、過號、叫另一位、返回、完成與重置", async () => {
  const session = createDemoSession(), board = () => session.request(`${publicBase}/queue-board`);
  const doctor = async () => (await board()).groups.find(g => g.staff_name === "林醫師（示範）");
  const current = async () => (await doctor()).current_number;
  assert.equal(await current(), 3);
  await session.request(`${admin}/appointments/demo-appointment-0/check-in`, post({}));
  assert.equal((await doctor()).waiting_count, 1);
  const checkin = session.snapshot().appointments[0].check_in_time;
  await session.request(`${admin}/appointments/demo-appointment-0/check-in`, post({}));
  assert.equal(session.snapshot().appointments[0].events.length, 1);
  await session.request(`${admin}/appointments/demo-appointment-2/queue-defer`, post({ deferred: true, expected_status: "in_progress" }));
  assert.equal((await doctor()).appointments.length, 1); assert.equal(await current(), null);
  await session.request(`${admin}/queue/call-next`, post({ date: demoDay(), staff_id: "demo-doctor", require_idle: true, expected_appointment_id: "demo-appointment-0" }));
  assert.equal(await current(), 1); assert.equal((await doctor()).waiting_count, 0);
  const returns = `${admin}/appointments/demo-appointment-2/queue-defer`;
  await session.request(returns, post({ deferred: false, expected_status: "checked_in" }));
  assert.equal(await current(), 1); assert.equal((await doctor()).waiting_count, 1);
  assert.deepEqual((await doctor()).appointments.map(a => a.queue_number), [1, 3]);
  const returned = session.snapshot().appointments[2], events = returned.events.length;
  await session.request(returns, post({ deferred: false, expected_status: "checked_in" }));
  assert.equal(session.snapshot().appointments[2].events.length, events);
  assert.equal(session.snapshot().appointments[0].check_in_time, checkin);
  assert.match(returned.events.at(-1).reason, /已返回/);
  await session.request(`${admin}/appointments/demo-appointment-0`, patch({ status: "completed" }));
  assert.equal(await current(), 1);
  await session.request(`${admin}/queue/call-next`, post({ date: demoDay(), staff_id: "demo-doctor", require_idle: true }));
  assert.equal(await current(), 3);
  assert.equal(session.snapshot().appointments[2].events.filter(e => e.to_status === "in_progress").length, 2);
  session.reset(); assert.equal(await current(), 3); assert.equal((await doctor()).waiting_count, 0);
});

test("看板只回傳遮罩、號碼、狀態，取消／未到／過號不上板，方案停用不洩漏名單", () => {
  const state = createDemoData(), original = state.appointments[0];
  state.appointments = ["陳小晴", "林宇", "王", ""].map((name, i) => ({ ...original, id: `private-${i}`, status: "checked_in", queue_number: i + 1, patient_name: name }));
  const appointments = demoBoard(state).groups[0].appointments;
  assert.deepEqual(appointments.map(a => a.masked_name), ["陳＊晴", "林＊", "＊", "＊"]);
  assert.deepEqual(Object.keys(appointments[0]).sort(), ["masked_name", "queue_number", "status"]);
  state.appointments[0].queue_deferred = true; state.appointments[1].status = "cancelled"; state.appointments[2].status = "no_show";
  assert.equal(demoBoard(state).groups[0].waiting_count, 1);
  state.facility.subscription_plan = "standard";
  assert.equal(demoBoard(state).enabled, false); assert.deepEqual(demoBoard(state).groups, []);
  state.facility.subscription_plan = "pro"; state.facility.is_active = false;
  assert.equal(demoBoard(state).enabled, false);
});
