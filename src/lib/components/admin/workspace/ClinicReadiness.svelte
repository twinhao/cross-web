<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { CircleCheck, CircleHelp, ArrowUpRight } from "@lucide/svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import { bookingApi } from "#lib/api/booking.ts";
  import {
    loadBookingCatalog,
    clinicHref,
    type BookingCatalog,
  } from "#lib/admin/workspace.ts";
  import { canAccessFeature } from "#lib/feature-access.ts";
  import type { MedicalFacility } from "#lib/types/clinic.ts";
  import { inDemoContext } from "#lib/demo/context.ts";
  const demoSession = inDemoContext();
  let {
    facility,
    subscriptionHref,
  }: { facility: MedicalFacility; subscriptionHref: string } = $props();
  let catalog = $state.raw<BookingCatalog | null>(null);
  let busy = $state(false),
    error = $state(""),
    checked = $state(false);
  let scheduleCount = $state<number | null>(null);
  let slotsAvailable = $state<boolean | null>(null);
  let slotsError = $state(false);
  let expanded = $state(true);
  let preferredExpanded: boolean | null = null;
  const preferenceKey = $derived(`cross:clinic-readiness:${facility.id}`);
  onMount(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      preferredExpanded = saved === "open" ? true : saved === "closed" ? false : null;
      if (preferredExpanded !== null) expanded = preferredExpanded;
    } catch { /* 儲存不可用時維持自動展開規則。 */ }
    void refresh();
  });
  function rememberExpansion() {
    preferredExpanded = !expanded;
    try { localStorage.setItem(preferenceKey, preferredExpanded ? "open" : "closed"); }
    catch { /* 收合偏好不影響設定檢查。 */ }
  }
  let active = true;
  onDestroy(() => {
    active = false;
  });
  const online = $derived(canAccessFeature(facility, "online_booking"));
  const hasPair = $derived(
    !!catalog &&
      catalog.staff.some(
        (staff) =>
          staff.is_public_visible &&
          catalog!.assignments[staff.id]?.some((id) =>
            catalog!.services.some((service) => service.id === id),
          ),
      ),
  );
  async function refresh() {
    if (busy) return;
    busy = true;
    error = "";
    checked = false;
    slotsAvailable = null;
    slotsError = false;
    scheduleCount = null;
    catalog = null;
    try {
      const day = (offset: number) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Taipei",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(Date.now() + offset * 86400000));
      const [data, schedules] = await Promise.all([
        loadBookingCatalog(facility.id),
        adminClinicsApi.schedules.listAll(facility.id, {
          start_date: day(0),
          end_date: day(30),
        }),
      ]);
      if (!active) return;
      catalog = data;
      scheduleCount = schedules.length;
      if (facility.is_active && online && data.services.length) {
        let cursor = 0,
          found = false,
          failed = false;
        await Promise.all(
          Array.from(
            { length: Math.min(3, data.services.length) },
            async () => {
              while (!found && cursor < data.services.length && active) {
                const service = data.services[cursor++];
                try {
                  const dates = await bookingApi.getAvailableSlots(
                    facility.id,
                    service.id,
                    null,
                  );
                  if (
                    dates.some((date) =>
                      date.slots.some((slot) => slot.isAvailable),
                    )
                  )
                    found = true;
                } catch {
                  failed = true;
                }
              }
            },
          ),
        );
        if (!active) return;
        slotsAvailable = found ? true : failed ? null : false;
        slotsError = failed && !found;
      }
      checked = true;
    } catch {
      if (active) error = "無法取得完整設定狀態，請重試。";
    } finally {
      if (active) {
        busy = false;
        expanded = preferredExpanded ?? (!!error || items.some((item) => item.done !== true));
      }
    }
  }
  const items = $derived([
    {
      title: "院所介紹與 Logo",
      done: !!(facility.description?.trim() && facility.logo_url),
      text: "讓客人認識院所與品牌。",
      href: clinicHref(facility.id, "info"),
    },
    {
      title: "公開上架狀態",
      done: facility.is_active,
      text: facility.is_active
        ? "院所已啟用，可查看公開頁。"
        : "尚未啟用，請確認審核進度或院所停用狀態。",
      href: clinicHref(facility.id, "info"),
    },
    {
      title: "啟用服務項目",
      done: checked ? !!catalog?.services.length : null,
      text: "確認諮詢／療程、時長與價格公開設定。",
      href: clinicHref(facility.id, "services"),
    },
    {
      title: "可預約人員與服務對應",
      done: checked ? hasPair : null,
      text: "確認對外公開且可接受預約的人員，並指定可提供的服務。",
      href: clinicHref(facility.id, "personnel"),
    },
    {
      title: "未來 30 天班表",
      done: checked ? !!scheduleCount : null,
      text: "排班後仍須確認休假、營業時間及剩餘名額。",
      href: clinicHref(facility.id, "schedule"),
    },
    {
      title: "線上預約方案",
      done: online,
      text: online
        ? "目前具線上預約功能資格。"
        : "免費版可展示門面與處理電話／現場代訂；線上預約需有效方案或試用資格。",
      href: subscriptionHref,
    },
    {
      title: "實際可預約時段",
      done: slotsAvailable,
      text:
        !facility.is_active || !online
          ? "院所啟用並具方案資格後才能檢查。"
          : slotsError
            ? "時段讀取失敗，請重新檢查。"
            : slotsAvailable === false
              ? "目前查詢範圍內沒有可預約時段，請確認服務、人員與班表。"
              : slotsAvailable
                ? "已找到可預約時段；名額以客人送出時為準。"
                : "檢查服務、人員、休假與剩餘名額後的實際結果。",
      href: slotsAvailable === false ? clinicHref(facility.id, "schedule") : demoSession ? "/demo" : `/clinic/${facility.id}`,
    },
  ]);
  const actionLabels: Record<string, string> = {
    "院所介紹與 Logo": "完善院所門面",
    "公開上架狀態": "查看上架狀態",
    "啟用服務項目": "設定服務項目",
    "可預約人員與服務對應": "設定人員與服務",
    "未來 30 天班表": "安排未來班表",
    "線上預約方案": "查看開通方案",
    "實際可預約時段": "檢查班表與限制",
  };
  const confirmedCount = $derived(items.filter((item) => item.done === true).length);
  const nextStep = $derived(!busy && !error && checked ? items.find((item) => item.done === false) : undefined);
  const status = $derived(busy ? "正在檢查上線設定" : error ? "設定狀態尚未確認" :
    !facility.is_active ? "院所尚未公開上架" : !online ? "門面已上架，線上預約尚未開通" :
    slotsError ? "可預約時段尚未確認" : slotsAvailable === true ? "已找到可線上預約的時段" : "線上預約仍有設定待完成");
