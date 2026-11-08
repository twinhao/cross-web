<script lang="ts">
  import { Skeleton } from "#lib/components/ui/skeleton/index.ts";
  import AdminSkeleton from "./AdminSkeleton.svelte";
  let { variant = "dashboard" }: { variant?: "dashboard" | "list" | "form" } = $props();
</script>

<div class="cross-admin flex min-h-screen bg-background" data-admin-loading>
  <aside aria-hidden="true" class="hidden w-[72px] shrink-0 flex-col gap-6 border-r bg-card p-4 md:flex xl:w-64 xl:p-6">
    <Skeleton class="size-10 shrink-0 rounded-2xl" />
    {#each [0, 1, 2, 3, 4, 5] as item (item)}<div class="flex items-center gap-3"><Skeleton class="size-9 shrink-0 rounded-xl" /><Skeleton class="hidden h-4 w-24 xl:block" /></div>{/each}
  </aside>
  <div class="min-w-0 flex-1">
    <div aria-hidden="true" class="flex h-[4.75rem] items-center justify-between gap-4 border-b bg-card px-4 md:px-8"><Skeleton class="h-6 w-36" /><Skeleton class="size-9 rounded-full" /></div>
    <div class="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
      <div aria-hidden="true" class="space-y-3"><Skeleton class="h-7 w-40" /><Skeleton class="h-4 w-2/3 max-w-80" /></div>
      <AdminSkeleton label="載入後台中…" {variant} />
    </div>
  </div>
</div>
