<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import type { ScheduleEntry, WeeklySchedule } from "#lib/types/schedule.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";
  import { SESSION_LABELS, timetableEntries } from "#lib/schedule-presets.ts";
  import { addDateDays } from "#lib/admin/scheduling.ts";
  import { taipeiToday } from "#lib/constants/appointment.ts";
  import { cn } from "#lib/utils.ts";
  import SectionCard from "./SectionCard.svelte";

  let { schedule, class: className }: { schedule: WeeklySchedule; class?: string } = $props();
  const days = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  const today = taipeiToday();
  let selectedDate = $state("");
  const dates = $derived(Array.from({ length: 7 }, (_, i) => addDateDays(schedule.week_start, i)));
  const entries = $derived(timetableEntries(schedule.entries));
  const activeDate = $derived(dates.includes(selectedDate) ? selectedDate : dates.includes(today) ? today : entries.find(entry => dates.includes(entry.date))?.date ?? dates[0]);
  const range = $derived(`${schedule.week_start.slice(5).replace("-", "/")} – ${schedule.week_end.slice(5).replace("-", "/")}`);

  // 同一完整班段只顯示一次時間；不同時間或休息前後仍分開呈現。
  function timeGroups(daily: ScheduleEntry[]) {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- 純函式的區域分組暫存，不跨響應式週期。
    const groups = new Map<string, { session: ScheduleEntry["session"]; start: string; end: string; staff: ScheduleEntry[] }>();
    for (const entry of daily) {
      const start = entry.start_time.slice(0, 5), end = entry.end_time.slice(0, 5);
      const key = `${entry.session}:${start}:${end}`;
      const group = groups.get(key) ?? { session: entry.session, start, end, staff: [] };
      group.staff.push(entry);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }
</script>

<SectionCard icon={CalendarDays} title="門診時刻表" class={cn("min-w-0 [&_h2]:whitespace-nowrap", className)}>
  {#snippet action()}
    <span class="shrink-0 text-[11px] text-muted-foreground tabular-nums sm:text-xs" aria-label={`${schedule.week_offset === 0 ? "本週 " : ""}${range}`}>{range}</span>
  {/snippet}
  {#if entries.length === 0}
    <div class="rounded-2xl bg-muted/40 px-4 py-8 text-center">
      <p class="text-sm font-medium">本週尚未提供門診排班</p>
      <p class="mt-2 text-xs leading-relaxed text-muted-foreground">請查看營業資訊，或聯絡院所確認服務時間。</p>
    </div>
  {:else}
    <Tabs.Root value={activeDate} onValueChange={value => selectedDate = value} class="gap-5">
      <Tabs.List aria-label="選擇服務日期" class="grid w-full min-w-0 grid-cols-7 gap-1 rounded-2xl border-0 bg-muted/60 p-1">
        {#each dates as date, i (date)}
          {@const hasSchedule = entries.some(entry => entry.date === date)}
          <Tabs.Trigger value={date} aria-label={`${date.slice(5).replace("-", "/")} ${days[i]}${date === today ? "，今天" : ""}${hasSchedule ? "，有班表" : "，未提供班表"}`} class="min-h-20 min-w-0 flex-col gap-1 rounded-xl px-0 py-2.5 transition-none hover:bg-background/70 data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground">
            <span class="text-[11px] font-normal sm:text-xs">{days[i]}</span>
            <span class="text-lg leading-6 font-semibold tabular-nums sm:text-xl">{Number(date.slice(8))}</span>
            <span class={cn("size-1 rounded-full", hasSchedule ? "bg-current opacity-60" : "bg-transparent")} aria-hidden="true"></span>
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
      {#each dates as date, i (date)}
        {@const daily = entries.filter(entry => entry.date === date)}
        <Tabs.Content value={date} class="min-w-0 @container">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              {Number(date.slice(5, 7))} 月 {Number(date.slice(8))} 日<span class="font-normal text-muted-foreground">{days[i]}</span>
              {#if date === today}<span class="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">今天</span>{/if}
            </h3>
            {#if daily.length > 0}<span class="text-xs text-muted-foreground">{new Set(daily.map(entry => entry.doctor_id)).size} 位服務人員</span>{/if}
          </div>
          {#if daily.length > 0}
            <ul aria-label="當日服務班表" class="divide-y divide-border/70 rounded-2xl border border-border/70 px-4 @sm:px-5">
              {#each timeGroups(daily) as [key, group] (key)}
                <li class="grid min-w-0 gap-3 py-4 @sm:grid-cols-[140px_minmax(0,1fr)] @sm:gap-5 @sm:py-5">
                  <div>
                    <p class="mb-1 text-[11px] font-medium text-muted-foreground">{SESSION_LABELS[group.session]}</p>
                    <p class="whitespace-nowrap text-base font-semibold tracking-tight tabular-nums">{group.start}–{group.end}</p>
                  </div>
                  <ul aria-label="服務人員" class="flex min-w-0 flex-wrap items-start gap-x-5 gap-y-3">
                    {#each group.staff as person, j (j)}
                      <li class="min-w-0 max-w-full">
                        <p class="break-words text-sm font-medium leading-6">{person.doctor_name}</p>
                        {#if person.department}<p class="break-words text-xs leading-5 text-muted-foreground">{person.department}</p>{/if}
                      </li>
                    {/each}
                  </ul>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="rounded-2xl bg-muted/40 px-4 py-8 text-center">
              <CalendarDays class="mx-auto mb-3 size-6 text-muted-foreground/60" aria-hidden="true" />
              <p class="text-sm font-medium">本日未提供班表</p>
              <p class="mt-2 text-xs leading-relaxed text-muted-foreground">可切換其他日期，或聯絡院所確認。</p>
            </div>
          {/if}
        </Tabs.Content>
      {/each}
    </Tabs.Root>
    <p class="mt-4 text-xs leading-relaxed text-muted-foreground">以上為人員服務時間；實際可約時段與名額，請於預約時確認。</p>
  {/if}
</SectionCard>
