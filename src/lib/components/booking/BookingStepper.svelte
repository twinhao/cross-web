<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { Button } from "#lib/components/ui/button/index.js";
  import { inkOn } from "#lib/color-contrast.ts";
  import { BOOKING_STEPS } from "#lib/constants/booking-constants.ts";
  let { currentStep, onStepClick, primaryColor = "#1d4ed8" }: {
    currentStep: 1 | 2 | 3; onStepClick?: (step: 1 | 2 | 3) => void; primaryColor?: string;
  } = $props();
</script>
<nav aria-label="預約進度" class="sticky top-[4.25rem] z-20 mx-auto w-full max-w-6xl bg-background/95 px-4 pt-2 backdrop-blur sm:top-20 sm:px-6">
  <ol class="grid grid-cols-3 gap-3 sm:gap-6">
    {#each BOOKING_STEPS as {step,label} (step)}
      <li class="min-w-0 border-b-2 pb-3" style:border-color={currentStep >= step ? primaryColor : "var(--border)"}>
        <Button variant="ghost" aria-label={`第 ${step} 步：${label}`} aria-current={currentStep === step ? "step" : undefined} disabled={step >= currentStep} onclick={() => onStepClick?.(step)} class="min-h-11 w-full justify-start gap-2 rounded-lg px-0 text-xs disabled:opacity-100 sm:text-sm">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground" style:background-color={currentStep >= step ? primaryColor : undefined} style:color={currentStep >= step ? inkOn(primaryColor) : undefined}>{#if step < currentStep}<Check class="size-3.5"/>{:else}{step}{/if}</span>
          <span class={currentStep === step ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
        </Button>
      </li>
    {/each}
  </ol>
</nav>
