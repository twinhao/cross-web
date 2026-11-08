<script lang="ts">
  import { CALENDAR_HOUR_HEIGHT, CALENDAR_MINUTE_HEIGHT, calendarEvents } from "#lib/admin/appointment-calendar.ts";
  import { APPOINTMENT_STATUS_LABELS } from "#lib/constants/appointment.ts";
  const calendarGrid =
    `repeating-linear-gradient(to bottom, transparent 0px, transparent ${CALENDAR_HOUR_HEIGHT - 1}px, var(--border) ${CALENDAR_HOUR_HEIGHT - 1}px, var(--border) ${CALENDAR_HOUR_HEIGHT}px), repeating-linear-gradient(to bottom, transparent 0px, transparent ${CALENDAR_HOUR_HEIGHT / 2 - 1}px, color-mix(in oklab, var(--border) 45%, transparent) ${CALENDAR_HOUR_HEIGHT / 2 - 1}px, color-mix(in oklab, var(--border) 45%, transparent) ${CALENDAR_HOUR_HEIGHT / 2}px)`;
  import * as Card from "#lib/components/ui/card/index.ts";

  import type { ApiAppointment } from "#lib/types/clinic.ts";
  import {
    appointmentEnd,
    minutes,
    addDateDays,
  } from "#lib/admin/scheduling.ts";
  import StatusPill from "./StatusPill.svelte";
  let {
    appointments,
    staff,
    startDate,
    view,
    fallbackDuration,
    onSelect,
  }: {
    appointments: ApiAppointment[];
    staff: {id: string; name: string}[];
    startDate: string;
    view: "day" | "week";
    fallbackDuration: number;
    onSelect: (a: ApiAppointment) => void;
  } = $props();
  const groups = $derived(
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => ({
          id: addDateDays(startDate, i),
          label: addDateDays(startDate, i).slice(5),
          rows: appointments.filter(
            (a) =>
              a.appointment_date === addDateDays(startDate, i) &&
              a.status !== "cancelled",
          ),
        }))
      : [...staff.map(s => ({id: s.id, label: s.name})),
        ...(appointments.some(a => !a.staff_id) ? [{id: "none", label: "未指定人員"}] : [])].map(person => ({
          ...person,
          rows: appointments.filter(a => (a.staff_id ?? "none") === person.id && a.status !== "cancelled"),
        })),
  );
  const firstHour = $derived(
    Math.max(
      0,
      Math.min(
        8,
        ...appointments.map((a) =>
          Math.floor(minutes(a.appointment_time) / 60),
        ),
      ),
    ),
  );
  const lastHour = $derived(
    Math.min(
      24,
      Math.max(
        18,
        ...appointments.map((a) =>
          Math.ceil(
            (minutes(a.appointment_time) +
              (a.duration_minutes ?? fallbackDuration)) /
              60,
          ),
        ),
      ),
    ),
  );
  const dayGroups = $derived(groups.map(group => ({ ...group, events: calendarEvents(group.rows, fallbackDuration) })));
  function eventLabel(a: ApiAppointment) {
    return `${a.appointment_time.slice(0, 5)}–${appointmentEnd(a, fallbackDuration)} ${a.patient_name}，${a.service_name ?? "一般預約"}，${APPOINTMENT_STATUS_LABELS[a.status]}`;
  }
</script>

<p class="hidden text-xs text-muted-foreground md:block">
  時間表顯示已有預約，空白不代表可預約；新增時會核對班表、休假與名額。已取消的預約請切回清單查詢。
</p>
<Card.Root
  aria-label={view === "day" ? "依人員排列的當日時間表" : "七日預約行程"}
  class="hidden max-h-[42rem] gap-0 overflow-auto rounded-2xl py-0 shadow-sm md:block"
