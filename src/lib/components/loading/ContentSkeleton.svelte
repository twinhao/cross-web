<script lang="ts">
  import { Skeleton } from "#lib/components/ui/skeleton/index.ts";
  let { label = "正在載入…", variant = "list" }: {
    label?: string;
    variant?: "list" | "form" | "appointment" | "board";
  } = $props();
</script>

<div role="status" aria-label={label} aria-busy="true" data-content-skeleton={variant} class="w-full min-w-0">
  <span class="sr-only">{label}</span>
  <div aria-hidden="true" class="space-y-5">
    {#if variant === "form"}
      <div class="space-y-3"><Skeleton class="size-12 rounded-2xl" /><Skeleton class="h-6 w-2/3" /><Skeleton class="h-4 w-full" /></div>
      <div class="grid gap-5 sm:grid-cols-2">
        {#each [0, 1, 2, 3] as item (item)}<div class="space-y-2"><Skeleton class="h-3 w-20" /><Skeleton class="h-11 w-full rounded-xl" /></div>{/each}
      </div>
      <Skeleton class="h-11 w-full rounded-xl" />
    {:else if variant === "appointment"}
      <div class="space-y-4 rounded-3xl border bg-card p-6"><Skeleton class="h-6 w-20 rounded-full" /><Skeleton class="h-8 w-3/4" /><div class="flex gap-4"><Skeleton class="h-4 w-28" /><Skeleton class="h-4 w-20" /></div></div>
      <div class="space-y-5 rounded-2xl border bg-card p-5">{#each [0, 1, 2, 3] as item (item)}<div class="flex justify-between gap-4"><Skeleton class="h-4 w-20" /><Skeleton class="h-4 w-1/2" /></div>{/each}</div>
    {:else if variant === "board"}
      <div class="flex h-20 items-center justify-between gap-4 border-b pb-4"><Skeleton class="h-8 w-1/2 max-w-72" /><Skeleton class="h-4 w-24" /></div>
      <div class="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{#each [0, 1, 2] as item (item)}<div class="overflow-hidden rounded-3xl border bg-card"><div class="flex justify-between gap-4 border-b p-6"><Skeleton class="h-6 w-32" /><Skeleton class="h-4 w-16" /></div><div class="flex flex-col items-center gap-3 py-8"><Skeleton class="h-4 w-20" /><Skeleton class="h-20 w-28" /></div>{#each [0, 1, 2] as row (row)}<div class="flex justify-between gap-4 border-t p-4"><Skeleton class="h-7 w-1/2" /><Skeleton class="h-7 w-16 rounded-full" /></div>{/each}</div>{/each}</div>
    {:else}
      {#each [0, 1, 2] as item (item)}<div class="flex gap-4 rounded-2xl border bg-card p-5"><Skeleton class="size-11 shrink-0 rounded-2xl" /><div class="min-w-0 flex-1 space-y-3"><Skeleton class="h-5 w-2/3 max-w-56" /><Skeleton class="h-3 w-3/4" /><Skeleton class="h-3 w-1/2" /></div></div>{/each}
    {/if}
  </div>
</div>
