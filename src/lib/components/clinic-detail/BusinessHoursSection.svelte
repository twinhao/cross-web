<script lang="ts">
	import { taipeiWeekday } from "#lib/business-hours.ts";
	import Clock from "@lucide/svelte/icons/clock";
	import type { BusinessHours } from "#lib/types/clinic.ts";
	import { cn } from "#lib/utils.ts";
	import SectionCard from "./SectionCard.svelte";

	let { businessHours, class: className }: { businessHours: BusinessHours[]; class?: string } = $props();

	const todayName = taipeiWeekday();
</script>

{#if businessHours.length > 0}
	<SectionCard icon={Clock} title="營業時間" class={className}>
		<div class="space-y-0.5">
			<!-- 後端資料可能有重複的星期：以索引為 key（同舊版 React 只警告、照樣渲染） -->
			{#each businessHours as hours, i (i)}
				{@const isToday = hours.day === todayName}
				<div
					class={cn(
						"flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition-colors",
						isToday ? "bg-accent" : "hover:bg-muted",
					)}
				>
					<span
						class={cn(
							"flex items-center gap-2 text-sm",
							isToday ? "font-semibold text-accent-foreground" : "text-foreground",
						)}
						>{#if isToday}<span class="size-1.5 rounded-full bg-primary"></span>{/if}{hours.day}{isToday
							? "（今日）"
							: ""}</span
					>
					<div class="min-w-0 text-right">
						<span
							class={cn(
								"text-sm tabular-nums",
								hours.is_closed
									? "text-muted-foreground"
									: isToday
										? "font-semibold text-accent-foreground"
										: "text-foreground",
							)}
						>
							{hours.is_closed ? "休息" : `${hours.open} - ${hours.close}`}
						</span>
						{#if !hours.is_closed && hours.breaks && hours.breaks.length > 0}
							<div class="text-xs text-muted-foreground">
								休息 {hours.breaks.map((b) => `${b.start}-${b.end}`).join("、")}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</SectionCard>
{/if}
