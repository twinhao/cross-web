<script lang="ts">
  import ClinicShowcase from "#lib/components/home/ClinicShowcase.svelte";
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Check from '@lucide/svelte/icons/check';
  import Hospital from '@lucide/svelte/icons/hospital';
  import Users from '@lucide/svelte/icons/users';
  import Seo from '#lib/components/Seo.svelte';
  import PublicFrame from '#lib/components/public/PublicFrame.svelte';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Card, CardContent } from '#lib/components/ui/card/index.ts';
  import { clinicLineContact } from '#lib/contact.ts';
  import { DEMO_CLINIC_ID } from '#lib/clinic-discovery.ts';
  let { data } = $props();
  const capabilities = [
    { icon: Hospital, title: '把品牌介紹完整', text: '用品牌 Logo、團隊與服務介紹建立專屬門面，分享至 LINE、社群或 Google 商家，承接原本就認識你的客人。' },
    { icon: CalendarDays, title: '把諮詢與療程分清楚', text: '各自設定服務內容與預約時長，依人員排班開放時段；服務價格可獨立選擇是否公開。' },
    { icon: Users, title: '讓櫃檯掌握同一份安排', text: '集中處理線上預約、電話代訂與現場安排，查看人員、時間與預約狀態，接續報到與服務流程。' },
  ];
  const steps = [
    { title: '驗證信箱，開通後台', text: '提供院所與聯絡資料，完成信箱驗證後就能進後台整理設定。' },
    { title: '整理品牌門面與服務', text: '放上品牌 Logo、團隊介紹與服務說明，確認價格是否公開；審核通過後公開上架。' },
    { title: '確認方案與時段', text: '免費版提供門面與現場、電話代訂；開通線上預約方案並完成排班後，檢查民眾可選的實際時段。' },
  ];
  const preparations = [
    { title: '院所與團隊', text: '品牌 Logo、院所介紹、服務人員照片與專業資料。' },
    { title: '諮詢與療程', text: '服務名稱、介紹、預約時長，以及是否公開價格。' },
    { title: '日常安排', text: '營業時間、人員班表、休假與目前的預約處理方式。' },
  ];
</script>

<Seo {...data.seo} />
<PublicFrame>
  <section class="border-b border-border bg-card">
    <div class="home-container grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-20">
      <div class="min-w-0"><p class="home-eyebrow">CROSS / 院所品牌門面與預約管理</p><h1 class="mt-5 text-4xl font-semibold leading-[1.3] tracking-tight sm:text-5xl">讓預約更有條理，<br /><span class="text-primary">讓院所有自己的樣子。</span></h1><p class="mt-6 max-w-xl text-base leading-8 text-muted-foreground">從你現有的客人開始。建立能代表院所的服務門面，分享至 LINE 與社群，再把諮詢、療程預約及櫃檯日常安排接起來。</p><div class="mt-7 flex flex-wrap gap-3"><Button href="/join/apply" size="lg">申請院所導入 <ArrowRight aria-hidden="true" /></Button><Button href="/pricing" size="lg" variant="outline">查看方案與費用</Button></div><a href="#product-preview" class="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">先看門面與工作台 <ArrowRight class="size-4" aria-hidden="true" /></a><p class="mt-4 text-xs leading-6 text-muted-foreground">已有帳號？<a href="/admin/login" class="text-primary underline underline-offset-4">登入院所後台</a></p></div>
      <Card class="gap-0 py-0 shadow-sm"><CardContent class="p-7"><p class="home-eyebrow">從實際預約需求開始</p><h2 class="mt-4 text-xl font-semibold">先把日常流程安排好。</h2><ul class="mt-5 space-y-4">{#each ['諮詢與療程分別設定服務及時長', '依專業人員的排班開放可預約時段', '集中查看預約與處理狀態'] as text (text)}<li class="flex gap-2 text-sm leading-7"><Check class="mt-1.5 size-4 shrink-0 text-primary" aria-hidden="true" />{text}</li>{/each}</ul><p class="mt-5 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">實際功能、導入範圍與費用會在開通前確認。</p></CardContent></Card>
    </div>
  </section>
  <ClinicShowcase />
  <div class="home-container -mt-5 pb-10"><div class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border bg-card p-5"><div class="flex-1"><p class="text-sm font-semibold">親自走一次客人的預約流程。</p><p class="mt-1 text-xs leading-6 text-muted-foreground">使用示範資料體驗選服務、選時間與確認資料，不建立實際預約。</p></div><Button href={`/booking/${DEMO_CLINIC_ID}`} variant="outline" class="min-h-11">體驗示範預約 <ArrowRight aria-hidden="true" /></Button></div></div>
  <section class="home-container py-14 sm:py-20"><p class="home-eyebrow">院所日常管理</p><h2 class="home-heading mt-3">從接收預約，到服務每一次到訪。</h2><div class="mt-8 grid gap-5 md:grid-cols-3">{#each capabilities as item (item.title)}<Card class="gap-0 py-0 shadow-sm"><CardContent class="p-7"><item.icon class="size-6 text-primary" aria-hidden="true" /><h3 class="mt-5 font-semibold">{item.title}</h3><p class="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p></CardContent></Card>{/each}</div></section>
  <section class="border-y border-border bg-card"><div class="home-container py-14"><p class="home-eyebrow">導入流程</p><h2 class="home-heading mt-3">先確認需求，再開放預約。</h2><ol class="mt-8 grid gap-6 md:grid-cols-3">{#each steps as step, index (step.title)}<li><span class="font-mono text-sm text-primary">0{index + 1}</span><h3 class="mt-3 font-semibold">{step.title}</h3><p class="mt-3 text-sm leading-7 text-muted-foreground">{step.text}</p></li>{/each}</ol></div></section>
  <section class="home-container py-14" aria-labelledby="preparation-title"><p class="home-eyebrow">一起準備好的第一個門面</p><h2 id="preparation-title" class="home-heading mt-3">帶著真實服務，開始討論。</h2><p class="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">不必先整理成完整企劃。先確認以下資料，就能逐步安排門面、服務與預約設定。</p><ul class="mt-7 grid gap-6 md:grid-cols-3">{#each preparations as item (item.title)}<li class="border-t border-border pt-5"><h3 class="font-semibold">{item.title}</h3><p class="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p></li>{/each}</ul></section>
  <section class="home-container py-14"><div class="flex flex-col justify-between gap-6 rounded-3xl bg-accent/30 p-7 sm:p-10 md:flex-row md:items-center"><div><h2 class="text-xl font-semibold">一起確認適合你的預約流程。</h2><p class="mt-3 text-sm leading-7 text-muted-foreground">告訴我們院所類型、服務內容與排程方式，從最需要的預約場景開始。</p><Button href={clinicLineContact} target="_blank" rel="noopener noreferrer" class="mt-4 min-h-11 bg-[#007a35] text-white hover:bg-[#00652c]"><MessageCircle aria-hidden="true" />LINE 導入諮詢 <ArrowUpRight aria-hidden="true" /><span class="sr-only">（另開視窗）</span></Button></div><Button href="/join/apply" size="lg">申請院所導入 <ArrowRight aria-hidden="true" /></Button></div></section>
</PublicFrame>
