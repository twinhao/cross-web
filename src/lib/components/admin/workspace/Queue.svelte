<script lang="ts">
  import { getAuth } from "#lib/auth/auth.svelte.ts";
  import { canOperateFacility } from "#lib/auth/roles.ts";
  import { SvelteURL } from "svelte/reactivity";
  import { onMount, tick, untrack } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { ArrowUpRight, RefreshCw, CalendarDays } from "@lucide/svelte";
  import DateInput from "#lib/components/ui/date-input/DateInput.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";
  import AdminSkeleton from "../layout/AdminSkeleton.svelte";
  import AdminEmpty from "../layout/AdminEmpty.svelte";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import { canAccessFeature } from "#lib/feature-access.ts";
  import { subscriptionWarning } from "#lib/admin/subscription.ts";
  import { apiMessage, validDate } from "#lib/admin/scheduling.ts";
  import { clinicHref } from "#lib/admin/workspace.ts";
  import { receptionGroup } from "#lib/admin/queue.ts";
  import { taipeiToday } from "#lib/constants/appointment.ts";
  import type { MedicalFacility, QueueBoard, QueueGroup, QueueAppointmentItem } from "#lib/types/clinic.ts";
  import Feedback from "../manage/Feedback.svelte";

  let { facility, subscriptionHref = "/admin/subscription" }: { facility: MedicalFacility; subscriptionHref?: string } = $props();
  const auth = getAuth(), instanceId = $props.id();
  const canOperate = $derived(canOperateFacility(auth.user, facility.id));
  const allowed = $derived(canAccessFeature(facility, "queue_management"));
  let today = $state(taipeiToday());
  const date = $derived(validDate(page.url.searchParams.get("queue_date"), today));
  const view = $derived(page.url.searchParams.get("queue_view") === "arrivals" ? "arrivals" : "service");
  const focusId = $derived(page.url.searchParams.get("queue_focus") ?? "");
  const live = $derived(date === today);
  let board = $state<QueueBoard | null>(null), error = $state(""), loading = $state(false),
    revision = $state(0), pending = $state(""), message = $state(""), updated = $state(""),
    chooseDate = $state(false), finishing = $state<QueueAppointmentItem | null>(null);
  let generation = 0, scope = "", focused = "";
  const groups = $derived((board?.groups ?? []).map(receptionGroup));
  const arrivals = $derived(groups.reduce((sum, group) => sum + group.arrivals.length, 0));
  const activeCount = $derived(groups.reduce((sum, group) => sum + group.waiting.length + group.serving.length, 0));
  const ended = $derived(groups.reduce((sum, group) => sum + group.ended.length, 0));
  const disabled = $derived(!!pending || loading || !!error || !live);
  const recordsHref = $derived(clinicHref(facility.id, "appointments", { start: date, end: date, view: "list" }));

  async function load(id: string, day: string) {
    const request = ++generation; loading = true; error = "";
    try {
      const result = await adminClinicsApi.queue.list(id, day);
      if (request !== generation) return;
      board = result;
      if (finishing) {
        const latest = result.groups.flatMap(group => group.appointments).find(appointment => appointment.id === finishing?.id);
        if (latest?.status === "in_progress") finishing = latest;
        else { finishing = null; message = "服務狀態已更新，請核對最新名單。"; }
      }
      updated = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    } catch (e) { if (request === generation) error = apiMessage(e, "接待名單載入失敗，請重新讀取"); }
    finally { if (request === generation) loading = false; }
  }
  $effect(() => {
    const day = date, id = facility.id, r = revision; void r;
    if (!allowed || !canOperate) return;
    untrack(() => {
      const nextScope = `${id}:${day}`;
      if (scope !== nextScope) { scope = nextScope; board = null; updated = ""; message = ""; finishing = null; focused = ""; }
      void load(id, day);
    });
    return () => { generation++; };
  });
  onMount(() => {
    if (!canOperate) return;
    const refresh = () => {
      today = taipeiToday();
      if (document.visibilityState === "visible" && !pending && !loading && !finishing) revision++;
    };
    const timer = setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  });
  $effect(() => {
    const id = focusId, pane = view, ready = !!board && !loading;
    const key = `${date}:${pane}:${id}`;
    if (!id || !ready || focused === key) return;
    untrack(() => { void tick().then(() => {
      const element = document.getElementById(`${instanceId}-${id}`);
      if (element) { focused = key; element.scrollIntoView({ block: "center" }); element.focus({ preventScroll: true }); }
    }); });
  });
  function setView(value: string) {
    if (!["arrivals", "service"].includes(value) || value === view) return;
    const url = new SvelteURL(page.url.href); url.searchParams.set("queue_view", value);
    void goto(url, { reset: false });
  }
  function setDate(value: string) {
    if (!value || pending) return;
    const url = new SvelteURL(page.url.href); url.searchParams.set("queue_date", value); url.searchParams.delete("queue_focus");
    void goto(url, { replace: true, reset: false });
  }
  function appointmentHref(appointment: QueueAppointmentItem) {
    return clinicHref(facility.id, "appointments", { start: date, end: date, view: "list", appointment: appointment.id });
  }
  async function act(kind: "check-in" | "call-next" | "complete", appointment: QueueAppointmentItem, group?: QueueGroup) {
    if (disabled || !canOperate) return;
    if (date !== taipeiToday()) { today = taipeiToday(); error = "現場操作請回到今天的接待名單。"; return; }
    const id = facility.id, day = date;
    pending = `${kind}:${appointment.id}`; error = ""; message = "";
    try {
      let success = "";
      if (kind === "check-in") {
        await adminClinicsApi.queue.checkIn(id, appointment.id);
        success = `${appointment.patient_name} 已報到，請至「候診與服務」查看。`;
      } else if (kind === "complete") {
        await adminClinicsApi.appointments.update(id, appointment.id, { status: "completed" });
        success = `${appointment.patient_name} 的服務已完成。`;
      } else {
        const result = await adminClinicsApi.queue.callNext(id, { date: day, staff_id: group!.staff_id, require_idle: true, expected_appointment_id: appointment.id });
        const called = result.called;
        success = called ? `已叫到${called.queue_number == null ? "" : ` ${called.queue_number} 號：`}${called.patient_name}，列為服務中。` : "叫號已完成，請核對最新名單。";
      }
      if (facility.id !== id || date !== day) return;
      if (kind === "complete") finishing = null;
      focused = ""; message = success; await load(id, day);
    } catch (e) { if (facility.id === id && date === day) error = apiMessage(e, "操作未完成，請重新讀取名單後確認"); }
    finally { pending = ""; }
  }
