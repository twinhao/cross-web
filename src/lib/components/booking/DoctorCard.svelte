<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import User from "@lucide/svelte/icons/user";
  import { Button } from "#lib/components/ui/button/index.js";
  import { inkOn } from "#lib/color-contrast.ts";
  import type { DoctorOption } from "#lib/types/booking.ts";
  let { doctor, isSelected, onSelect, primaryColor = "#1d4ed8" }: {
    doctor: DoctorOption; isSelected: boolean; onSelect: (doctor: DoctorOption) => void; primaryColor?: string;
  } = $props();
</script>
<Button type="button" variant="outline" aria-pressed={isSelected} onclick={() => onSelect(doctor)} class="h-auto min-h-20 w-full justify-start gap-3 rounded-xl bg-card p-4 text-left whitespace-normal shadow-none hover:bg-muted/40" style={isSelected ? `border-color:${primaryColor};background-color:color-mix(in srgb, ${primaryColor} 5%, var(--card))` : undefined}>
  <span class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">{#if doctor.avatar}<img src={doctor.avatar} alt="" loading="lazy" class="size-full object-cover"/>{:else}<User class="size-5"/>{/if}</span>
  <span class="min-w-0 flex-1"><span class="block text-sm leading-6 font-medium break-words">{doctor.name}</span><span class="block text-xs leading-5 font-normal text-muted-foreground">{doctor.title}</span></span>
  <span class="flex size-4 shrink-0 items-center justify-center rounded-full border" style:background-color={isSelected ? primaryColor : undefined} style:border-color={isSelected ? primaryColor : undefined} style:color={isSelected ? inkOn(primaryColor) : undefined}>{#if isSelected}<Check class="size-2.5"/>{/if}</span>
</Button>
