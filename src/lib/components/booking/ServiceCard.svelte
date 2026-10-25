<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Clock from "@lucide/svelte/icons/clock";
  import { Button } from "#lib/components/ui/button/index.js";
  import { inkOn } from "#lib/color-contrast.ts";
  import { getServicePriceBadge } from "#lib/service-price.ts";
  import type { ServiceOption } from "#lib/types/booking.ts";
  import type { PaymentType } from "#lib/types/clinic.ts";
  let { service, isSelected, onSelect, primaryColor = "#1d4ed8", paymentType }: {
    service: ServiceOption; isSelected: boolean; onSelect: (service: ServiceOption) => void; primaryColor?: string; paymentType?: PaymentType;
  } = $props();
  const priceBadge = $derived(getServicePriceBadge(service.price, paymentType, service.show_price));
</script>
<Button type="button" variant="outline" aria-pressed={isSelected} onclick={() => onSelect(service)} class="h-auto min-h-28 w-full items-start justify-start gap-4 rounded-2xl bg-card p-5 text-left whitespace-normal shadow-none transition-colors hover:bg-muted/40" style={isSelected ? `border-color:${primaryColor};background-color:color-mix(in srgb, ${primaryColor} 5%, var(--card))` : undefined}>
  <div class="min-w-0 flex-1">
    <h3 class="text-base font-semibold leading-6 break-words">{service.name}</h3>
    {#if service.description}<p class="mt-1.5 text-sm leading-6 font-normal text-muted-foreground">{service.description}</p>{/if}
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-normal text-muted-foreground"><span class="inline-flex items-center gap-1"><Clock class="size-3.5"/>{service.duration_minutes} 分鐘</span>{#if priceBadge}<span class="font-medium text-foreground tabular-nums">{priceBadge.label}</span>{/if}</div>
  </div>
  <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border" style:background-color={isSelected ? primaryColor : undefined} style:border-color={isSelected ? primaryColor : undefined} style:color={isSelected ? inkOn(primaryColor) : undefined}>{#if isSelected}<Check class="size-3"/>{/if}</span>
</Button>
