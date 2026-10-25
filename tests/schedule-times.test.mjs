import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { schedulePresets, validSchedulePresets, timetableEntries } from '../src/lib/schedule-presets.ts';
import { CHROME, buildProblem, startPreview } from './support/built-app.mjs';
import { startHarness } from './support/component-harness.mjs';
import { setupWorkspace, facilityId, today } from './support/admin-workspace.mjs';
let browser, preview, harness;
const evidence = '/private/tmp/cross-schedule-qa-20261025';
before(async()=>{
 assert.equal(buildProblem(), null);
 preview = process.env.SCHEDULE_ORIGIN ? { origin: process.env.SCHEDULE_ORIGIN, stop() {} } : await startPreview(4414);
 harness = await startHarness('schedule-timetable', {tailwind:true});
 browser = await chromium.launch({executablePath: CHROME});
 await mkdir(evidence,{recursive:true});
});
after(async()=>{await browser?.close();preview?.stop();await harness?.close();});
test('常用時段彼此隔離且拒絕跨日及無效時間，時刻表保留同人不同班段',()=>{
 const first=schedulePresets();first.evening.start='17:30';assert.equal(schedulePresets().evening.start,'18:00');
 assert(validSchedulePresets(first));for(const start of ['25:00','21:00',''])assert(!validSchedulePresets({...first,morning:{start,end:'12:00'}}));
 const a={date:'2030-03-04',doctor_id:'a',doctor_name:'虛構',session:'morning',weekday:0,start_time:'09:00',end_time:'11:00'};
 assert.equal(timetableEntries([a,a,{...a,start_time:'11:30',end_time:'14:00'}]).length,2);
});
test('桌面與手機完整顯示連續班段、休息前後時間，不依人名錯誤去重或橫向溢出',async()=>{
 for(const width of [360,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(harness.origin);await page.getByRole('heading',{name:'門診時刻表'}).waitFor();
   for(const time of ['13:00–21:00','09:00–11:00','11:30–14:00'])assert.equal(await page.getByText(time,{exact:true}).filter({visible:true}).count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);await page.screenshot({path:`${evidence}/timetable-${width}.png`,fullPage:true});
  }finally{await page.close();}
 }
});
test('常用時段失敗保留表單，儲存後單日與批次帶入，同時可修改既有班次並呈現衝突',async()=>{
 for(const width of [390,1440]){
  const {page,state,errors}=await setupWorkspace(browser,preview.origin,{width});let presets=null,fail=false;
  await page.route('**/settings',async route=>{
   if(route.request().method()==='PATCH'){
    if(fail)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({detail:'虛構測試：暫時儲存失敗'})});
    presets=route.request().postDataJSON().schedule_presets;
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify({business_hours:{},slot_duration:30,schedule_presets:presets})});
  });
  try{
   await page.goto(`${preview.origin}/admin/clinics/${facilityId}?tab=schedule`);
   await page.getByRole('button',{name:'設定常用時段',exact:true}).click();
   await page.locator('#preset-morning-start').fill('09:30');await page.locator('#preset-morning-end').fill('12:30');
   fail=true;await page.getByRole('button',{name:'儲存常用時段',exact:true}).click();await page.getByRole('alert').getByText('虛構測試：暫時儲存失敗').waitFor();
   assert.equal(await page.locator('#preset-morning-start').inputValue(),'09:30');assert.equal(presets,null);
   fail=false;await page.getByRole('button',{name:'儲存常用時段',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(state.shifts.length,0);
   await page.getByRole('button',{name:'管理 '+today+' 排班與休假',exact:true}).click();
   await page.screenshot({path:`${evidence}/single-open-${width}.png`});
   assert.equal(await page.locator('#shift-start').inputValue(),'09:30');assert.equal(await page.locator('#shift-end').inputValue(),'12:30');
   await page.getByLabel('服務人員',{exact:true}).selectOption('staff-1');await page.getByRole('button',{name:'新增班次',exact:true}).click();
   await page.getByRole('button',{name:/編輯.*的排班/}).click();await page.locator('#shift-end').fill('11:00');
   await page.route('**/schedules/*',r=>r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({detail:'此調整會影響 1 筆既有預約，請先改期或取消後再調整班表'})}));
   await page.getByRole('button',{name:'儲存班次',exact:true}).click();await page.getByRole('alert').getByText(/影響 1 筆既有預約/).waitFor();
   assert.equal(await page.locator('#shift-end').inputValue(),'11:00');assert.equal(state.shifts[0].end_time,'12:30');
   await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
   await page.getByRole('button',{name:'智慧排班',exact:true}).click();assert.equal(await page.locator('#batch-from').inputValue(),'09:30');
   await page.locator('#batch-session').selectOption('evening');assert.equal(await page.locator('#batch-from').inputValue(),'18:00');
   await page.screenshot({path:`${evidence}/presets-batch-${width}.png`});assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
});
