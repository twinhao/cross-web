import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { receptionGroup } from '../src/lib/admin/queue.ts';
import { setupWorkspace, facilityId, today } from './support/admin-workspace.mjs';
import { buildProblem, CHROME, startPreview } from './support/built-app.mjs';

let preview, browser;
const evidence = process.env.RECEPTION_EVIDENCE_DIR;
const path = (params = {}) => `/admin/clinics/${facilityId}?${new URLSearchParams({ tab: 'queue', ...params })}`;
const writes = requests => requests.filter(r => ['POST', 'PATCH', 'DELETE'].includes(r.method));
function sameStaff(state) {
  state.appointments = state.appointments.slice(0, 3).map(a => ({ ...a, staff_id: 'staff-1', staff_name: '林醫師（虛構）' }));
}
before(async () => {
  assert.equal(buildProblem(), null);
  preview = process.env.RECEPTION_ORIGIN ? { origin: process.env.RECEPTION_ORIGIN, stop() {} } : await startPreview(4387);
  browser = await chromium.launch({ executablePath: CHROME });
  if (evidence) await mkdir(evidence, { recursive: true });
});
after(async () => { await browser?.close(); preview?.stop(); });

test('接待名單依狀態分工、候診依號碼排序，不改動原始紀錄', () => {
  const appointments = [
    { id: 'later', status: 'checked_in', queue_number: 8, appointment_time: '09:00' },
    { id: 'next', status: 'checked_in', queue_number: 2, appointment_time: '10:00' },
    { id: 'unnumbered', status: 'checked_in', queue_number: null, appointment_time: '08:00' },
    { id: 'arriving', status: 'confirmed', appointment_time: '09:00' },
    { id: 'current', status: 'in_progress', appointment_time: '09:00' },
    ...['completed', 'cancelled', 'no_show'].map(status => ({ id: status, status, appointment_time: '09:00' })),
  ];
  const original = structuredClone(appointments), group = receptionGroup({ appointments });
  assert.deepEqual(group.waiting.map(a => a.id), ['next', 'later', 'unnumbered']);
  assert.deepEqual(group.arrivals.map(a => a.id), ['arriving']);
  assert.deepEqual(group.serving.map(a => a.id), ['current']);
  assert.equal(group.ended.length, 3);
  assert.deepEqual(appointments, original);
});

