import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceParams} from '../src/lib/admin/navigation.ts';
import {canManageFacility} from '../src/lib/auth/roles.ts';

test('預約切排班帶入月份與人員，返回保留日期與狀態，不帶入編輯視窗', () => {
  const original = new URLSearchParams('start=2026-12-15&end=2026-12-18&staff=doctor-a&status=confirmed&new=1&appointment=private-id');
  const schedule = workspaceParams(original, 'appointments', 'schedule', '2026-11-07');
  assert.equal(schedule.get('month'), '2026-12');
  assert.equal(schedule.get('schedule_staff'), 'doctor-a');
  assert.equal(schedule.has('new'), false);
  assert.equal(schedule.has('appointment'), false);
  const back = workspaceParams(schedule, 'schedule', 'appointments', '2026-11-07');
  for (const key of ['start','end','staff','status']) assert.equal(back.get(key), original.get(key));
  assert.equal(original.get('new'), '1');
});

test('排班換月份與人員後，預約日期跟著切換，今日與叫號不誤用舊日期', () => {
  const params = new URLSearchParams('start=2026-12-15&end=2026-12-15&month=2027-02&schedule_staff=doctor-b&staff=doctor-a&view=week');
  const next = workspaceParams(params, 'schedule', 'appointments', '2026-11-07');
  assert.equal(next.get('start'),'2027-02-01');
  assert.equal(next.get('end'),'2027-02-07');
  assert.equal(next.get('staff'),'doctor-b');
  const today = workspaceParams(params, 'today', 'schedule', '2026-11-07');
  assert.equal(today.get('month'),'2026-11');
  assert.equal(workspaceParams(params, 'today', 'queue', '2026-11-07').get('queue_date'),'2026-11-07');
});

test('院所管理按鈕只對所屬管理員與未綁定院所的平台管理員開放', () => {
  assert.equal(canManageFacility(null,'a'),false);
  for (const role of ['patient','facility_staff']) assert.equal(canManageFacility({roles:[role],facility_id:'a'},'a'),false);
  assert.equal(canManageFacility({roles:['facility_admin'],facility_id:'a'},'a'),true);
  assert.equal(canManageFacility({roles:['facility_admin'],facility_id:'a'},'b'),false);
  for (const role of ['admin','superadmin']) {
    assert.equal(canManageFacility({roles:[role],facility_id:null},'a'),true);
    assert.equal(canManageFacility({roles:[role],facility_id:'a'},'a'),false);
  }
});
