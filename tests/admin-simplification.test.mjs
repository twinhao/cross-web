import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startPreview,buildProblem,CHROME} from './support/built-app.mjs';
import {setupWorkspace,facilityId} from './support/admin-workspace.mjs';
import {setupComplete} from './support/admin-complete.mjs';
let browser,preview;
const evidence=process.env.ADMIN_SIMPLIFICATION_EVIDENCE_DIR ?? '/private/tmp/cross-admin-first-batch-20261107';
const path=tab=>`/admin/clinics/${facilityId}?tab=${tab}`;
before(async()=>{assert.equal(buildProblem(),null);preview=process.env.ADMIN_SIMPLIFICATION_ORIGIN?{origin:process.env.ADMIN_SIMPLIFICATION_ORIGIN,stop(){}}:await startPreview(4497);browser=await chromium.launch({executablePath:CHROME});await mkdir(evidence,{recursive:true});});
after(async()=>{await browser?.close();preview?.stop();});

test('今日固定當日清單，精簡上線提示不擋住首筆客戶，狀態可直接篩選',async()=>{
 for(const width of [390,1440]){const {page,errors,requests}=await setupWorkspace(browser,preview.origin,{width});try{
  if(width===390)await page.setViewportSize({width,height:844});
  await page.goto(preview.origin+'/admin/dashboard?start=2026-12-15&end=2026-12-21&view=week');
  const first=page.getByRole('button',{name:'測試客人1',exact:true}).filter({visible:true});await first.waitFor();
  assert.equal(await page.getByRole('tablist',{name:'預約檢視方式',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'未來七天',exact:true}).count(),0);
  const reads=requests.filter(r=>r.method==='GET'&&r.path.endsWith('/appointments'));
  assert(reads.length>0);
  const readiness=page.getByRole('region',{name:'院所上線準備',exact:true});
  assert.equal(await readiness.locator('details').count(),0);
  assert((await readiness.boundingBox()).height<130);
  const box=await first.boundingBox();assert(box.y+box.height<844-68,JSON.stringify({width,box}));
  await page.screenshot({path:`${evidence}/today-${width}.png`,animations:'disabled'});
  await page.getByRole('button',{name:/待報到/}).click();await page.waitForURL(u=>u.searchParams.get('status')==='confirmed');
  assert.equal(await page.getByRole('button',{name:'測試客人2',exact:true}).filter({visible:true}).count(),0);
  await page.getByRole('link',{name:'完整預約管理',exact:true}).click();
  await page.getByRole('button',{name:'未來七天',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{await page.close();}}
});

test('十二月預約到排班及返回接續日期、人員與狀態',async()=>{
 const {page,errors}=await setupWorkspace(browser,preview.origin);try{
  await page.goto(preview.origin+path('appointments')+'&start=2026-12-15&end=2026-12-15&staff=staff-2&status=confirmed');
  const nav=page.getByRole('navigation',{name:'後台主要導覽',exact:true});
  await nav.getByRole('link',{name:'排班管理',exact:true}).click();
  await page.getByRole('heading',{name:'2026 年 12 月',exact:true}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:'篩選人員',exact:true}).inputValue(),'staff-2');
  await page.reload();await page.getByRole('heading',{name:'2026 年 12 月',exact:true}).waitFor();
  await nav.getByRole('link',{name:'預約管理',exact:true}).click();await page.getByRole('heading',{name:'預約管理',exact:true}).waitFor();
  const url=new URL(page.url());for(const [k,v] of [['start','2026-12-15'],['staff','staff-2'],['status','confirmed']])assert.equal(url.searchParams.get(k),v);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('人員日曆包含沒有預約的人員，全空日期也保留欄位；名單失敗可重試',async()=>{
 const {page,state,errors}=await setupWorkspace(browser,preview.origin);state.appointments=state.appointments.filter(a=>a.staff_id==='staff-1');let failRoster=true;
 await page.route('**/api/v1/medical-facilities/*/staff',r=>failRoster?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'虛構：人員暫時無法載入'})}):r.fallback());
 try{await page.goto(preview.origin+path('appointments')+'&view=day');await page.getByRole('alert').getByText('虛構：人員暫時無法載入').waitFor();failRoster=false;await page.getByRole('button',{name:'重試人員名單',exact:true}).click();
  const calendar=page.getByLabel('依人員排列的當日時間表',{exact:true});
  await calendar.getByRole('heading',{name:/陳治療師（虛構）/}).waitFor();
  assert.equal(await page.getByLabel('服務人員',{exact:true}).locator('option[value="staff-2"]').count(),1);
  await page.getByLabel('服務人員',{exact:true}).selectOption('staff-2');
  await calendar.getByRole('heading',{name:/陳治療師（虛構）/}).waitFor();await calendar.getByText('無預約',{exact:true}).waitFor();
  await page.getByLabel('日期',{exact:true}).fill('2026-12-15');await calendar.getByRole('heading',{name:/陳治療師（虛構）/}).waitFor();
  await page.screenshot({path:`${evidence}/calendar-no-appointments.png`,animations:'disabled'});assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('一般院所員工保留查詢，不能開啟管理表單或發出受限的叫號與公告請求',async()=>{
 for(const width of [390,1440]){const {page,errors,requests}=await setupComplete(browser,preview.origin,{role:'facility_staff',width,free:true});try{
  for(const tab of ['personnel','services','info','schedule','appointments','patients','subscription','announcements','queue']){
   await page.goto(preview.origin+path(tab));await page.locator('.cross-admin h1').waitFor();
   await page.waitForLoadState('networkidle');
   for(const name of ['新增人員','編輯服務','新增服務','編輯資訊','環境相簿','批次排班','設定常用時段','＋ 新增預約','啟用 90 天試用'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0,`${tab}: ${name}`);
   if(tab==='patients'){assert.equal(await page.getByRole('button',{name:/再次預約/}).count(),0);await page.getByRole('button',{name:/的客戶檔案/}).filter({visible:true}).first().click();await page.getByRole('dialog').getByText('目前為唯讀，修改客戶檔案請洽院所管理員。',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'儲存客戶檔案',exact:true}).count(),0);await page.keyboard.press('Escape');}
  }
  assert.equal(requests.filter(r=>r.path.endsWith('/queue')||r.path.endsWith('/announcements')||r.method!=='GET').length,0);
  await page.screenshot({path:`${evidence}/staff-${width}.png`,animations:'disabled'});assert.deepEqual(errors,[]);
 }finally{await page.close();}}
});
