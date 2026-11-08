import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {calendarEvents} from '../src/lib/admin/appointment-calendar.ts';
import {startPreview,buildProblem,CHROME} from './support/built-app.mjs';
import {setupWorkspace,facilityId} from './support/admin-workspace.mjs';

const evidence=process.env.ADMIN_CALENDAR_EVIDENCE_DIR ?? '/private/tmp/cross-calendar-20261108';
const path=`/admin/clinics/${facilityId}?tab=appointments&view=day`;
let preview,browser;
before(async()=>{
  assert.equal(buildProblem(),null);
  preview=process.env.ADMIN_CALENDAR_ORIGIN?{origin:process.env.ADMIN_CALENDAR_ORIGIN,stop(){}}:await startPreview(4509);
  browser=await chromium.launch({executablePath:CHROME});
  await mkdir(evidence,{recursive:true});
});
after(async()=>{await browser?.close();preview?.stop();});
const row=(id,time,duration)=>({id,appointment_time:time,duration_minutes:duration});

test('重疊預約各有可操作欄位；後續無重疊時恢復完整寬度，來源順序不變',()=>{
  const rows=[row('later','12:00',30),row('long','10:00',60),row('short','10:00',30),row('middle','10:15',15)];
  const events=calendarEvents(rows,30);
  assert.deepEqual(rows.map(a=>a.id),['later','long','short','middle']);
  const overlapping=events.filter(e=>e.start<11*60);
  assert(overlapping.every(e=>e.lanes===3));
  assert.equal(new Set(overlapping.map(e=>e.lane)).size,3);
  assert.equal(events.at(-1).lanes,1);
  for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
    const a=events[i],b=events[j];
    if(a.start<b.end&&b.start<a.end)assert.notEqual(a.lane,b.lane);
  }
});

test('相接時段共用整欄，短預約保留高度且分欄避免覆蓋，缺少時長使用院所設定',()=>{
  const adjacent=calendarEvents([row('a','10:00',15),row('b','10:15',30)],30);
  assert(adjacent.every(e=>e.lanes===1&&e.height>=24));
  const short=calendarEvents([row('a','10:00',5),row('b','10:05',5),row('c','10:10',5)],30);
  assert(short.every(e=>e.lanes===3));
  assert.equal(calendarEvents([row('legacy','11:00',null)],60)[0].height,94);
  assert.deepEqual(calendarEvents([],30),[]);
});

async function checkTextFits(button){
  const result=await button.evaluate(el=>{
    const box=el.getBoundingClientRect();
    return {height:box.height,overflow:el.scrollHeight>el.clientHeight,
      children:[...el.children].every(child=>{const r=child.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom;})};
  });
  assert.equal(result.overflow,false,JSON.stringify(result));
  assert.equal(result.children,true,JSON.stringify(result));
}

test('十五、三十與六十分鐘卡片完整顯示；時間比例、服務及文字狀態可辨識',async()=>{
  const {page,state,errors}=await setupWorkspace(browser,preview.origin);
  state.appointments=state.appointments.slice(0,4).map((a,i)=>({...a,staff_id:'staff-1',appointment_time:['10:00','10:30','11:00','12:00'][i],duration_minutes:[15,30,60,28][i]}));
  try{
    await page.goto(preview.origin+path);
    const calendar=page.getByLabel('依人員排列的當日時間表',{exact:true});
    const cards=calendar.locator('.calendar-event');await cards.first().waitFor();assert.equal(await cards.count(),4);
    for(const card of await cards.all())await checkTextFits(card);
    const boxes=await Promise.all((await cards.all()).map(c=>c.boundingBox()));
    assert.equal(Math.round(boxes[1].y-boxes[0].y),48);
    assert.equal(Math.round(boxes[2].y-boxes[0].y),96);
    await cards.nth(1).getByText('已報到',{exact:true}).waitFor();
    await cards.nth(1).getByText('雷射療程（虛構）',{exact:true}).waitFor();
    assert((await cards.first().getAttribute('aria-label')).includes('10:00–10:15'));
    await calendar.screenshot({path:`${evidence}/day-cards.png`,animations:'disabled'});
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('同時段卡片不互相遮蓋，滑鼠及鍵盤均能開啟各自預約詳情',async()=>{
  const {page,state,errors}=await setupWorkspace(browser,preview.origin);
  state.appointments=state.appointments.slice(0,3).map((a,i)=>({...a,staff_id:'staff-1',appointment_time:['10:00','10:00','10:15'][i],duration_minutes:[60,30,15][i]}));
  try{
    await page.goto(preview.origin+path);
    const calendar=page.getByLabel('依人員排列的當日時間表',{exact:true});
    const cards=calendar.locator('.calendar-event');await cards.first().waitFor();
    const boxes=await Promise.all((await cards.all()).map(c=>c.boundingBox()));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];assert(a.x+a.width<=b.x||b.x+b.width<=a.x);
    }
    await calendar.screenshot({path:`${evidence}/day-overlap.png`,animations:'disabled'});
    for(let i=0;i<3;i++){
      const card=cards.nth(i);const label=await card.getAttribute('aria-label');
      if(i===1){await card.focus();await page.keyboard.press('Enter');}else await card.click();
      const dialog=page.getByRole('dialog');await dialog.waitFor();
      assert(label.includes((await dialog.locator('dd').first().textContent()).trim()));
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('平板長文字在日曆內捲動、暗色卡片可讀，手機保留完整時間清單',async()=>{
  for(const width of [768,390]){
    const {page,state,errors}=await setupWorkspace(browser,preview.origin,{width});
    state.appointments[0].patient_name='很長的虛構客戶姓名測試文字';
    state.appointments[0].service_name='很長的虛構療程名稱測試文字';
    state.appointments[1].staff_id=null;
    state.appointments[1].staff_name=null;
    await page.addInitScript(()=>localStorage.setItem('theme','dark'));
    try{
      await page.goto(preview.origin+path);
      const calendar=page.getByLabel('依人員排列的當日時間表',{exact:true});
      if(width===768){
        await calendar.waitFor();const cards=calendar.locator('.calendar-event');await cards.first().waitFor();
        for(const card of await cards.all())await checkTextFits(card);
        const layout=await calendar.evaluate(el=>({scroll:el.scrollWidth>el.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth}));
        assert.equal(layout.scroll,true);assert.equal(layout.pageOverflow,false);
        await calendar.evaluate(el=>{el.scrollLeft=100;el.scrollTop=150;});
        const header=await calendar.getByRole('heading').first().boundingBox(),box=await calendar.boundingBox();
        assert(Math.abs(header.y-box.y)<2);
      }else{
        assert.equal(await calendar.isVisible(),false);
        await page.getByRole('button',{name:'很長的虛構客戶姓名測試文字',exact:true}).filter({visible:true}).waitFor();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await page.screenshot({path:`${evidence}/calendar-${width}-dark.png`,animations:'disabled'});
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
});