</script>

{#snippet person(appointment: QueueAppointmentItem)}
  <div class="min-w-0 flex-1"><a href={appointmentHref(appointment)} aria-label={`查看${appointment.patient_name}的預約`} class="inline-flex max-w-full items-center gap-1 font-medium hover:text-primary hover:underline"><span class="break-words">{appointment.patient_name}</span><ArrowUpRight class="size-3 shrink-0 text-muted-foreground" /></a><p class="mt-1 text-xs leading-5 text-muted-foreground">預約 {appointment.appointment_time.slice(0, 5)} · {appointment.service_name ?? "一般預約"}</p></div>
{/snippet}
{#snippet number(appointment: QueueAppointmentItem)}<span class="grid size-11 shrink-0 place-items-center rounded-xl bg-muted/50 text-lg font-semibold tabular-nums" aria-label={appointment.queue_number == null ? "尚未配號" : `${appointment.queue_number} 號`}>{appointment.queue_number ?? "—"}</span>{/snippet}

<div class="min-w-0 space-y-5 break-words">
  <div class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold tracking-tight">叫號與報到</h1><p class="mt-2 text-sm leading-6 text-muted-foreground">現場報到、叫號與完成服務集中在這裡。改期、取消與完整紀錄請至預約管理。</p></div><Button href={recordsHref} variant="outline" class="min-h-11">預約與紀錄<ArrowUpRight class="size-4" /></Button></div>
  {#if !canOperate}<p class="rounded-xl border p-4 text-sm text-muted-foreground">叫號與報到需由櫃檯人員或院所管理員操作；目前帳號可從預約管理查看服務狀態。</p>
  {:else if !allowed}<Card.Root class="gap-0 space-y-3 p-6 shadow-sm"><h2 class="font-semibold">叫號與報到需標準方案以上</h2><p class="text-sm text-muted-foreground">{subscriptionWarning(facility) ?? "請至訂閱頁查看開通條件。"}</p><Button href={subscriptionHref}>查看我的訂閱</Button></Card.Root>
  {:else}
    <div class="flex flex-wrap items-center gap-2"><p class="mr-auto text-sm font-medium">{live ? "今天 · " : "接待紀錄 · "}{date}</p><Button variant="ghost" class="min-h-11" onclick={() => chooseDate = !chooseDate} disabled={!!pending}><CalendarDays class="size-4" />查詢日期</Button>{#if !live}<Button variant="outline" class="min-h-11" disabled={!!pending} onclick={() => setDate(taipeiToday())}>回到今天</Button>{/if}<Button variant="outline" size="icon" class="size-11" disabled={loading || !!pending} aria-label="重新讀取接待名單" onclick={() => revision++}><RefreshCw class="size-4" /></Button></div>
    {#if chooseDate}<div class="flex flex-wrap items-center gap-3"><label for={`${instanceId}-date`} class="text-sm">接待日期</label><DateInput id={`${instanceId}-date`} value={date} onchange={event => setDate(event.currentTarget.value)} disabled={!!pending} class="w-44" /></div>{/if}
    {#if !live}<p role="status" class="rounded-xl border bg-muted/30 p-3 text-sm">目前為日期查詢，現場操作請回到今天。已結束紀錄可從「預約與紀錄」查看。</p>{/if}
    {#if error}<div role="alert" class="space-y-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><p>{error}</p>{#if board}<p>以下保留上次名單，重新讀取成功後才能繼續操作。</p>{/if}<Button variant="outline" class="min-h-11" disabled={loading || !!pending} onclick={() => revision++}>重新讀取名單</Button></div>{/if}
    {#if message}<p role="status" class="rounded-xl bg-primary/10 p-3 text-sm">{message}</p>{/if}
    <Tabs.Root value={view} onValueChange={setView} class="gap-4">
      <Tabs.List aria-label="接待階段" class="grid h-auto w-full grid-cols-2 p-1"><Tabs.Trigger value="arrivals" class="min-h-11">待報到<span aria-hidden="true" class="ml-1 tabular-nums">{board ? arrivals : "—"}</span></Tabs.Trigger><Tabs.Trigger value="service" class="min-h-11">候診與服務<span aria-hidden="true" class="ml-1 tabular-nums">{board ? activeCount : "—"}</span></Tabs.Trigger></Tabs.List>
      <Tabs.Content value="arrivals" class="space-y-4">
        {#if view === "arrivals"}
          {#if loading && !board}<AdminSkeleton label="載入待報到名單…" variant="list" />
          {:else if board}
            {#each groups.filter(group => group.arrivals.length) as group (group.staff_id ?? "none")}<Card.Root class="gap-0 overflow-hidden py-0 shadow-sm"><div class="flex justify-between gap-3 border-b px-4 py-4"><h2 class="font-semibold">{group.staff_name ?? "未指定人員"}</h2><span class="text-sm text-muted-foreground">待報到 {group.arrivals.length} 位</span></div><ul class="divide-y divide-border/60" aria-label={`${group.staff_name ?? "未指定人員"}待報到名單`}>{#each group.arrivals as appointment (appointment.id)}<li id={`${instanceId}-${appointment.id}`} tabindex="-1" class="flex items-center gap-3 p-4 outline-none focus:ring-2 focus:ring-inset focus:ring-primary {focusId === appointment.id ? 'bg-primary/5' : ''}">{@render person(appointment)}<Button class="min-h-11" disabled={disabled} aria-label={`為${appointment.patient_name}報到`} onclick={() => act("check-in", appointment)}>{pending === `check-in:${appointment.id}` ? "報到中…" : "報到"}</Button></li>{/each}</ul></Card.Root>
            {:else}{#if !error}<AdminEmpty title="目前沒有待報到的客戶" description="已報到的客戶會移至候診與服務，已結束紀錄保留在預約管理。" />{/if}{/each}
          {/if}
        {/if}
      </Tabs.Content>
      <Tabs.Content value="service" class="space-y-4">
        {#if view === "service"}
          {#if loading && !board}<AdminSkeleton label="載入候診與服務進度…" variant="cards" />
          {:else if board}
            {#each groups.filter(group => group.waiting.length || group.serving.length) as group (group.staff_id ?? "none")}<Card.Root class="gap-0 overflow-hidden py-0 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4"><h2 class="font-semibold">{group.staff_name ?? "未指定人員"}</h2><p class="text-sm text-muted-foreground">候診 {group.waiting.length} 位 · 服務中 {group.serving.length} 位</p></div>
              <div class="space-y-3 p-4"><h3 class="text-sm font-medium">服務中</h3>{#each group.serving as appointment (appointment.id)}<div id={`${instanceId}-${appointment.id}`} tabindex="-1" class="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 outline-none focus:ring-2 focus:ring-primary">{@render number(appointment)}{@render person(appointment)}<Button variant="outline" class="min-h-11" disabled={disabled} aria-label={`完成${appointment.patient_name}的服務`} onclick={() => finishing = appointment}>完成服務</Button></div>{:else}<p class="text-sm text-muted-foreground">目前沒有服務中的客戶。</p>{/each}</div>
              <div class="border-t p-4"><h3 class="mb-3 text-sm font-medium">候診中</h3><p class="mb-3 text-xs leading-5 text-muted-foreground">依號碼先後叫號，尚未報到的預約不列入候診。</p><ul class="space-y-2" aria-label={`${group.staff_name ?? "未指定人員"}候診名單`}>{#each group.waiting as appointment, index (appointment.id)}<li id={`${instanceId}-${appointment.id}`} tabindex="-1" class="flex flex-wrap items-center gap-3 rounded-xl border p-3 outline-none focus:ring-2 focus:ring-primary {focusId === appointment.id ? 'border-primary/40 bg-primary/5' : ''}">{@render number(appointment)}{@render person(appointment)}{#if index === 0}<Button class="min-h-11" disabled={disabled || !!group.serving.length} aria-label={`叫${appointment.patient_name}開始服務`} onclick={() => act("call-next", appointment, group)}>{pending.startsWith('call-next:') ? "叫號中…" : "叫下一位"}</Button>{/if}</li>{:else}<li class="py-2 text-sm text-muted-foreground">目前沒有已報到的候診客戶。</li>{/each}</ul>{#if group.serving.length && group.waiting.length}<p class="mt-3 text-xs leading-5 text-muted-foreground">請先完成目前服務，再叫下一位；叫號後會列為服務中。</p>{/if}</div>
            </Card.Root>{:else}{#if !error}<AdminEmpty title="目前沒有候診或服務中的客戶" description="到院後先報到，客戶就會出現在這裡。">{#if arrivals}<Button class="min-h-11" onclick={() => setView('arrivals')}>前往報到</Button>{/if}</AdminEmpty>{/if}{/each}
          {/if}
        {/if}
      </Tabs.Content>
    </Tabs.Root>
    <p class="text-xs leading-5 text-muted-foreground">每 10 秒更新{updated ? ` · 最後更新 ${updated}` : ""}{ended ? ` · 本日已結束 ${ended} 筆，請至預約與紀錄查詢` : ""}</p>
  {/if}
</div>
<Dialog.Root open={!!finishing} onOpenChange={value => { if (!value && !pending) finishing = null; }}>
  <Dialog.Content class="admin-dialog" showCloseButton={!pending} onInteractOutside={event => { if (pending) event.preventDefault(); }} onEscapeKeydown={event => { if (pending) event.preventDefault(); }}>
    <Dialog.Header><Dialog.Title>確認完成服務</Dialog.Title><Dialog.Description>{finishing?.patient_name} · {date} {finishing?.appointment_time.slice(0, 5)}。確認實際服務已結束後，再完成這筆紀錄。</Dialog.Description></Dialog.Header>
    {#if error}<Feedback {error} /><Button variant="outline" class="min-h-11" disabled={loading || !!pending} onclick={() => revision++}>重新讀取名單</Button>{/if}
    <Dialog.Footer class="admin-dialog-footer"><Button variant="outline" class="min-h-11" disabled={!!pending} onclick={() => finishing = null}>返回現場接待</Button><Button class="min-h-11" disabled={disabled} onclick={() => finishing && act("complete", finishing)}>{pending ? "處理中…" : "確認完成服務"}</Button></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
