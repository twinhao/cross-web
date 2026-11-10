<script lang="ts">
  import QueueBoardView from "#lib/components/queue/QueueBoardView.svelte";
  import ContentSkeleton from "#lib/components/loading/ContentSkeleton.svelte";
  import { page } from '$app/state';
  import { api } from '#lib/api/client.ts';
  import { pollOnVisible } from '#lib/hooks/poll-on-visible.svelte.ts';
  import type { DisplayBoard } from '#lib/types/clinic.ts';
  import Seo from '#lib/components/Seo.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let board = $state<DisplayBoard | null>(null);
  let loading = $state(true);
  let failed = $state(false);
  let generation = 0;
  async function load(id: string, current: number, silent = false) {
    if (!silent) loading = true;
    try {
      const result = await api.get<DisplayBoard>(`/api/v1/booking/clinics/${id}/queue-board`);
      if (generation === current) { board = result; failed = false; }
    } catch { if (generation === current) failed = true; }
    finally { if (generation === current) loading = false; }
  }
  $effect(() => {
    const current = ++generation;
    board = null;
    void load(page.params.facilityId!, current);
    return () => { generation++; };
  });
  pollOnVisible(() => { void load(page.params.facilityId!, generation, true); }, 10_000, () => true);
</script>

<Seo {...data.seo} />

{#if loading}<div class="min-h-screen px-6 py-5 sm:px-10"><ContentSkeleton variant="board" label="載入看板中…" /></div>
{:else if failed || !board}<div class="flex min-h-screen items-center justify-center text-2xl text-muted-foreground" role="status">看板暫時無法載入，將自動重試…</div>
{:else}<QueueBoardView {board} />{/if}
