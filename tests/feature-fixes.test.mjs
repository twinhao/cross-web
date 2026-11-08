import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {canOperateFacility,canManageFacility,requiresFacility} from '../src/lib/auth/roles.ts';
import {startPreview,CHROME,buildProblem} from './support/built-app.mjs';
import {setupWorkspace,facilityId} from './support/admin-workspace.mjs';
const evidence=process.env.FEATURE_FIX_EVIDENCE_DIR ?? '/private/tmp/cross-feature-fixes-20261108';
const path=tab=>`/admin/clinics/${facilityId}?tab=${tab}`;
let browser,preview;
before(async()=>{
 assert.equal(buildProblem(),null);
 preview=process.env.FEATURE_FIX_ORIGIN?{origin:process.env.FEATURE_FIX_ORIGIN,stop(){}}:await startPreview(4515);
 browser=await chromium.launch({executablePath:CHROME});await mkdir(evidence,{recursive:true});
});
after(async()=>{await browser?.close();preview?.stop();});

test('櫃檯角色限同院所日常操作，管理設定與既有唯讀角色維持分離',()=>{
 const account={roles:['facility_receptionist'],facility_id:facilityId};
 assert.equal(canOperateFacility(account,facilityId),true);
 assert.equal(canOperateFacility(account,'other'),false);
 assert.equal(canManageFacility(account,facilityId),false);
 assert.equal(requiresFacility('facility_receptionist'),true);
 assert.equal(canOperateFacility({...account,facility_id:null},facilityId),false);
 assert.equal(canOperateFacility({...account,roles:['facility_staff']},facilityId),false);
});

test('桌面與手機的櫃檯可代訂、報到、叫號；服務、資料及帳務設定保持唯讀',async()=>{
 for(const width of [390,1440]){
  const {page,errors}=await setupWorkspace(browser,preview.origin,{role:'facility_receptionist',width});
  try{
   await page.goto(preview.origin+'/admin/dashboard');await page.getByRole('button',{name:'＋ 新增預約',exact:true}).waitFor();
   await page.getByRole('button',{name:'為測試客人1報到',exact:true}).filter({visible:true}).waitFor();
   await page.goto(preview.origin+path('queue'));await page.getByRole('heading',{name:'叫號與報到',exact:true}).waitFor();
   assert.equal(await page.getByText(/目前帳號可從預約管理查看服務狀態/).count(),0);
   await page.getByRole('button',{name:'叫下一號',exact:true}).first().waitFor();
   for(const tab of ['info','services','personnel','subscription']){
    await page.goto(preview.origin+path(tab));await page.locator('.cross-admin h1').waitFor();
    for(const name of ['編輯資訊','新增服務','新增人員','啟用 90 天試用','編輯訂閱'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
   }
   await page.screenshot({path:`${evidence}/receptionist-${width}.png`,animations:'disabled'});
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
});

test('既有客戶以 ID 再次預約，免輸入證號且送出不夾帶身分資料',async()=>{
 const {page,requests,errors}=await setupWorkspace(browser,preview.origin,{role:'facility_receptionist',width:390});
 try{
  await page.goto(preview.origin+path('patients'));
  await page.getByRole('button',{name:'為既有客戶（虛構）再次預約',exact:true}).filter({visible:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByText('本次沿用此客戶紀錄，免再輸入完整證號。',{exact:true}).waitFor();
  assert.equal(await dialog.getByLabel('身分證字號 *',{exact:true}).count(),0);
  await dialog.getByLabel('服務人員 *',{exact:true}).selectOption('staff-1');
  await dialog.getByLabel('預約日期 *',{exact:true}).fill('2026-10-24');
  await dialog.getByRole('button',{name:'09:00',exact:true}).click();
  await dialog.screenshot({path:`${evidence}/repeat-customer.png`,animations:'disabled'});
  await dialog.getByRole('button',{name:'建立預約',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  const body=requests.find(r=>r.method==='POST'&&r.path.endsWith('/appointments')).body;
  assert.equal(body.patient_id,'patient-1');
  for(const key of ['patient_name','patient_national_id','patient_phone','patient_gender'])assert.equal(key in body,false);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('更換既有客戶後回到新客識別，空白資料不能送出',async()=>{
 const {page,errors}=await setupWorkspace(browser,preview.origin);
 try{
  await page.goto(preview.origin+path('patients'));
  await page.getByRole('button',{name:'為既有客戶（虛構）再次預約',exact:true}).filter({visible:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'更換客戶',exact:true}).click();
  assert.equal(await dialog.getByLabel('身分證字號 *',{exact:true}).inputValue(),'');
  assert.equal(await dialog.getByLabel('客戶姓名 *',{exact:true}).inputValue(),'');
  assert(await dialog.getByRole('button',{name:'建立預約',exact:true}).isDisabled());
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('分享與排班名稱符合內容，手機使用當日及七日清單名稱',async()=>{
 const {page,errors}=await setupWorkspace(browser,preview.origin,{width:390});
 try{
  await page.goto(preview.origin+path('appointments'));
  await page.getByRole('button',{name:'分享院所頁',exact:true}).click();
  await page.getByRole('dialog').getByRole('heading',{name:'分享院所頁',exact:true}).waitFor();await page.keyboard.press('Escape');
  await page.getByRole('tab',{name:'當日清單',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('view')==='day');
  await page.getByText('手機以當日時間清單顯示，方便逐筆操作。',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'七日清單',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('view')==='week');
  await page.getByText('手機以七日時間清單顯示，方便逐筆操作。',{exact:true}).waitFor();
  await page.goto(preview.origin+path('schedule'));await page.getByRole('button',{name:'批次排班',exact:true}).click();
  await page.getByRole('dialog').getByRole('heading',{name:'批次排班',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('方案與訂閱僅承諾可操作功能，清楚列出 App 提醒條件及人員設定接續',async()=>{
 const {page,errors}=await setupWorkspace(browser,preview.origin);
 try{
  await page.goto(preview.origin+'/pricing');await page.getByRole('heading',{level:1}).waitFor();
  assert.equal((await page.locator('main').innerText()).includes('未到風險提示'),false);
  await page.getByRole('button',{name:'客人需要下載 App 才能預約或收到提醒嗎？',exact:true}).click();
  await page.getByText(/目前不包含 Email、簡訊或瀏覽器推播/).waitFor();
  await page.goto(preview.origin+path('subscription'));await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).waitFor();
  assert.equal((await page.locator('main').innerText()).includes('No-show 風險'),false);
  await page.getByText(/App 預約提醒需會員對象綁定/).waitFor();
  await page.goto(preview.origin+path('services'));await page.getByRole('link',{name:'人員服務對應',exact:true}).click();
  await page.getByRole('heading',{name:'人員列表',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
