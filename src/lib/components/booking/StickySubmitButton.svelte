<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Loader2 from "@lucide/svelte/icons/loader-circle";
  import { Button } from "#lib/components/ui/button/index.js";
  import { inkOn } from "#lib/color-contrast.ts";
  import { cn } from "#lib/utils.ts";
  let { label, onClick, onBack, disabled = false, isLoading = false, primaryColor = "#1d4ed8", class: className, hint }: {
    label:string; onClick:()=>void; onBack?:()=>void; disabled?:boolean; isLoading?:boolean; primaryColor?:string; class?:string; hint?:string;
  } = $props();
</script>
<div class={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6",className)}>
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
    {#if hint}<p class="w-full min-w-0 text-xs leading-5 text-muted-foreground sm:w-auto sm:flex-1" role="status">{hint}</p>{/if}
    <div class="flex w-full items-center gap-3 sm:w-auto">
      {#if onBack}<Button variant="outline" class="min-h-12 rounded-xl px-4" disabled={isLoading} onclick={onBack}><ArrowLeft/>返回</Button>{/if}
      <Button onclick={onClick} disabled={disabled || isLoading} class="min-h-12 min-w-0 flex-1 rounded-xl px-6 text-sm font-semibold sm:flex-none" style={`background-color:${primaryColor};color:${inkOn(primaryColor)}`}>{#if isLoading}<Loader2 class="size-4 animate-spin"/>處理中…{:else}{label}<ArrowRight class="size-4"/>{/if}</Button>
    </div>
  </div>
</div>
