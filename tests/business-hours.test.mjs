import assert from "node:assert/strict";
import test from "node:test";
import { openingPeriods, formatBusinessHours, taipeiWeekday } from "../src/lib/business-hours.ts";
import { transformClinic } from "../src/lib/api/clinics.ts";
const day = { day: "週一", open: "09:00", close: "18:00", is_closed: false };

test("營業時間保留午休，列表轉換與公開顯示一致", () => {
  const breaks = [{ start: "12:00", end: "13:30" }];
  const clinic = transformClinic({ id: "hours-fixture", name: "虛構院所", phone: null, address: null, business_hours: { monday: { open: day.open, close: day.close, breaks } } });
  assert.deepEqual(clinic.business_hours[0].breaks, breaks);
  assert.notEqual(clinic.business_hours[0].breaks, breaks);
  assert.equal(formatBusinessHours(clinic.business_hours[0]), "09:00–12:00、13:30–18:00");
});

test("重疊、相鄰與無序的休息時段合併扣除，不產生重複或零長度營業", () => {
  assert.deepEqual(openingPeriods({ ...day, breaks: [{ start: "13:00", end: "14:00" }, { start: "12:00", end: "13:30" }, { start: "14:00", end: "15:00" }] }), [{ start: "09:00", end: "12:00" }, { start: "15:00", end: "18:00" }]);
});

test("超出營業時間的休息區間裁切，無效與倒序區間不影響其他合法時段", () => {
  assert.deepEqual(openingPeriods({ ...day, breaks: [{ start: "08:00", end: "10:00" }, { start: "17:00", end: "20:00" }, { start: "10:30", end: "10:00" }, { start: "bad", end: "11:00" }] }), [{ start: "10:00", end: "17:00" }]);
});

test("休息涵蓋全日與明確休診顯示休息；正常、午夜與跨日區間保留", () => {
  assert.equal(formatBusinessHours({ ...day, breaks: [{ start: "08:00", end: "20:00" }] }), "休息");
  assert.equal(formatBusinessHours({ ...day, is_closed: true }), "休息");
  assert.equal(formatBusinessHours(day), "09:00–18:00");
  assert.equal(formatBusinessHours({ ...day, open: "18:00", close: "24:00" }), "18:00–24:00");
  assert.equal(formatBusinessHours({ ...day, open: "22:00", close: "02:00" }), "22:00–02:00");
});

test("臺北跨日星期一致，不受 SSR 主機或使用者的當地時區影響", () => {
  assert.equal(taipeiWeekday(new Date("2026-10-25T15:59:59Z")), "週日");
  assert.equal(taipeiWeekday(new Date("2026-10-25T16:00:00Z")), "週一");
});