>
  {#if view === "week"}
    <div class="grid min-w-[70rem] grid-cols-7 divide-x">
      {#each groups as group (group.id)}<section class="min-w-0 p-3">
          <h3
            class="sticky top-0 z-10 -mx-3 -mt-3 mb-3 border-b bg-card p-3 font-semibold"
          >
            {group.label}
            <span class="text-xs text-muted-foreground">
              {group.rows.length} 筆
            </span>
          </h3>
          <div class="space-y-2">
            {#each group.rows as a (a.id)}<button
                class="block w-full space-y-1 rounded-xl border p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                onclick={() => onSelect(a)}
              >
                <p class="font-semibold tabular-nums">
                  {a.appointment_time.slice(0, 5)}–{appointmentEnd(
                    a,
                    fallbackDuration,
                  )}
                </p>
                <p class="truncate">{a.patient_name}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {a.service_name ?? "一般預約"} · {a.staff_name ?? "未指定"}
                </p>
                <StatusPill status={a.status} />
              </button>{:else}<p class="py-4 text-sm text-muted-foreground">
                無預約
              </p>{/each}
          </div>
        </section>{/each}
    </div>
  {:else}
    <div
      class="grid"
      style:grid-template-columns={"4.5rem repeat(" +
        Math.max(groups.length, 1) +
        ", minmax(16rem, 1fr))"}
    >
      <div
        class="sticky top-0 left-0 z-30 border-b bg-muted p-3 text-xs font-medium text-muted-foreground"
      >
        時間
      </div>
      {#each dayGroups as g (g.id)}<h3
          class="sticky top-0 z-20 flex min-w-0 items-center gap-2 border-b border-l bg-card px-3 py-3 font-semibold"
        >
          <span class="truncate">{g.label}</span><span class="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{g.rows.length} 筆</span>
        </h3>{/each}
      <div class="sticky left-0 z-10 bg-muted/60" style:height={(lastHour - firstHour) * CALENDAR_HOUR_HEIGHT + "px"}>
        {#each Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i) as hour (hour)}<span
            class="absolute right-3 text-[11px] font-medium tabular-nums text-muted-foreground"
            style:top={(hour - firstHour) * CALENDAR_HOUR_HEIGHT + 4 + "px"}
          >
            {String(hour).padStart(2, "0")}:00
          </span>{/each}
      </div>
      {#each dayGroups as g (g.id)}<div
          class="relative border-l"
          style:height={(lastHour - firstHour) * CALENDAR_HOUR_HEIGHT + "px"}
          style:background-image={calendarGrid}
        >
          {#if !g.rows.length}<p class="p-3 text-xs text-muted-foreground">無預約</p>{/if}
          {#each g.events as event (event.appointment.id)}
            {@const a = event.appointment}
            {@const compact = event.height < 44}
            <button
              type="button"
              class="calendar-event absolute flex min-w-0 flex-col overflow-hidden rounded-lg border border-primary/20 border-l-[3px] border-l-primary px-2 text-left shadow-xs transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              class:justify-center={compact}
              class:py-1={!compact}
              data-status={a.status}
              aria-label={eventLabel(a)}
              title={eventLabel(a)}
              style:top={(event.start - firstHour * 60) * CALENDAR_MINUTE_HEIGHT +
                "px"}
              style:left={`calc(${event.lane / event.lanes * 100}% + 4px)`}
              style:right={`calc(${(event.lanes - event.lane - 1) / event.lanes * 100}% + 4px)`}
              style:height={event.height + "px"}
              onclick={() => onSelect(a)}
            >
              <span class="flex w-full min-w-0 items-center gap-2 text-xs leading-4">
                <span class="shrink-0 font-medium tabular-nums">{a.appointment_time.slice(0, 5)}{#if !compact && event.lanes === 1}–{appointmentEnd(a, fallbackDuration)}{/if}</span>
                <span class="min-w-0 truncate font-semibold">{a.patient_name}</span>
              </span>
              {#if !compact}<span class="mt-0.5 flex w-full min-w-0 items-center gap-2 text-[11px] leading-4 text-muted-foreground">
                <span class="min-w-0 flex-1 truncate">{a.service_name ?? "一般預約"}</span>
                <span class="shrink-0">{APPOINTMENT_STATUS_LABELS[a.status]}</span>
              </span>{/if}
            </button>{/each}
        </div>{/each}
    </div>
  {/if}
</Card.Root>
<p class="text-sm text-muted-foreground md:hidden">
  手機以{view === "week" ? "七日" : "當日"}時間清單顯示，方便逐筆操作。
</p>

<style>
  .calendar-event {
    background: color-mix(in oklab, var(--primary) 5%, var(--card));
  }
  .calendar-event:hover {
    background: color-mix(in oklab, var(--primary) 12%, var(--card));
  }
  .calendar-event[data-status="checked_in"] {
    border-left-color: var(--chart-2);
  }
  .calendar-event[data-status="in_progress"] {
    border-left-color: var(--chart-3);
  }
  .calendar-event[data-status="completed"] {
    border-left-color: var(--muted-foreground);
    background: var(--muted);
  }
  .calendar-event[data-status="no_show"] {
    border-left-color: var(--destructive);
    background: color-mix(in oklab, var(--destructive) 6%, var(--card));
  }
</style>
