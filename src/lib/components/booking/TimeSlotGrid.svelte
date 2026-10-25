<script lang="ts">
	import { groupSlotsByPeriod } from "#lib/booking/booking-flow.ts";
	import { inkOn } from "#lib/color-contrast.ts";
	import { TIME_PERIODS } from "#lib/constants/booking-constants.ts";
	import type { TimeOfDay, TimeSlot } from "#lib/types/booking.ts";
	import { Button } from "#lib/components/ui/button/index.js";
	import { cn } from "#lib/utils.ts";

	// 移植自舊版 components/booking/time-slot-grid.tsx
	let {
		slots,
		selectedSlot,
		onSelectSlot,
		primaryColor = "#1d4ed8",
	}: {
		slots: TimeSlot[];
		selectedSlot: TimeSlot | null;
		onSelectSlot: (slot: TimeSlot) => void;
		primaryColor?: string;
	} = $props();

	const groupedSlots = $derived(groupSlotsByPeriod(slots));
	const periods: TimeOfDay[] = ["morning", "afternoon", "evening"];
	const hasAnySlot = $derived(slots.length > 0);
</script>

{#if !hasAnySlot}
	<div class="rounded-2xl bg-muted/40 py-8 text-center text-sm text-muted-foreground">此日期暫無可預約時段</div>
{:else}
	<div class="space-y-5">
		{#each periods as period (period)}
			{@const periodSlots = groupedSlots[period]}
			{@const availableSlots = periodSlots.filter((s) => s.isAvailable)}
			{#if periodSlots.length > 0}
				<div>
					<h3 class="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
						{TIME_PERIODS[period].label}<span class="text-xs font-normal text-muted-foreground"
							>· {availableSlots.length} 個可預約</span
						>
					</h3>

					<!-- 時段來自後端，不以 id 當 key（重複時 keyed each 會丟錯，舊版 React 只警告） -->
					<div class="grid grid-cols-3 gap-2 @sm:grid-cols-4">
						{#each periodSlots as slot, i (i)}
							{@const isSelected = selectedSlot?.id === slot.id}
							{@const isDisabled = !slot.isAvailable}
							<Button variant="outline"
								type="button"
								aria-pressed={isSelected}
								onclick={() => !isDisabled && onSelectSlot(slot)}
								disabled={isDisabled}
								class={cn(
									"min-h-11 rounded-xl px-1 py-2.5 text-sm font-medium tabular-nums shadow-none",
									isSelected && "border-transparent",
									!isSelected && !isDisabled && "bg-card text-foreground hover:bg-muted",
									isDisabled && "cursor-not-allowed bg-muted/30 text-muted-foreground/50 line-through",
								)}
								style={isSelected ? `background-color:${primaryColor};color:${inkOn(primaryColor)}` : undefined}
							>
								{slot.time}
							</Button>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
