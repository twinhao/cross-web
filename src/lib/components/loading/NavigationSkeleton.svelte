<script lang="ts">
  import { navigating } from "$app/state";
  import SiteHeader from "#lib/components/layout/SiteHeader.svelte";
  import { Skeleton } from "#lib/components/ui/skeleton/index.ts";
  import ContentSkeleton from "./ContentSkeleton.svelte";

  // 這些頁面的伺服器 load 要等後端（冷啟動可達十多秒），SvelteKit 會等資料到齊才換頁；
  // 換頁期間先蓋上目標頁骨架，讓使用者知道已經在跳轉。底下原頁保留不卸載，取消或失敗時原狀還原。
  const SLOW_ROUTES: Record<string, "clinic" | "list"> = {
    "/clinic/[id]": "clinic",
    "/c/[code]": "clinic",
    "/area": "list",
    "/area/[city]": "list",
    "/specialty": "list",
    "/specialty/[code]": "list",
  };
  const variant = $derived(navigating.to?.route.id ? SLOW_ROUTES[navigating.to.route.id] : undefined);
</script>

{#if variant}
  <div data-navigation-skeleton={variant} class="navigation-skeleton fixed inset-0 z-50 overflow-y-auto bg-background">
    <SiteHeader />
    <div class="home-container pt-6 sm:pt-8">
      {#if variant === "clinic"}
        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="space-y-6" aria-hidden="true">
            <div class="flex gap-4 rounded-3xl border bg-card p-6"><Skeleton class="size-16 shrink-0 rounded-2xl" /><div class="min-w-0 flex-1 space-y-3"><Skeleton class="h-7 w-2/3 max-w-72" /><Skeleton class="h-4 w-1/2" /><Skeleton class="h-4 w-3/4" /></div></div>
            <Skeleton class="aspect-[16/7] w-full rounded-3xl" />
          </div>
          <div class="space-y-4 rounded-3xl border bg-card p-6" aria-hidden="true"><Skeleton class="h-6 w-1/2" /><Skeleton class="h-11 w-full rounded-xl" /></div>
        </div>
        <div class="mt-6"><ContentSkeleton label="正在載入院所…" /></div>
      {:else}
        <div class="mb-8 space-y-4 rounded-3xl border bg-card p-6 sm:p-10" aria-hidden="true"><Skeleton class="h-9 w-1/2 max-w-80" /><Skeleton class="h-4 w-full max-w-2xl" /><Skeleton class="h-4 w-2/3 max-w-xl" /></div>
        <ContentSkeleton label="正在載入院所列表…" />
      {/if}
    </div>
  </div>
{/if}

<style>
  /* 已預先載入（滑過連結）時換頁通常很快，延遲出現避免骨架一閃而過 */
  .navigation-skeleton {
    animation: navigation-skeleton-in 0.15s ease-out 0.12s both;
  }
  @keyframes navigation-skeleton-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
