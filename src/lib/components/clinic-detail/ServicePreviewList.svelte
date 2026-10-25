<script lang="ts">
	import Clock from "@lucide/svelte/icons/clock";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import ArrowRight from "@lucide/svelte/icons/arrow-right";
	import { Button } from "#lib/components/ui/button/index.ts";
	import { getServicePriceBadge } from "#lib/service-price.ts";
	import type { PaymentType, Service } from "#lib/types/clinic.ts";
	import SectionCard from "./SectionCard.svelte";

	let {
		services,
		paymentType,
		bookingHref,
		bookingLabel = "查看預約方式",
		class: className,
	}: {
		services: Service[];
		/** 院所付款方式（健保 / 自費 / 兩者）；0 元服務是否標「健保給付」依此 gating */
		paymentType?: PaymentType;
		bookingHref?: string;
		bookingLabel?: string;
		class?: string;
	} = $props();

	const grouped = $derived.by(() => {
		const groups: Record<string, Service[]> = {};
		for (const service of services) {
			const category = service.category || "其他";
			if (!groups[category]) groups[category] = [];
			groups[category].push(service);
		}
		return Object.entries(groups);
	});
</script>

{#if services.length > 0}
	<SectionCard icon={Sparkles} title="服務項目" class={className}>
		<p class="mb-6 text-sm leading-7 text-muted-foreground">先了解服務內容與預留時間，再安排適合你的到訪。</p>
		<div class="space-y-6">
			{#each grouped as [category, categoryServices] (category)}
				<div>
					<h3 class="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{category}
					</h3>
					<div class="space-y-2">
						<!-- 後端資料可能有重複 id：以索引為 key（同舊版 React 只警告、照樣渲染） -->
						{#each categoryServices as service, i (i)}
							<!-- 價格 badge 統一規則（依 payment_type gating，三端一致） -->
							{@const priceBadge = getServicePriceBadge(service.price, paymentType, service.show_price)}
							<div
								class="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/50 p-5 sm:flex-row sm:p-6"
							>
								<div class="min-w-0 flex-1">
									<p class="break-words text-base font-semibold text-foreground">{service.name}</p>
									{#if service.description}
										<p class="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
											{service.description}
										</p>
									{/if}
									<div class="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
										<Clock class="size-3" />
										<span>{service.duration_minutes} 分鐘</span>
									</div>
								</div>
								{#if priceBadge}
									{#if priceBadge.kind === "price"}
										<div
											class="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground tabular-nums"
										>
											{priceBadge.label}
										</div>
									{:else}
										<div
											class="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
										>
											{priceBadge.label}
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		{#if services.some((service) => service.show_price === false)}<p class="mt-5 text-xs leading-6 text-muted-foreground">部分服務未公開費用，預約前可向院所確認。</p>{/if}
		{#if bookingHref}<Button href={bookingHref} variant="outline" class="mt-5 min-h-11">{bookingLabel}<ArrowRight aria-hidden="true" /></Button>{/if}
	</SectionCard>
{/if}
