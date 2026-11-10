<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "#lib/api/client.ts";
  import { DEMO_ID } from "#lib/demo/data.ts";
  import { pollOnVisible } from "#lib/hooks/poll-on-visible.svelte.ts";
  import type { DisplayBoard } from "#lib/types/clinic.ts";
  import QueueBoardView from "#lib/components/queue/QueueBoardView.svelte";
  import ContentSkeleton from "#lib/components/loading/ContentSkeleton.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";

  let board = $state<DisplayBoard | null>(null), failed = $state(false);
  let generation = 0;
  async function load() {
    const current = ++generation;
    try {
      const result = await api.get<DisplayBoard>(`/api/v1/booking/clinics/${DEMO_ID}/queue-board`);
      if (current === generation) { board = result; failed = false; }
    } catch { if (current === generation) failed = true; }
  }
  onMount(() => { void load(); return () => { generation++; }; });
  pollOnVisible(() => { void load(); }, 10_000, () => true);
</script>

<div class="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 text-sm sm:px-10">
  <p class="text-muted-foreground">在後台報到、叫號或處理過號後，切回這裡查看結果。</p>
  <Button href="/demo?mode=admin&tab=queue&queue_view=service" variant="outline" class="min-h-11">回到叫號與報到</Button>
</div>
{#if failed}
  <div role="alert" class="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-10"><p>看板更新失敗，請重新讀取。</p><Button variant="outline" onclick={load}>重新讀取看板</Button></div>
{/if}
{#if board}<QueueBoardView {board} embedded />
{:else if !failed}<div class="px-4 py-5 sm:px-10"><ContentSkeleton variant="board" label="載入看板中…" /></div>{/if}
