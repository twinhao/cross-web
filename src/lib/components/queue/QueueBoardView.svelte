<script lang="ts">
  import type { DisplayBoard } from "#lib/types/clinic.ts";
  let { board, embedded = false }: { board: DisplayBoard; embedded?: boolean } = $props();
</script>

{#if !board.enabled}
  <div class={`flex flex-col items-center justify-center gap-3 px-6 text-center ${embedded ? 'min-h-96' : 'min-h-screen'}`}>
    <p class="text-2xl font-semibold">此院所尚未開通候診看板</p>
    <p class="text-muted-foreground">候診室大螢幕為「專業方案」功能，升級後即可啟用。</p>
  </div>
{:else}
  <main class={`flex flex-col px-4 py-5 sm:px-10 ${embedded ? 'min-h-[calc(100dvh-var(--demo-header-height))]' : 'min-h-screen'}`}>
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
      <div><h1 class="text-2xl font-bold sm:text-3xl">{board.facility_name ?? '候診叫號'}</h1><p class="text-sm text-muted-foreground">候診叫號看板</p></div>
      <span class="text-sm text-muted-foreground">● 每 10 秒自動更新</span>
    </header>
    {#if board.groups.length === 0}
      <p class="flex flex-1 items-center justify-center py-16 text-2xl text-muted-foreground">目前無候診者</p>
    {:else}
      <div class="mt-6 grid flex-1 auto-rows-min gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {#each board.groups as group, index (index)}
          <section aria-label={`${group.staff_name ?? '不指定醫師'}候診名單`} class="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
              <h2 class="min-w-0 break-words text-xl font-bold">{group.staff_name ?? '不指定醫師'}</h2>
              <div class="flex gap-4 text-sm text-muted-foreground"><span>候診 {group.waiting_count}</span>{#if group.estimated_wait_minutes != null && group.waiting_count > 0}<span>約 {group.estimated_wait_minutes} 分</span>{/if}</div>
            </header>
            <div class="flex flex-col items-center gap-1 py-6"><p class="text-sm text-muted-foreground">目前叫號</p><p aria-label={`目前叫號 ${group.current_number ?? '無'}`} class="text-7xl font-black leading-none text-primary tabular-nums">{group.current_number ?? '—'}</p></div>
            <div class="border-t border-border/60">
              {#if group.appointments.length === 0}<p class="px-6 py-4 text-center text-sm text-muted-foreground">目前無候診者</p>
              {:else}
                <ul class="divide-y divide-border/40">
                  {#each group.appointments as appointment, appointmentIndex (appointmentIndex)}
                    <li class={`flex items-center justify-between gap-3 px-5 py-3 sm:px-6 ${appointment.status === 'in_progress' ? 'bg-primary/5' : ''}`}>
                      <div class="flex min-w-0 items-center gap-3"><span class="w-10 shrink-0 text-2xl font-bold tabular-nums">{appointment.queue_number ?? '—'}</span><span class="break-all text-lg">{appointment.masked_name}</span></div>
                      <span class={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${appointment.status === 'in_progress' ? 'bg-primary text-primary-foreground' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'}`}>{appointment.status === 'in_progress' ? '看診中' : '候診中'}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </main>
{/if}
