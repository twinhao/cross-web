<script lang="ts">
  import { untrack } from "svelte";
  import CalendarX2 from "@lucide/svelte/icons/calendar-x-2";
  import { parseDate, type DateValue } from "@internationalized/date";
  import { Calendar } from "#lib/components/ui/calendar/index.js";
  import { taipeiToday } from "#lib/constants/appointment.ts";
  import { inkOn } from "#lib/color-contrast.ts";
  import type { BookableDate } from "#lib/types/booking.ts";
  let { dates, selectedDate, onSelectDate, primaryColor = "#1d4ed8" }: {
    dates:BookableDate[]; selectedDate:string|null; onSelectDate:(date:string)=>void; primaryColor?:string;
  } = $props();
  const available = $derived(dates.filter(date => date.isAvailable));
  const min = $derived(dates.length ? parseDate(dates[0].date) : undefined);
  const max = $derived(dates.length ? parseDate(dates[dates.length - 1].date) : undefined);
  const value = $derived(selectedDate ? parseDate(selectedDate) : undefined);
  let placeholder = $state.raw<DateValue>(untrack(() => parseDate(selectedDate ?? dates.find(date => date.isAvailable)?.date ?? dates[0]?.date ?? taipeiToday())));
</script>
{#if available.length === 0}
  <div class="rounded-xl bg-muted/50 px-4 py-8 text-center"><CalendarX2 class="mx-auto mb-3 size-6 text-muted-foreground"/><p class="text-sm font-medium">暫無可預約日期</p><p class="mt-2 text-xs leading-5 text-muted-foreground">可以更換服務人員，或聯絡院所確認其他時間。</p></div>
{:else}
  <div class="mx-auto w-full max-w-[340px]" style={`--primary:${primaryColor};--primary-foreground:${inkOn(primaryColor)}`}>
    <Calendar type="single" {value} bind:placeholder locale="zh-TW" weekStartsOn={1} minValue={min} maxValue={max} isDateUnavailable={day => !available.some(date => date.date === day.toString())} onValueChange={day => { if (day) onSelectDate(day.toString()); }} class="w-full bg-transparent p-0 [--cell-radius:0.75rem] [--cell-size:1.75rem] sm:[--cell-size:2rem]"/>
  </div>
{/if}
