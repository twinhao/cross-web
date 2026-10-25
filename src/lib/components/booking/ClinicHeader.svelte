<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import { cn } from "#lib/utils.ts";
  import type { ClinicConfig } from "#lib/types/booking.ts";
  let { clinic, class: className }: { clinic: ClinicConfig; class?: string } = $props();
</script>
<div class={cn("mx-auto w-full max-w-6xl px-4 pt-6 pb-5 sm:px-6 sm:pt-8", className)}>
  <a href={`/clinic/${clinic.id}`} class="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft class="size-4"/>返回店家介紹</a>
  <div class="flex items-center gap-3">
    {#if clinic.logo}<img src={clinic.logo} alt="" class="size-12 shrink-0 rounded-xl border bg-white object-contain" />{/if}
    <div class="min-w-0"><p class="mb-1 text-xs text-muted-foreground">線上預約</p><h1 class="text-xl font-semibold leading-7 tracking-tight break-words sm:text-2xl">{clinic.clinic_name}</h1></div>
  </div>
</div>
