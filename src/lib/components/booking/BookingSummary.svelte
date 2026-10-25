<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { Card } from "#lib/components/ui/card/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import { getServicePriceBadge } from "#lib/service-price.ts";
  import type { BookingSelection, ClinicConfig } from "#lib/types/booking.ts";
  import type { PaymentType } from "#lib/types/clinic.ts";
  let { clinic, selection, paymentType, onEdit, compact = false }: {
    clinic: ClinicConfig; selection: BookingSelection; paymentType?: PaymentType;
    onEdit?: (step: 1 | 2 | 3) => void; compact?: boolean;
  } = $props();
  const price = $derived(selection.service ? getServicePriceBadge(selection.service.price, paymentType, selection.service.show_price) : null);
  const date = $derived(selection.date ? new Intl.DateTimeFormat("zh-TW", {month:"long",day:"numeric",weekday:"long",timeZone:"Asia/Taipei"}).format(new Date(`${selection.date}T12:00:00+08:00`)) : null);
</script>

<Card class="gap-0 overflow-hidden rounded-2xl border-border/80 py-0 shadow-none">
  {#if !compact}
    <div class="border-b border-border/70 p-5">
      <p class="mb-3 text-xs font-medium text-muted-foreground">你的預約</p>
      <div class="flex items-start gap-3">
        {#if clinic.logo}<img src={clinic.logo} alt="" class="size-12 shrink-0 rounded-xl border bg-white object-contain" />{/if}
        <div class="min-w-0"><h2 class="text-sm leading-6 font-semibold break-words">{clinic.clinic_name}</h2>{#if clinic.address}<p class="mt-1 flex gap-1 text-xs leading-5 text-muted-foreground"><MapPin class="mt-0.5 size-3.5 shrink-0"/>{clinic.address}</p>{/if}</div>
      </div>
    </div>
  {/if}
  <div class="space-y-5 p-5">
    <div>
      <div class="mb-2 flex items-center justify-between gap-2"><p class="text-xs text-muted-foreground">服務項目</p>{#if onEdit && selection.service}<Button variant="link" size="sm" class="h-auto min-h-6 p-0 text-xs" onclick={() => onEdit?.(1)}>修改服務</Button>{/if}</div>
      <p class="text-sm font-semibold leading-6 break-words">{selection.service?.name ?? "尚未選擇服務"}</p>
      {#if selection.service}<p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock class="size-3.5" />約 {selection.service.duration_minutes} 分鐘</p>{/if}
    </div>
    <div class="border-t border-border/70 pt-4">
      <div class="mb-2 flex items-center justify-between gap-2"><p class="text-xs text-muted-foreground">預約時間</p>{#if onEdit && selection.date}<Button variant="link" size="sm" class="h-auto min-h-6 p-0 text-xs" onclick={() => onEdit?.(2)}>修改時間</Button>{/if}</div>
      <p class="text-sm leading-6 font-medium">{date ?? "選擇服務後，查看可約時間"}</p>
      {#if selection.timeSlot}<p class="mt-1 text-xl font-semibold tabular-nums">{selection.timeSlot.time}</p>{/if}
      {#if selection.service}<p class="mt-2 text-xs text-muted-foreground">{selection.doctor?.id ? selection.doctor.name : "不指定人員，由院所安排"}</p>{/if}
    </div>
    {#if price}<div class="flex items-center justify-between gap-3 border-t border-border/70 pt-4"><span class="text-xs text-muted-foreground">服務費用</span><strong class="text-base tabular-nums">{price.label}</strong></div>{/if}
  </div>
</Card>
