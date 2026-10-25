import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startPreview,buildProblem,CHROME} from './support/built-app.mjs';
import {bookingFixture,chooseService,chooseTime,bookingPath,clinicId,date} from './support/booking-redesign.mjs';
let browser,preview;
const dir=process.env.BOOKING_REDESIGN_EVIDENCE_DIR??'/private/tmp/cross-booking-redesign-qa-20261025';
before(async()=>{assert.equal(buildProblem(),null);preview=process.env.BOOKING_REDESIGN_ORIGIN?{origin:process.env.BOOKING_REDESIGN_ORIGIN,stop(){}}:await startPreview(4421);browser=await chromium.launch({executablePath:CHROME});await mkdir(dir,{recursive:true});});
after(async()=>{await browser?.close();preview?.stop();});
async function fits(page){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const summary=page.getByRole('complementary',{name:'預約摘要',exact:true});
 if(await summary.isVisible()){const a=await summary.boundingBox(),p=await page.getByRole('navigation',{name:'預約進度',exact:true}).boundingBox();assert(a.y>=p.y+p.height,'摘要不能被固定進度列遮住');}
}

test('服務、人員與日曆在手機與桌面亮暗色易讀，摘要尊重隱藏價格並可返回修改',async()=>{
 for(const width of [320,390,768,1440])for(const dark of [false,true]){
  const {page,errors,state}=await bookingFixture(browser,preview.origin,{width,dark});
  try{
   await chooseService(page,preview.origin);await fits(page);
   assert(await page.getByRole('button',{name:'確認預約資料',exact:true}).isDisabled());
   await page.getByRole('button',{name:/虛構醫師.*皮膚專科/}).click();
   await chooseTime(page);await page.getByText('虛構預約人',{exact:true}).waitFor();
   await fits(page);assert.doesNotMatch(await page.locator('body').innerText(),/服務費用|NT\$|免費|健保給付/);
   assert.equal(await page.getByRole('button',{name:'確認送出預約',exact:true}).isDisabled(),true);
   await page.screenshot({path:`${dir}/review-${width}-${dark?'dark':'light'}.png`,fullPage:false});
   await page.getByRole('button',{name:'返回',exact:true}).click();
   await page.getByRole('button',{name:'09:00',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'09:00',exact:true}).getAttribute('aria-pressed'),'true');
   await page.getByRole('button',{name:'確認預約資料',exact:true}).waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('確認預約資料')&&!b.disabled));await page.screenshot({path:`${dir}/time-${width}-${dark?'dark':'light'}.png`,fullPage:false});
   assert.equal(state.posts.length,0);assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
});

test('訪客先選時間再登入，僅暫存選擇；登入後回到確認頁並重新驗證已額滿時段',async()=>{
 const {page,state}=await bookingFixture(browser,preview.origin,{authenticated:false,width:390});
 try{
  await chooseService(page,preview.origin);await chooseTime(page);
  await page.getByRole('button',{name:'登入並繼續預約',exact:true}).click();await page.waitForURL('**/auth?next=**');
  // 暫存不含姓名、電話等個資。
  const saved=await page.evaluate(()=>Object.values(sessionStorage).join(' '));assert.match(saved,/laser/);assert.doesNotMatch(saved,/虛構預約人|0900000000/);
  state.closed=true;await page.evaluate(()=>localStorage.setItem('access_token','booking-fixture'));await page.goto(preview.origin+bookingPath);
  await page.getByRole('heading',{name:'確認預約資料',exact:true}).waitFor();
  await page.getByText('無法確認這個時段的剩餘名額，請返回重新選擇。',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:'確認送出預約',exact:true}).isDisabled());assert.equal(state.posts.length,0);
 }finally{await page.close();}
});

test('載入時段與預約對象失敗可重試，不能把失敗當空資料或送出預約',async()=>{
 const {page,state}=await bookingFixture(browser,preview.origin,{width:390});state.failSlots=true;
 try{
  await chooseService(page,preview.origin);await page.getByRole('button',{name:'重新載入',exact:true}).waitFor();assert(await page.getByRole('button',{name:'確認預約資料',exact:true}).isDisabled());
  state.failSlots=false;await page.getByRole('button',{name:'重新載入',exact:true}).click();state.failPatients=true;await chooseTime(page);
  await page.getByRole('button',{name:'重新載入預約對象',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'為本人預約',exact:true}).count(),0);
  assert(await page.getByRole('button',{name:'確認送出預約',exact:true}).isDisabled());state.failPatients=false;await page.getByRole('button',{name:'重新載入預約對象',exact:true}).click();await page.getByText('虛構預約人',{exact:true}).waitFor();assert.equal(state.posts.length,0);
 }finally{await page.close();}
});

