<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import type { WeeklySchedule } from "#lib/types/schedule.ts";
  import { SESSION_KEYS, SESSION_LABELS, timetableEntries } from "#lib/schedule-presets.ts";
  import { addDateDays } from "#lib/admin/scheduling.ts";
  import { taipeiToday } from "#lib/constants/appointment.ts";
  import { cn } from "#lib/utils.ts";
  import SectionCard from "./SectionCard.svelte";
  let { schedule, class: className }: { schedule: WeeklySchedule; class?: string } = $props();
  const days = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  const today = taipeiToday();
  const dates = $derived(Array.from({length: 7}, (_,i) => addDateDays(schedule.week_start, i)));
  const entries = $derived(timetableEntries(schedule.entries));
  const range = $derived(`${schedule.week_start.slice(5).replace("-", "/")} – ${schedule.week_end.slice(5).replace("-", "/")}`);
</script>

<SectionCard icon={CalendarDays} title="門診時刻表" class={className}>
  {#snippet action()}
    <span class="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">{schedule.week_offset === 0 ? "本週 " : ""}{range}</span>
  {/snippet}
  <p class="mb-4 text-xs leading-relaxed text-muted-foreground">以下為人員服務班表；實際可約時間與剩餘名額，請於預約時確認。</p>
  {#if entries.length === 0}
    <div class="rounded-xl bg-muted/40 px-4 py-8 text-center">
      <p class="text-sm font-medium">本週尚未提供門診排班</p>
      <p class="mt-1 text-xs text-muted-foreground">請查看營業資訊，或聯絡院所確認服務時間。</p>
    </div>
  {:else}
    <div class="space-y-3 md:hidden" aria-label="每日服務班表">
      {#each dates as date, i (date)}
        {@const daily = entries.filter(entry => entry.date === date)}
        <div class={cn("overflow-hidden rounded-xl border", date === today && "border-primary/35")}>
          <div class={cn("flex items-center gap-2 px-3 py-2 text-sm font-semibold", date === today ? "bg-primary/10 text-primary" : "bg-muted/60")}>
            {days[i]} <span class="font-normal tabular-nums">{date.slice(5).replace("-", "/")}</span>
            {#if date === today}<span class="ml-auto text-xs">今天</span>{/if}
          </div>
          <div class="space-y-2 p-3">
            {#each daily as entry, j (j)}
              <div class="flex items-start justify-between gap-3 text-sm">
                <div class="min-w-0"><p class="break-words font-medium">{entry.doctor_name}</p>{#if entry.department}<p class="text-xs text-muted-foreground">{entry.department}</p>{/if}</div>
                <div class="shrink-0 text-right"><p class="font-semibold tabular-nums">{entry.start_time.slice(0,5)}–{entry.end_time.slice(0,5)}</p><p class="text-xs text-muted-foreground">{SESSION_LABELS[entry.session]}</p></div>
              </div>
            {:else}<p class="text-xs text-muted-foreground">本日未提供班表</p>{/each}
          </div>
        </div>
      {/each}
    </div>
    <div class="hidden overflow-x-auto rounded-xl border md:block">
      <table class="w-full min-w-[760px] table-fixed text-center text-xs" aria-label="每週服務班表">
        <thead class="bg-muted/60"><tr><th scope="col" class="w-16 p-3">時段</th>{#each dates as date, i (date)}<th scope="col" class={cn("p-3 font-semibold", date === today && "bg-primary/10 text-primary")}>{days[i]}<span class="mt-1 block font-normal tabular-nums">{date.slice(5).replace("-", "/")}</span></th>{/each}</tr></thead>
        <tbody>{#each SESSION_KEYS as key (key)}<tr class="border-t"><th scope="row" class="bg-muted/40 p-2 font-medium">{SESSION_LABELS[key]}</th>{#each dates as date (date)}<td class={cn("border-l p-2 align-top", date === today && "bg-primary/5")}>
          {#each entries.filter(entry => entry.date === date && entry.session === key) as entry, j (j)}<div class="mb-2 rounded-lg border bg-card px-1.5 py-2 last:mb-0"><p class="break-words font-medium" title={entry.department}>{entry.doctor_name}</p><p class="mt-1 whitespace-nowrap text-[11px] font-medium text-muted-foreground tabular-nums">{entry.start_time.slice(0,5)}–{entry.end_time.slice(0,5)}</p></div>{:else}<span class="block py-3 text-muted-foreground" aria-label="未提供班表">—</span>{/each}
        </td>{/each}</tr>{/each}</tbody>
      </table>
    </div>
  {/if}
</SectionCard>