test('桌面與手機只有一個現場操作入口，完成目前服務後才叫下一位', async () => {
  for (const width of [1440, 390, 320]) {
    const { page, state, requests, errors } = await setupWorkspace(browser, preview.origin, { width });
    sameStaff(state);
    try {
      await page.goto(preview.origin + '/admin/dashboard');
      const entry = page.getByRole('link', { name: '前往為測試客人1報到', exact: true });
      await entry.click();
      await page.getByRole('button', { name: '為測試客人1報到', exact: true }).waitFor();
      assert.equal(writes(requests).length, 0);
      const url = new URL(page.url());
      assert.equal(url.searchParams.get('queue_date'), today);
      assert.equal(url.searchParams.get('queue_view'), 'arrivals');
      assert.equal(url.searchParams.get('queue_focus'), 'appointment-0');
      assert.equal(await page.getByRole('button', { name: '完成測試客人3的服務', exact: true }).count(), 0);
      if (evidence) await page.screenshot({ path: `${evidence}/${width}-arrivals.png`, fullPage: true });
      await page.getByRole('button', { name: '為測試客人1報到', exact: true }).click();
      await page.getByRole('status').getByText('測試客人1 已報到，請至「候診與服務」查看。', { exact: true }).waitFor();
      await page.getByRole('tab', { name: '候診與服務', exact: true }).click();
      const call = page.getByRole('button', { name: '叫測試客人1開始服務', exact: true });
      assert(await call.isDisabled());
      await page.getByRole('button', { name: '完成測試客人3的服務', exact: true }).click();
      await page.getByRole('button', { name: '返回現場接待', exact: true }).click();
      assert.equal(requests.filter(r => r.method === 'PATCH').length, 0);
      await page.getByRole('button', { name: '完成測試客人3的服務', exact: true }).click();
      await page.getByRole('button', { name: '確認完成服務', exact: true }).click();
      await page.getByRole('status').getByText('測試客人3 的服務已完成。', { exact: true }).waitFor();
      await call.click();
      await page.getByRole('status').getByText('已叫到 1 號：測試客人1，列為服務中。', { exact: true }).waitFor();
      assert.equal(state.appointments[0].status, 'in_progress');
      assert.equal(state.appointments[1].status, 'checked_in');
      assert.equal(state.appointments[2].status, 'completed');
      const request = requests.find(r => r.path.endsWith('/queue/call-next'));
      assert.equal(request.body.require_idle, true);
      assert.equal(request.body.expected_appointment_id, 'appointment-0');
      assert.equal(await page.getByRole('link', { name: '查看測試客人3的預約', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (evidence) await page.screenshot({ path: `${evidence}/${width}-service.png`, fullPage: true });
      await page.getByRole('link', { name: '查看測試客人1的預約', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.getByRole('button', { name: '補登完成', exact: true }).count(), 0);
      const handoff = page.getByRole('link', { name: '前往現場接待', exact: true });
      assert.match(await handoff.getAttribute('href'), /queue_focus=appointment-0/);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});

test('其他人開始服務時拒絕過期叫號，成功後讀取失敗也不允許重複送出', async () => {
  const { page, state, requests, errors } = await setupWorkspace(browser, preview.origin);
  sameStaff(state); state.appointments[2].status = 'completed';
  try {
    await page.goto(preview.origin + path());
    const call = page.getByRole('button', { name: '叫測試客人2開始服務', exact: true });
    await call.waitFor();
    state.appointments[2].status = 'in_progress';
    await call.click();
    await page.getByRole('alert').getByText('目前仍有服務中的客戶，請先完成服務並重新整理叫號台').waitFor();
    assert(await call.isDisabled());
    assert.equal(state.appointments[2].status, 'in_progress');
    assert.equal(state.appointments[1].status, 'checked_in');
    if (evidence) await page.screenshot({ path: `${evidence}/stale-board.png`, fullPage: true });
    state.appointments[2].status = 'completed';
    await page.getByRole('button', { name: '重新讀取名單', exact: true }).click();
    await call.waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('button[aria-label="叫測試客人2開始服務"]')?.disabled);
    state.failQueue = true;
    await call.click();
    await page.getByRole('status').getByText('已叫到 2 號：測試客人2，列為服務中。', { exact: true }).waitFor();
    await page.getByRole('alert').getByText('測試：接待名單暫時無法載入').waitFor();
    assert(await call.isDisabled());
    assert.equal(requests.filter(r => r.path.endsWith('/queue/call-next')).length, 2);
    state.failQueue = false;
    await page.getByRole('button', { name: '重新讀取名單', exact: true }).click();
    await page.getByRole('button', { name: '完成測試客人2的服務', exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('查詢其他日期唯讀，員工不能操作現場接待，歷史紀錄可補登完成', async () => {
  const { page, state, requests } = await setupWorkspace(browser, preview.origin);
  sameStaff(state); state.appointments.forEach(a => { a.appointment_date = '2026-10-22'; });
  try {
    await page.goto(preview.origin + path({ queue_date: '2026-10-22', queue_view: 'arrivals' }));
    await page.getByText('目前為日期查詢，現場操作請回到今天。已結束紀錄可從「預約與紀錄」查看。', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: '為測試客人1報到', exact: true }).isDisabled());
    await page.getByRole('link', { name: '預約與紀錄', exact: true }).click();
    await page.getByRole('button', { name: '測試客人1', exact: true }).click();
    await page.getByRole('button', { name: '補登完成', exact: true }).waitFor();
    assert.equal(writes(requests).length, 0);
  } finally { await page.close(); }
  const employee = await setupWorkspace(browser, preview.origin, { role: 'facility_staff' });
  try {
    await employee.page.goto(preview.origin + path());
    await employee.page.getByText('叫號與報到需由櫃檯人員或院所管理員操作；目前帳號可從預約管理查看服務狀態。', { exact: true }).waitFor();
    assert.equal(employee.requests.filter(r => r.path.endsWith('/queue')).length, 0);
    assert.equal(writes(employee.requests).length, 0);
  } finally { await employee.page.close(); }
});

test('過號可先服務其他人，隔幾位返回仍保留號碼且不打斷目前服務', async () => {
  for (const width of [1440, 390, 320]) {
    const { page, state, requests, errors } = await setupWorkspace(browser, preview.origin, { width });
    sameStaff(state);
    state.appointments.forEach((a, i) => { a.status = i === 0 ? 'in_progress' : 'checked_in'; });
    try {
      await page.goto(preview.origin + path());
      await page.getByRole('button', { name: '將測試客人1標記過號', exact: true }).click();
      await page.getByRole('button', { name: '返回現場接待', exact: true }).click();
      assert.equal(writes(requests).length, 0);
      await page.getByRole('button', { name: '將測試客人1標記過號', exact: true }).click();
      await page.getByRole('button', { name: '確認過號', exact: true }).click();
      await page.getByRole('status').getByText('測試客人1 已過號，保留原號碼並暫停候診。', { exact: true }).waitFor();
      assert.equal(state.appointments[0].status, 'checked_in');
      assert.equal(state.appointments[0].queue_deferred, true);
      assert.equal(state.appointments[0].queue_number, 1);
      await page.getByRole('button', { name: '叫測試客人2開始服務', exact: true }).click();
      await page.getByRole('button', { name: '完成測試客人2的服務', exact: true }).click();
      await page.getByRole('button', { name: '確認完成服務', exact: true }).click();
      await page.getByRole('status').getByText('測試客人2 的服務已完成。', { exact: true }).waitFor();
      await page.getByRole('button', { name: '叫測試客人3開始服務', exact: true }).click();
      await page.getByRole('button', { name: '確認測試客人1已返回', exact: true }).click();
      await page.getByRole('status').getByText('測試客人1 已返回候診，保留原號碼；目前服務不受影響。', { exact: true }).waitFor();
      assert.equal(state.appointments[2].status, 'in_progress');
      assert.equal(state.appointments[0].queue_number, 1);
      const next = page.getByRole('button', { name: '叫測試客人1開始服務', exact: true });
      assert(await next.isDisabled());
      assert.equal(await page.getByRole('button', { name: '確認測試客人1已返回', exact: true }).count(), 0);
      if (evidence) await page.screenshot({ path: `${evidence}/${width}-returned.png`, fullPage: true });
      await page.getByRole('button', { name: '完成測試客人3的服務', exact: true }).click();
      await page.getByRole('button', { name: '確認完成服務', exact: true }).click();
      await page.getByRole('status').getByText('測試客人3 的服務已完成。', { exact: true }).waitFor();
      await next.click();
      await page.getByRole('status').getByText('已叫到 1 號：測試客人1，列為服務中。', { exact: true }).waitFor();
      assert.equal(requests.filter(r => r.path.endsWith('/queue-defer')).length, 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});

test('過號遇到其他人更新時保留名單，重新讀取後才可操作', async () => {
  const { page, state, requests } = await setupWorkspace(browser, preview.origin);
  sameStaff(state);
  try {
    await page.goto(preview.origin + path());
    await page.getByRole('button', { name: '將測試客人2標記過號', exact: true }).click();
    state.appointments[1].status = 'in_progress';
    await page.getByRole('button', { name: '確認過號', exact: true }).click();
    await page.getByRole('dialog').getByRole('alert').getByText('此客戶的服務狀態已更新，請重新讀取名單後確認').waitFor();
    assert(await page.getByRole('button', { name: '確認過號', exact: true }).isDisabled());
    assert.equal(state.appointments[1].queue_deferred, undefined);
    await page.getByRole('dialog').getByRole('button', { name: '重新讀取名單', exact: true }).click();
    await page.getByRole('button', { name: '完成測試客人2的服務', exact: true }).waitFor();
    assert.equal(requests.filter(r => r.path.endsWith('/queue-defer')).length, 1);
  } finally { await page.close(); }
});