test('衝突回到時段且保留備註，重送期間阻擋連點，成功後提供預約與行事曆入口',async()=>{
 const {page,state,errors}=await bookingFixture(browser,preview.origin,{width:390});
 try{
  await chooseService(page,preview.origin);await chooseTime(page);await page.getByText('虛構預約人',{exact:true}).waitFor();
  await page.getByLabel('備註（選填）',{exact:true}).fill('虛構備註');await page.locator('#privacy').click();state.conflict=true;
  await page.getByRole('button',{name:'確認送出預約',exact:true}).click();await page.getByRole('alert').getByText('此時段已無法預約，請重新選擇可約時間。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'14:00',exact:true}).click();await page.getByRole('button',{name:'確認預約資料',exact:true}).click();assert.equal(await page.getByLabel('備註（選填）',{exact:true}).inputValue(),'虛構備註');
  let release;state.holdPost=new Promise(r=>release=r);state.conflict=false;
  await page.getByRole('button',{name:'確認送出預約',exact:true}).click();await page.getByRole('button',{name:'處理中…',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'返回',exact:true}).isDisabled(),true);assert.equal(state.posts.length,2);release();
  await page.waitForURL('**/success?**');await page.getByRole('heading',{name:'預約成功',exact:true}).waitFor();
  assert.equal(state.posts[1].clinic_id,clinicId);assert.equal(state.posts[1].member_patient_id,'patient-a');assert.equal(state.posts[1].appointment_date,date);assert.equal(state.posts[1].appointment_time,'14:00');assert.equal(state.posts[1].notes,'虛構備註');
  await page.getByRole('link',{name:'查看我的預約',exact:true}).waitFor();assert.match(await page.getByRole('link',{name:'Google 日曆',exact:true}).getAttribute('href'),/^https:\/\/calendar.google.com/);await fits(page);await page.screenshot({path:`${dir}/success-390.png`,fullPage:false});assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('姓名開啟帳戶選單，預約與個人設定入口不同，手機也能操作且取消刪除不呼叫 API',async()=>{
 for(const width of [320,390,1440]){
  const {page,state,requests,errors}=await bookingFixture(browser,preview.origin,{width});
  try{
   await page.goto(preview.origin+'/member');await page.getByRole('heading',{name:'我的預約',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'刪除帳號',exact:true}).count(),0);
   const nav=page.getByRole('navigation',{name:'主要導覽',exact:true});assert.equal(await nav.locator('a[href="/member"]').count(),1);
   await nav.getByRole('button',{name:'帳戶選單',exact:true}).click();await page.getByRole('navigation',{name:'帳戶功能',exact:true}).getByRole('link',{name:'個人資料與設定',exact:true}).click();await page.waitForURL('**/member/profile');
   await page.getByRole('heading',{name:'帳戶設定',exact:true}).waitFor();await fits(page);assert.equal(state.posts.length,0);
   await page.getByRole('button',{name:'編輯個人資料',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();
   await page.getByRole('button',{name:'刪除帳號',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});await page.evaluate(()=>window.scrollTo(0,0));assert.equal(requests.filter(r=>r.method==='DELETE').length,0);await page.screenshot({path:`${dir}/account-${width}.png`,fullPage:false});assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
});


test('獨立帳戶設定沿用會員守衛，訪客回到指定登入頁、管理帳號導回後台',async()=>{
 for(const options of [{authenticated:false},{role:'admin'}]){
  const {page,requests}=await bookingFixture(browser,preview.origin,options);
  try{await page.goto(preview.origin+'/member/profile');
   if(options.authenticated===false){await page.waitForURL('**/auth?next=**');assert.equal(new URL(page.url()).searchParams.get('next'),'/member/profile');}
   else await page.waitForURL('**/admin/dashboard');
   assert.equal(requests.filter(r=>r.path.startsWith('/api/v1/member/')).length,0);
  }finally{await page.close();}
 }
});


test('公開示範的短按鈕文案在最窄手機不截斷，並明確說明不建立預約',async()=>{
 for(const width of [320,390]){
  const {page,state}=await bookingFixture(browser,preview.origin,{width,authenticated:false});
  try{await chooseService(page,preview.origin,'/booking/42399a23-1119-407e-91ed-e2df5bdbb218');await chooseTime(page);
   const button=page.getByRole('button',{name:'僅供體驗',exact:true});assert(await button.isDisabled());assert(await button.evaluate(el=>el.scrollWidth<=el.clientWidth));
   await page.getByText('示範院所不會建立實際預約',{exact:true}).waitFor();await fits(page);assert.equal(state.posts.length,0);
  }finally{await page.close();}
 }
});
