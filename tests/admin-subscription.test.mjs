import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startPreview,buildProblem,CHROME} from './support/built-app.mjs';
import {setupComplete,facilityId} from './support/admin-complete.mjs';

const evidence=process.env.ADMIN_SUBSCRIPTION_EVIDENCE_DIR ?? '/private/tmp/cross-subscription-20261108';
const path=tab=>`/admin/clinics/${facilityId}?tab=${tab}`;
let preview,browser;
before(async()=>{
  assert.equal(buildProblem(),null);
  preview=process.env.ADMIN_SUBSCRIPTION_ORIGIN?{origin:process.env.ADMIN_SUBSCRIPTION_ORIGIN,stop(){}}:await startPreview(4512);
  browser=await chromium.launch({executablePath:CHROME});
  await mkdir(evidence,{recursive:true});
});
after(async()=>{await browser?.close();preview?.stop();});

test('手機與桌面的今日、院所設定移除方案卡；完整資料及試用只在我的訂閱',async()=>{
  for(const width of [390,1440]){
    const {page,errors,requests}=await setupComplete(browser,preview.origin,{role:'facility_admin',free:true,width});
    try{
      for(const target of ['/admin/dashboard',path('info')]){
        await page.goto(preview.origin+target);await page.locator('.cross-admin h1').waitFor();
        assert.equal(await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).count(),0);
        assert.equal(await page.getByText(/目前方案：/).count(),0);
        assert.equal(await page.getByRole('button',{name:'啟用 90 天試用',exact:true}).count(),0);
      }
      await page.screenshot({path:`${evidence}/settings-${width}.png`,animations:'disabled'});
      await page.goto(preview.origin+'/admin/subscription');
      await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).waitFor();
      assert.equal(await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).count(),1);
      assert.equal(await page.getByRole('button',{name:'啟用 90 天試用',exact:true}).count(),1);
      await page.getByText('既有付款紀錄',{exact:true}).waitFor();
      await page.screenshot({path:`${evidence}/subscription-${width}.png`,animations:'disabled'});
      assert.equal(requests.filter(r=>r.method!=='GET').length,0);
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
});

test('有效試用不在日常頁重複倒數，訂閱頁仍顯示試用狀態與期限',async()=>{
  const {page,state,errors}=await setupComplete(browser,preview.origin,{role:'facility_admin'});
  state.clinic.subscription_status='trial';state.clinic.trial_used_at='2026-11-01T00:00:00Z';
  try{
    for(const target of ['/admin/dashboard',path('appointments'),path('info')]){
      await page.goto(preview.origin+target);await page.locator('.cross-admin h1').waitFor();
      assert.equal(await page.getByText(/試用剩餘/).count(),0);
      assert.equal(await page.getByRole('status',{name:'訂閱提醒',exact:true}).count(),0);
    }
    await page.goto(preview.origin+'/admin/subscription');
    await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).waitFor();
    await page.getByText('試用中',{exact:true}).waitFor();
    await page.getByText('到期日',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'啟用 90 天試用',exact:true}).count(),0);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('到期、暫停與取消只顯示一則提醒，受限功能不疊加全頁提示',async()=>{
  for(const problem of ['expired','suspended','cancelled']){
    const {page,state,errors}=await setupComplete(browser,preview.origin,{role:'facility_admin'});
    const label={expired:'到期',suspended:'暫停',cancelled:'取消'}[problem];
    state.clinic.subscription_status=problem==='expired'?'active':problem;
    state.clinic.subscription_expires_at=problem==='expired'?'2020-01-01T00:00:00Z':'2030-01-01T00:00:00Z';
    try{
      for(const tab of ['appointments','info','subscription','queue','analytics','stats']){
        await page.goto(preview.origin+path(tab));await page.locator('.cross-admin h1').waitFor();
        const warning=page.getByText(`訂閱已${label}，部分功能無法使用。`,{exact:false});await warning.waitFor();
        assert.equal(await warning.count(),1,`${problem}/${tab}`);
        const gated=['queue','analytics','stats'].includes(tab);
        assert.equal(await page.getByRole('status',{name:'訂閱提醒',exact:true}).count(),gated?0:1);
        if(tab==='subscription')assert.equal(await page.getByRole('link',{name:'查看訂閱',exact:true}).count(),0);
      }
      await page.screenshot({path:`${evidence}/${problem}-gate.png`,animations:'disabled'});
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
});

test('受限功能的訂閱入口保留平台院所情境，院所帳號使用自己的訂閱頁',async()=>{
  for(const role of ['superadmin','facility_admin']){
    const {page,errors}=await setupComplete(browser,preview.origin,{role,free:true});
    try{
      for(const tab of ['queue','analytics','stats']){
        await page.goto(preview.origin+path(tab));
        const link=page.getByRole('link',{name:tab==='queue'?'查看我的訂閱':'查看訂閱',exact:true});await link.waitFor();
        const href=new URL(await link.getAttribute('href'),preview.origin);
        assert.equal(href.pathname,role==='superadmin'?`/admin/clinics/${facilityId}`:'/admin/subscription');
        if(role==='superadmin')assert.equal(href.searchParams.get('tab'),'subscription');
        await link.click();await page.getByRole('heading',{name:'訂閱與付款狀態',exact:true}).waitFor();
        assert.equal(await page.getByRole('button',{name:'編輯訂閱',exact:true}).count(),role==='superadmin'?1:0);
      }
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
});
