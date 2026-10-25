<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { Card } from "#lib/components/ui/card/index.js";
  import { formatAppointmentDateTime } from "#lib/booking/calendar.ts";
  import { inkOn } from "#lib/color-contrast.ts";
  import type { BookingResponse } from "#lib/types/booking.ts";
  let {booking,primaryColor="#1d4ed8"}:{booking:BookingResponse;primaryColor?:string}=$props();
  const formatted=$derived(formatAppointmentDateTime(booking.appointment_datetime));
</script>
<div class="space-y-6 px-4">
  <div class="space-y-3 py-4 text-center"><span class="mx-auto flex size-12 items-center justify-center rounded-full" style:background-color={primaryColor} style:color={inkOn(primaryColor)}><Check class="size-6"/></span><h1 class="text-2xl font-semibold tracking-tight">預約成功</h1><p class="text-sm leading-6 text-muted-foreground">已為你安排好時間，以下是本次預約資訊。</p><p class="text-xs text-muted-foreground">預約編號 <span class="font-mono text-foreground">{booking.booking_number}</span></p></div>
  <Card class="gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
    <div class="border-b p-5"><h2 class="font-semibold leading-6">{booking.clinic.name}</h2>{#if booking.clinic.address}<a href={`https://maps.google.com/?q=${encodeURIComponent(booking.clinic.address)}`} target="_blank" rel="noopener noreferrer" class="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground"><MapPin class="mt-0.5 size-3.5 shrink-0"/>{booking.clinic.address}</a>{/if}</div>
    <div class="border-b bg-muted/30 p-5"><p class="text-sm font-medium">{formatted.date}</p><p class="mt-1 text-3xl font-semibold tabular-nums">{formatted.time}</p></div>
    <dl class="space-y-5 p-5"><div><dt class="mb-1 text-xs text-muted-foreground">服務項目</dt><dd class="text-sm font-medium">{booking.service.name}</dd><dd class="mt-1 text-xs text-muted-foreground">約 {booking.service.duration_minutes} 分鐘</dd></div>{#if booking.doctor}<div><dt class="mb-1 text-xs text-muted-foreground">服務人員</dt><dd class="text-sm">{booking.doctor.name} {booking.doctor.title}</dd></div>{/if}<div><dt class="mb-1 text-xs text-muted-foreground">預約對象</dt><dd class="text-sm">{booking.patient_name}</dd></div>{#if booking.queue_number != null}<div class="flex items-center justify-between border-t pt-4"><dt class="text-sm text-muted-foreground">您的看診號</dt><dd class="text-base font-semibold tabular-nums">{booking.queue_number} 號</dd></div>{/if}</dl>
  </Card>
</div>
