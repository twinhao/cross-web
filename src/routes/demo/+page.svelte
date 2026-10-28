<script lang="ts">
  import { beforeNavigate, afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import { setAuth } from "#lib/auth/auth.svelte.ts";
  import { setDemoContext } from "#lib/demo/context.ts";
  import { DEMO_ID, demoUser, imageCredits } from "#lib/demo/data.ts";
  import { getDemoSession, demoFetch } from "#lib/demo/session.ts";
  import { loadClinicDetail, buildClinicSeo, type ClinicDetail } from "#lib/clinic-detail.ts";
  import { bookingApi } from "#lib/api/booking.ts";
  import { loadBookingPage, type BookingPageResult } from "#lib/booking/booking-flow.ts";
  import ClinicDetailView from "#lib/components/clinic-detail/ClinicDetailView.svelte";
  import BookingFlow from "#lib/components/booking/BookingFlow.svelte";
  import Workspace from "#lib/components/admin/workspace/Workspace.svelte";
  import Seo from "#lib/components/Seo.svelte";
  import ThemeToggle from "#lib/components/ThemeToggle.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { CircleCheck, RotateCcw, ArrowRight, ArrowLeft } from "@lucide/svelte";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import { resetDemoFavorites } from "#lib/hooks/favorites.svelte.ts";

  setDemoContext();
  const auth = setAuth();
  auth.isLoading = false;
  const session = getDemoSession();
  const view = $derived(["clinic", "booking", "admin", "success"].includes(page.url.searchParams.get("mode") ?? "") ? page.url.searchParams.get("mode")! : "clinic");
  let revision = $state(0), resetOpen = $state(false);
  let scrollArea: HTMLDivElement;
  let clinicDetail = $state.raw<ClinicDetail | null>(null);
  let bookingResult = $state.raw<BookingPageResult | null>(null);
  let loadError = $state("");
  const receipt = $derived(view === "success" ? session.booking(page.url.searchParams.get("booking") ?? "") : null);
  const tabs = [{ view: "clinic", label: "院所門面", href: "/demo" }, { view: "booking", label: "民眾預約", href: "/demo?mode=booking" }, { view: "admin", label: "院所後台", href: "/demo?mode=admin&tab=today" }];
  $effect(() => {
    auth.user = demoUser(session.snapshot().facility, view === "admin");
  });
  auth.refreshUser = async () => { auth.user = demoUser(session.snapshot().facility, view === "admin"); };
  auth.logout = () => { void goto("/demo"); };
  $effect(() => {
    void revision;
    const current = view;
    let active = true;
    clinicDetail = null; bookingResult = null; loadError = "";
    if (current === "clinic") loadClinicDetail(demoFetch, DEMO_ID).then(result => { if (active) clinicDetail = result; }).catch(() => { if (active) loadError = "示範資料無法讀取，請重置後再試。"; });
    if (current === "booking") loadBookingPage(bookingApi, DEMO_ID).then(result => { if (active) bookingResult = result; });
    return () => { active = false; };
  });
  // 沿用原生後台的內部導航，但所有院所與預約連結保持在示範分頁內。
  beforeNavigate(navigation => {
    const target = navigation.to?.url;
    if (!target || target.origin !== page.url.origin || target.pathname === "/demo") return;
    let destination = "";
    if (target.pathname.startsWith(`/admin/clinics/${DEMO_ID}`) || ["/admin/dashboard", "/admin/subscription", "/admin/analytics"].includes(target.pathname)) {
      const params = new SvelteURLSearchParams(target.search);
      params.set("mode", "admin");
      if (!params.has("tab")) params.set("tab", target.pathname.endsWith("subscription") ? "subscription" : target.pathname.endsWith("analytics") ? "analytics" : "today");
      destination = `/demo?${params}`;
    } else if (target.pathname === `/clinic/${DEMO_ID}`) destination = "/demo";
    else if (target.pathname === `/booking/${DEMO_ID}`) destination = "/demo?mode=booking";
    if (destination) { navigation.cancel(); void goto(destination); }
  });
  afterNavigate(() => { scrollArea?.scrollTo({ top: 0 }); });
  function reset() { session.reset(); resetDemoFavorites(); revision++; resetOpen = false; void goto("/demo"); }
</script>

<Seo title="澄光美學診所｜Cross 完整示範" description="虛構院所門面、完整預約體驗與院所後台操作。所有操作只在本分頁示範，不會建立真實預約或發送通知。" canonical="/demo" noindex />
<div class="demo-shell grid h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
  <header class="relative z-50 border-b bg-card px-4 py-3 sm:px-6" aria-label="示範體驗導覽">
    <div class="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="flex min-w-0 items-center gap-2"><a href="/" aria-label="離開示範，回 Cross 首頁" class="inline-flex min-h-11 items-center gap-2 font-semibold"><ArrowLeft class="size-4" />Cross</a><span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">虛構示範</span></div>
      <div class="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="sm" class="min-h-11" onclick={() => resetOpen = true}><RotateCcw class="size-4" />重置</Button></div>
      <nav aria-label="切換示範視角" class="order-3 grid w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:order-none sm:w-auto sm:min-w-80">
        {#each tabs as tab (tab.view)}<a href={tab.href} aria-current={view === tab.view || view === "success" && tab.view === "booking" ? "page" : undefined} class="flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors aria-[current=page]:bg-card aria-[current=page]:text-primary aria-[current=page]:shadow-sm">{tab.label}</a>{/each}
      </nav>
    </div>
    <p class="mx-auto mt-2 max-w-screen-2xl text-xs leading-5 text-muted-foreground">僅供體驗，不提供醫療服務、不發送通知、不收費。資料只留在本分頁，重新整理即重置；請勿輸入真實個資。</p>
  </header>
  <div bind:this={scrollArea} class="demo-scroll relative min-h-0 overflow-y-auto overscroll-contain">
    {#key revision}
      {#if view === "admin"}
        <Workspace name="clinic" facilityId={DEMO_ID} />
      {:else if view === "booking" && bookingResult?.kind === "ok"}
        <main><BookingFlow clinicId={DEMO_ID} clinicConfig={bookingResult.clinicConfig} services={bookingResult.services} doctors={bookingResult.doctors} paymentType={bookingResult.paymentType} /></main>
      {:else if view === "booking" && bookingResult?.kind === "error"}
        <div role="alert" class="home-container py-12"><p>無法載入示範預約，請重置後再試。</p></div>
      {:else if view === "success"}
        <main class="home-container max-w-2xl py-10 sm:py-16">
          {#if receipt}
            <CircleCheck class="size-12 text-primary" /><p class="mt-6 text-sm font-medium text-primary">僅供功能展示</p><h1 class="mt-2 text-3xl font-semibold">示範預約完成</h1>
            <p class="mt-4 text-sm leading-7 text-muted-foreground">這不是實際預約，不會收到通知，也不需要前往院所。切換至院所後台，可查看這筆示範預約並體驗後續管理。</p>
            <dl class="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-4 rounded-2xl border bg-card p-5 text-sm"><dt class="text-muted-foreground">示範編號</dt><dd class="break-all">{receipt.booking_number}</dd><dt class="text-muted-foreground">服務</dt><dd>{receipt.service.name}</dd><dt class="text-muted-foreground">時間</dt><dd>{receipt.appointment_datetime.slice(0, 16).replace("T", " ")}</dd><dt class="text-muted-foreground">預約對象</dt><dd>{receipt.patient_name}</dd></dl>
            <div class="mt-6 flex flex-wrap gap-3"><Button href={`/demo?mode=admin&tab=appointments&start=${receipt.appointment_datetime.slice(0,10)}&end=${receipt.appointment_datetime.slice(0,10)}&view=day`} class="min-h-11">到後台查看此預約<ArrowRight class="size-4" /></Button><Button href="/demo?mode=booking" variant="outline" class="min-h-11">再試一次</Button></div>
          {:else}<h1 class="text-2xl font-semibold">這筆示範已重置</h1><p class="mt-4 text-muted-foreground">重新整理頁面後會還原初始資料，可以再體驗一次。</p><Button href="/demo?mode=booking" class="mt-6 min-h-11">開始示範預約</Button>{/if}
        </main>
      {:else if clinicDetail?.clinic}
        <main><ClinicDetailView renderSeo={false} data={{ ...clinicDetail, clinic: clinicDetail.clinic, clinicId: DEMO_ID, isDemo: true, seo: buildClinicSeo(clinicDetail.clinic, DEMO_ID, clinicDetail.taxonomy) }} /></main>
        <section class="home-container pb-32 pt-6 text-xs leading-6 text-muted-foreground" aria-label="示範照片來源"><h2 class="font-semibold text-foreground">照片為授權素材，非實際院所</h2><p>攝影：Max Vakhtbovych／Pexels。僅示意環境，不代表攝影師或照片中的場所參與 Cross。</p><div class="mt-2 flex flex-wrap gap-x-4">{#each imageCredits as credit (credit.id)}<a class="inline-flex min-h-11 items-center underline underline-offset-4" href={credit.page} target="_blank" rel="noopener noreferrer">照片 {credit.id}<span class="sr-only">（另開視窗）</span></a>{/each}<a class="inline-flex min-h-11 items-center underline underline-offset-4" href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Pexels 授權<span class="sr-only">（另開視窗）</span></a></div></section>
      {:else}<main class="home-container py-12"><p role="status">{loadError || "準備示範院所中…"}</p></main>{/if}
    {/key}
  </div>
</div>
<Dialog.Dialog bind:open={resetOpen}><Dialog.DialogContent><Dialog.DialogHeader><Dialog.DialogTitle>重置這次示範？</Dialog.DialogTitle><Dialog.DialogDescription>會清除本分頁的示範預約與編輯，回到最初資料；不影響正式資料。</Dialog.DialogDescription></Dialog.DialogHeader><div class="flex flex-wrap justify-end gap-3"><Button variant="outline" class="min-h-11" onclick={() => resetOpen = false}>保留示範資料</Button><Button class="min-h-11" onclick={reset}>確認重置</Button></div></Dialog.DialogContent></Dialog.Dialog>

<style>
  .demo-scroll { container-type: size; }
  .demo-scroll :global(aside[id$="-desktop-sidebar"]) { height: 100cqh; }
</style>
