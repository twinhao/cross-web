<script lang="ts">
  import type { Snippet } from "svelte";
  import { navigating } from "$app/state";
  import SiteHeader from "#lib/components/layout/SiteHeader.svelte";
  import { navigationSkeletonVariant } from "#lib/navigation/slow-routes.ts";
  import ContentSkeleton from "./ContentSkeleton.svelte";

  // SvelteKit 等 load 完成才換頁；換到其他路徑超過 DELAY_MS 仍未完成時蓋上目標頁骨架，
  // 讓使用者知道已在跳轉（院所、地區、科別頁要等後端，冷啟動可達十多秒）。
  // 原頁保留不卸載（取消或失敗時原狀還原），等待期間設為 inert，鍵盤與讀屏不會停在看不見的舊頁。
  const DELAY_MS = 300;
  let { children }: { children: Snippet } = $props();

  const target = $derived(navigationSkeletonVariant(navigating.to, navigating.from));
  const targetPath = $derived(navigating.to?.url.pathname);
  let shown = $state<{ variant: NonNullable<typeof target>; path?: string }>();

  $effect(() => {
    const variant = target;
    const path = targetPath;
    if (!variant) {
      shown = undefined;
      return;
    }
    // 未到延遲前不渲染，避免透明遮罩攔截點擊或預載完成時一閃而過
    const timer = setTimeout(() => (shown = { variant, path }), DELAY_MS);
    return () => clearTimeout(timer);
  });

  const label = $derived(shown?.variant === "clinic" ? "正在載入院所…" : shown?.variant === "landing" ? "正在載入院所列表…" : "正在載入頁面…");
</script>

<div class="contents" inert={!!shown}>{@render children()}</div>

{#if shown}
  <div data-navigation-skeleton={shown.variant} class="fixed inset-0 z-50 overflow-y-auto bg-background">
    {#if shown.variant !== "list"}<SiteHeader path={shown.path} />{/if}
    <div class="home-container pt-6 sm:pt-8">
      <ContentSkeleton variant={shown.variant} {label} />
    </div>
  </div>
{/if}
