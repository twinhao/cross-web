<script lang="ts">
  import ClinicShowcase from "#lib/components/home/ClinicShowcase.svelte";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Seo from "#lib/components/Seo.svelte";
  import PublicFrame from "#lib/components/public/PublicFrame.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { clinicLineContact } from "#lib/contact.ts";
  import { DEMO_CLINIC_ID } from "#lib/clinic-discovery.ts";

  let { data } = $props();
  const steps = [
    {
      title: "建立院所帳號",
      text: "填寫院所與聯絡資料，驗證信箱後進入後台。",
      preparation: "先準備：聯絡信箱與院所基本資料。",
    },
    {
      title: "整理門面與服務",
      text: "加入照片、團隊與服務介紹，審核通過後公開上架。",
      preparation: "接著準備：Logo、服務內容與預約時長；價格可選擇不公開。",
    },
    {
      title: "開放適合的預約方式",
      text: "免費版先管理現場與電話代訂；需要線上預約時，再選方案並完成排班。",
      preparation: "上線前確認：方案、人員班表與客人實際可選的時段。",
    },
  ];
</script>

<Seo {...data.seo} />
<PublicFrame>
  <section class="border-b border-border bg-card" aria-labelledby="join-title">
    <div class="home-container py-8 sm:py-16">
      <div class="max-w-3xl">
        <p class="home-eyebrow">給診所與醫美團隊</p>
        <h1 id="join-title" class="mt-4 text-[2rem] leading-[1.35] font-semibold tracking-tight sm:text-5xl">
          讓預約更有條理，<br /><span class="text-primary">從院所門面開始。</span>
        </h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:mt-5 sm:leading-8">
          把 LINE、社群上的客人，帶到專屬院所頁認識服務、安排預約；團隊在同一個後台接續處理。
        </p>
        <div class="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
          <Button href="/join/apply" size="lg" class="min-h-11 w-full gap-1.5 px-3 sm:w-auto sm:px-6 [&_svg]:size-4">申請院所導入 <ArrowRight aria-hidden="true" /></Button>
          <Button href={`/booking/${DEMO_CLINIC_ID}`} size="lg" variant="outline" class="min-h-11 w-full gap-1.5 px-3 sm:w-auto sm:px-6 [&_svg]:size-4">體驗示範預約 <ArrowRight aria-hidden="true" /></Button>
        </div>
        <p class="mt-3 text-xs leading-6 text-muted-foreground">示範使用虛構資料，不建立實際預約。</p>
        <div class="mt-2 flex items-center text-sm sm:mt-5">
          <a href="/pricing" class="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">查看方案與費用 <ArrowRight class="size-4" aria-hidden="true" /></a>
        </div>
      </div>
    </div>
  </section>

  <ClinicShowcase />

  <section class="border-y border-border bg-card" aria-labelledby="onboarding-title">
    <div class="home-container py-8 sm:py-14">
      <p class="home-eyebrow">從申請到上線</p>
      <h2 id="onboarding-title" class="home-heading mt-3">三步開始，資料可以逐步補齊。</h2>
      <ol class="mt-6 grid gap-5 sm:mt-8 md:grid-cols-3 md:gap-8">
        {#each steps as step, index (step.title)}
          <li class="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-border pt-4 md:block md:pt-5">
            <span class="pt-1 font-mono text-sm font-medium text-primary">0{index + 1}</span>
            <div><h3 class="text-base font-semibold md:mt-3 md:text-lg">{step.title}</h3>
            <p class="mt-2 text-sm leading-7 text-muted-foreground md:mt-3">{step.text}</p>
            <p class="mt-2 text-xs leading-6 text-muted-foreground md:mt-3">{step.preparation}</p></div>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="home-container py-8 sm:py-14" aria-labelledby="join-start-title">
    <div class="rounded-3xl border border-primary/10 bg-accent/25 p-5 sm:p-9">
      <div class="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div class="max-w-xl">
          <h2 id="join-start-title" class="text-xl leading-snug font-semibold tracking-tight sm:text-2xl">先建立門面，再依需要開通線上預約。</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">從免費版開始整理院所資料；各方案的功能與月費，集中在方案頁比較。</p>
          <a href="/pricing" class="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">比較免費、標準與專業版 <ArrowRight class="size-4" aria-hidden="true" /></a>
        </div>
        <Button href="/join/apply" size="lg" class="min-h-11 w-full shrink-0 self-start sm:w-auto">申請院所導入 <ArrowRight aria-hidden="true" /></Button>
      </div>
      <p class="mt-6 flex flex-wrap items-center gap-x-2 border-t border-border/80 pt-4 text-sm text-muted-foreground">
        <span>不確定怎麼開始？</span>
        <a href={clinicLineContact} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-1.5 font-medium text-[#007a35] underline-offset-4 hover:underline dark:text-emerald-400"><MessageCircle class="size-4" aria-hidden="true" />LINE 導入諮詢 <ArrowUpRight class="size-4" aria-hidden="true" /><span class="sr-only">（另開視窗）</span></a>
      </p>
    </div>
  </section>
</PublicFrame>
