<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Check from "@lucide/svelte/icons/check";
  import Seo from "#lib/components/Seo.svelte";
  import SiteFooter from "#lib/components/layout/SiteFooter.svelte";
  import SiteHeader from "#lib/components/layout/SiteHeader.svelte";
  import { Button } from "#lib/components/ui/button/index.js";
  import { Card, CardContent } from "#lib/components/ui/card/index.js";
  import { clinicLineContact } from "#lib/contact.ts";
  import { PRICING_PLANS } from "#lib/constants/pricing-constants.ts";
  import { PLAN_LABELS } from "#lib/feature-access.ts";
  import * as Table from "#lib/components/ui/table/index.ts";
  import * as Accordion from "#lib/components/ui/accordion/index.ts";

  let { data } = $props();
  const comparison = [
    { label: "院所門面、服務與團隊介紹", values: ["提供", "提供", "提供"] },
    { label: "現場與電話代訂", values: ["提供", "提供", "提供"] },
    { label: "客人自行線上選時段", values: ["未提供", "提供", "提供"] },
    { label: "預約提醒、叫號與報到", values: ["未提供", "提供", "提供"] },
    { label: "客戶分析與未到風險提示", values: ["未提供", "未提供", "提供"] },
    { label: "進階叫號與公開看板", values: ["未提供", "未提供", "提供"] },
  ];
  const questions = [
    { question: "還沒準備開放線上預約，可以先使用嗎？", answer: "可以。免費版可先建立院所門面、介紹服務，並管理現場與電話代訂。準備好服務時長與人員班表後，再確認線上預約的開通安排。" },
    { question: "標準版和專業版應該怎麼選？", answer: "想先讓客人自行選時段、集中處理預約，可從標準版評估。若團隊還需要客戶分析、未到風險提示及進階候診管理，再評估專業版。導入前可先透過 LINE 討論實際流程。" },
    { question: "醫美服務一定要公開價格嗎？", answer: "不需要。各項服務可獨立設定是否對客人顯示價格，內部金額仍保留。諮詢與療程也可以分別設定服務內容與預約時長。" },
    { question: "客人可以從我們原本的 LINE 或社群進來嗎？", answer: "可以。院所公開頁有分享連結，可放在 LINE、社群或 Google 商家，讓原有客人認識服務；實際預約方式依院所方案與開通設定提供。" },
  ];
</script>

<Seo {...data.seo} />