</script>

<section aria-label="院所上線準備" class="rounded-2xl border border-border bg-card p-4 sm:p-5">
  <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold" role="status">{status}</p>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        {#if busy}正在核對門面、方案與排班，請稍候。
        {:else if error}暫時無法確認完整設定，請重新檢查。
        {:else}已確認 {confirmedCount} / {items.length} 項。門面上架與線上預約可分階段完成。{/if}
      </p>
    </div>
    <Button href={demoSession ? "/demo" : `/clinic/${facility.id}`} target="_blank" rel="noopener noreferrer" variant="outline" class="min-h-11 w-full sm:w-auto">
      查看客人看到的門面<ArrowUpRight class="size-4" /><span class="sr-only">（另開視窗）</span>
    </Button>
  </div>
  <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="上線設定已確認項目" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={busy ? undefined : confirmedCount} aria-valuetext={busy ? "正在檢查" : `已確認 ${confirmedCount} / ${items.length} 項`}>
    <div class="h-full rounded-full bg-primary transition-[width]" style:width={`${confirmedCount / items.length * 100}%`}></div>
  </div>
  {#if nextStep}
    <div role="group" aria-label="下一步設定" class="mt-4 flex flex-col gap-3 rounded-xl bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0"><p class="text-sm font-semibold">下一步：{nextStep.title}</p><p class="mt-1 text-sm leading-6 text-muted-foreground">{nextStep.text}</p></div>
      <Button href={nextStep.href} class="min-h-11 shrink-0">{actionLabels[nextStep.title]}</Button>
    </div>
  {/if}
  {#if error}<p role="alert" class="mt-4 text-sm text-destructive">{error}</p>{/if}
  <div class="mt-2 flex flex-wrap items-center gap-3">
    <Button variant="ghost" size="sm" class="min-h-11" disabled={busy} onclick={refresh}>{busy ? "正在檢查…" : "重新檢查設定"}</Button>
  </div>
  <details bind:open={expanded} class="mt-2 border-t pt-4">
    <summary class="min-h-11 cursor-pointer py-3 text-sm font-semibold" onclick={rememberExpansion}>院所門面與預約上線檢查</summary>
    <div class="mt-4 space-y-4">
      <p class="text-sm leading-6 text-muted-foreground">先完成公開門面，再確認線上預約。帳號開通、院所上架與可預約時段是不同狀態。</p>
      <ul class="grid gap-3 lg:grid-cols-2" aria-busy={busy}>
        {#each items as item (item.title)}
          <li class="flex items-start gap-3 rounded-xl border p-4">
            {#if item.done}<CircleCheck class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />{:else}<CircleHelp class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />{/if}
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{item.title}<span class="ml-2 text-xs font-normal text-muted-foreground">{item.done === true ? "已確認" : item.done === false ? "待處理" : "待確認"}</span></p>
              <p class="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
              <a href={item.href} class="mt-1 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">{item.title === "實際可預約時段" && slotsAvailable === true ? "查看預約方式" : actionLabels[item.title]}</a>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  </details>
</section>