<div class="flex min-h-screen flex-col bg-background">
  <SiteHeader />
  <main class="flex-1">
    <section class="home-container py-14 sm:py-20">
      <p class="home-eyebrow">CROSS / 院所預約方案</p>
      <h1 class="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
        先建立門面，再選適合的預約管理。
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
        以電話與現場為主、準備開放線上預約，或需要更進一步管理？依團隊現在的工作方式選擇，費用與開通安排在導入前確認。
      </p>
      <Button href="/join#product-preview" variant="link" class="mt-4 min-h-11 px-0">先看院所門面與工作台示意 <ArrowRight aria-hidden="true" /></Button>
      <div class="mt-10 grid gap-6 lg:grid-cols-3">
        {#each PRICING_PLANS as plan (plan.id)}
          <Card
            class={plan.id === "standard"
              ? "relative gap-0 border-primary bg-accent/10 py-0 shadow-sm ring-1 ring-primary/20"
              : "gap-0 py-0"}
          >
            <CardContent class="flex h-full flex-col p-6 sm:p-8">
              <div class="flex min-h-7 items-center justify-between gap-3">
                <h2 class="text-xl font-semibold">{PLAN_LABELS[plan.id]}版</h2>
                {#if plan.id === "standard"}<span
                    class="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  >
                    線上預約首選
                  </span>{/if}
              </div>
              <p class="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                {plan.description}
              </p>
              <p class="mt-4 min-h-18 rounded-2xl bg-muted/70 p-4 text-sm leading-6 text-muted-foreground">{plan.audience}</p>
              <p class="mt-6 text-4xl font-semibold tracking-tight">
                {#if plan.monthlyPrice === 0}免費{:else}NT${plan.monthlyPrice.toLocaleString(
                    "zh-TW",
                  )}
                  <span class="ml-2 text-sm font-normal text-muted-foreground">
                    ／月
                  </span>{/if}
              </p>
              <p class="mt-3 text-sm leading-6 font-medium">{plan.focus}</p>
              <ul class="mt-7 flex-1 space-y-4">
                {#each plan.features as feature (feature)}
                  <li class="flex items-start gap-2 text-sm leading-6">
                    <Check
                      class="mt-1 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />{feature}
                  </li>
                {/each}
              </ul>
              <Button
                href={`/join/apply?plan=${plan.id}`}
                variant={plan.id === "standard" ? "default" : "outline"}
                class="mt-8 min-h-11 w-full"
              >
                申請院所導入 <ArrowRight aria-hidden="true" />
                <span class="sr-only">（{PLAN_LABELS[plan.id]}版）</span>
              </Button>
            </CardContent>
          </Card>
        {/each}
      </div>
      <p class="mt-5 text-sm leading-7 text-muted-foreground">
        免費版可建立公開門面，管理現場與電話代訂；民眾自行選時段的線上預約，由標準版起提供。付費方案採月費計價，開通前確認方案、功能與上線安排。
      </p>
      <section aria-labelledby="plan-comparison-title" class="mt-14">
        <p class="home-eyebrow">依工作方式選擇</p>
        <h2 id="plan-comparison-title" class="home-heading mt-3">差別在哪裡，一起看清楚。</h2>
        <div class="mt-6 overflow-hidden rounded-2xl border bg-card">
          <Table.Root>
            <Table.Caption class="px-4 pb-4 text-left">各項功能仍依院所開通設定提供；本表為三個方案的主要差異。</Table.Caption>
            <Table.Header><Table.Row><Table.Head class="w-[43%] whitespace-normal">需要處理的工作</Table.Head>{#each PRICING_PLANS as plan (plan.id)}<Table.Head class="text-center">{PLAN_LABELS[plan.id]}版</Table.Head>{/each}</Table.Row></Table.Header>
            <Table.Body>{#each comparison as row (row.label)}<Table.Row><Table.Head scope="row" class="h-auto py-4 whitespace-normal text-foreground">{row.label}</Table.Head>{#each row.values as value, i (i)}<Table.Cell class="text-center text-xs sm:text-sm">{value}</Table.Cell>{/each}</Table.Row>{/each}</Table.Body>
          </Table.Root>
        </div>
      </section>
      <section aria-labelledby="pricing-questions-title" class="mt-14 max-w-3xl">
        <h2 id="pricing-questions-title" class="home-heading">導入前，你可能想知道。</h2>
        <Accordion.Root type="single" class="mt-5">{#each questions as item (item.question)}<Accordion.Item value={item.question}><Accordion.Trigger class="min-h-14 text-left leading-7">{item.question}</Accordion.Trigger><Accordion.Content class="text-sm leading-7 text-muted-foreground">{item.answer}</Accordion.Content></Accordion.Item>{/each}</Accordion.Root>
      </section>
      <div class="mt-10 max-w-5xl">
        <Card class="gap-0 bg-accent/20 py-0 shadow-sm">
          <CardContent class="p-8">
            <CalendarDays class="size-6 text-primary" aria-hidden="true" />
            <h2 class="mt-5 text-xl font-semibold">先確認院所的預約需求</h2>
            <p class="mt-4 text-sm leading-7 text-muted-foreground">
              看診、醫美諮詢與療程可能有不同的時長及人員安排。導入前先確認服務、排班與院所流程，再設定線上預約入口。
            </p>
            <ul class="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>確認服務內容與預約時長</li>
              <li>整理人員、班表與休假設定</li>
              <li>確認開通功能、費用與上線安排</li>
            </ul>
            <Button
              href={clinicLineContact}
              target="_blank"
              rel="noopener noreferrer"
              class="mt-7 min-h-11 bg-[#007a35] text-white hover:bg-[#00652c]"
            >
              <MessageCircle aria-hidden="true" />LINE 導入諮詢 <ArrowUpRight
                aria-hidden="true"
              />
              <span class="sr-only">（另開視窗）</span>
            </Button>
            <a
              href="/join"
              class="mt-6 flex items-center gap-2 text-sm font-medium text-primary"
            >
              了解院所導入流程 <ArrowRight class="size-4" aria-hidden="true" />
            </a>
          </CardContent>
        </Card>
      </div>
      <p class="mt-8 text-sm text-muted-foreground">
        既有訂閱的取消與退款，請參閱
        <a
          href="/refund"
          class="ml-1 text-primary underline underline-offset-4"
        >
          退款政策
        </a>
        。
      </p>
    </section>
  </main>
  <SiteFooter />
</div>
