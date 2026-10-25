<script lang="ts">
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import ArrowRight from "@lucide/svelte/icons/arrow-right";
	import CalendarDays from "@lucide/svelte/icons/calendar-days";
	import MapPin from "@lucide/svelte/icons/map-pin";
	import Phone from "@lucide/svelte/icons/phone";
	import Share2 from "@lucide/svelte/icons/share-2";
	import Star from "@lucide/svelte/icons/star";
	import FavoriteButton from "#lib/components/clinics/FavoriteButton.svelte";
	import ShareClinicDialog from "#lib/components/clinics/ShareClinicDialog.svelte";
	import { Badge } from "#lib/components/ui/badge/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { FACILITY_TYPE_LABELS, HOSPITAL_LEVELS, PAYMENT_TYPES } from "#lib/constants/clinic-constants.ts";
	import type { Clinic } from "#lib/types/clinic.ts";
	import { cn } from "#lib/utils.ts";

	let { clinic, class: className }: { clinic: Clinic; class?: string } = $props();

	let shareOpen = $state(false);
	const canCall = $derived(clinic.phone_booking_enabled && !!clinic.phone);
	const bookingLabel = $derived(clinic.online_booking_enabled ? "查看可約時段" : canCall ? "電話預約" : "查看到訪方式");
	const bookingHref = $derived(clinic.online_booking_enabled ? `/booking/${clinic.id}` : canCall ? `tel:${clinic.phone}` : "#contact");
</script>

<section class={cn("border-b border-border/60 bg-card", className)}>
	<div class="home-container py-6 sm:py-10">
		<div class="mb-7 flex items-center justify-between gap-3">
			<a href="/search" class="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-primary"
				><ArrowLeft class="size-4" />探索服務</a
			>
			<div class="flex items-center gap-2">
				<FavoriteButton clinicId={clinic.id} nextPath={`/clinic/${clinic.id}`} />
				<Button variant="outline" size="icon" onclick={() => (shareOpen = true)} aria-label="分享此頁面"
					><Share2 class="size-4" /></Button
				>
			</div>
		</div>
		<div class="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12">
		<div>
		<div class="flex flex-col gap-5 sm:flex-row sm:gap-7">
			{#if clinic.logo}
				<img
					src={clinic.logo}
					alt={`${clinic.clinic_name} logo`}
					width="96"
					height="96"
					loading="lazy"
					decoding="async"
					style="color:transparent"
					class="size-20 shrink-0 rounded-3xl border border-border/70 bg-white object-contain sm:size-24"
				/>
			{:else}
				<span
					aria-hidden="true"
					class="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-card text-3xl font-medium text-primary sm:size-24 sm:text-4xl"
					>{clinic.clinic_name.slice(0, 1)}</span
				>
			{/if}
			<div class="min-w-0 flex-1">
				<div class="mb-3 flex flex-wrap gap-2">
					{#if clinic.facility_type}<Badge variant="secondary">{FACILITY_TYPE_LABELS[clinic.facility_type]}</Badge>{/if}
					{#if clinic.payment_type}<Badge variant="outline">{PAYMENT_TYPES[clinic.payment_type]}</Badge>{/if}
					{#if !clinic.facility_type || clinic.facility_type === "healthcare"}<Badge variant="outline"
							>{HOSPITAL_LEVELS[clinic.hospital_level]}</Badge
						>{/if}
				</div>
				<h1 class="break-words text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">{clinic.clinic_name}</h1>
				<div class="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
					{#if clinic.city}<span class="inline-flex items-center gap-1.5"><MapPin class="size-4" />{clinic.city}</span>{/if}
					{#if clinic.rating != null}<span class="inline-flex items-center gap-1.5"
							><Star class="size-4 fill-amber-400 text-amber-400" />{clinic.rating.toFixed(1)}{clinic.review_count
								? `（${clinic.review_count} 則評論）`
								: ""}</span
						>{/if}
				</div>
			</div>
		</div>
		{#if clinic.description}<p class="mt-6 max-w-2xl whitespace-pre-line text-sm leading-8 text-muted-foreground sm:text-base">{clinic.description}</p>{/if}
		<div class="mt-7 flex flex-wrap gap-3">
			<Button href={bookingHref} size="lg" class="min-h-12">
				{#if clinic.online_booking_enabled}<CalendarDays aria-hidden="true" />{:else if canCall}<Phone aria-hidden="true" />{:else}<MapPin aria-hidden="true" />{/if}
				{bookingLabel}<ArrowRight aria-hidden="true" />
			</Button>
			{#if clinic.services?.length}<Button href="#services" size="lg" variant="outline" class="min-h-12">先了解服務</Button>{/if}
		</div>
		<p class="mt-3 text-xs leading-6 text-muted-foreground">{clinic.online_booking_enabled ? "先選服務與時間，確認資料後再送出預約。" : canCall ? "本院所採電話／現場預約，請向院所確認服務與可到訪時間。" : "本院所採現場預約，到訪前請先查看營業與交通資訊。"}</p>
		</div>
		{#if clinic.images?.length}
			<div class="grid gap-3 overflow-hidden rounded-3xl" aria-label="院所環境照片">
				<img src={clinic.images[0]} alt={`${clinic.clinic_name}院所環境`} fetchpriority="high" decoding="async" class="aspect-[4/3] w-full bg-muted object-cover" />
				{#if clinic.images.length > 1}<div class="grid grid-cols-2 gap-3">
					{#each clinic.images.slice(1, 3) as photo, i (i)}<img src={photo} alt={`${clinic.clinic_name}環境照片 ${i + 2}`} loading="lazy" class="aspect-[2/1] w-full rounded-xl bg-muted object-cover" />{/each}
				</div>{/if}
			</div>
		{:else}
			<div class="rounded-3xl border border-border/70 bg-muted/40 p-6 sm:p-8">
				<p class="home-eyebrow">到訪前，先認識我們</p>
				{#if clinic.services?.length}
					<h2 class="mt-3 text-xl font-semibold">從你需要的服務開始。</h2>
					<ul class="mt-5 divide-y divide-border">
						{#each clinic.services.slice(0, 3) as service, i (i)}<li><a href="#services" class="flex min-h-16 items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-primary"><span class="min-w-0 break-words font-medium">{service.name}</span><span class="shrink-0 text-xs text-muted-foreground">{service.duration_minutes} 分鐘</span></a></li>{/each}
					</ul>
					<a href="#services" class="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">查看服務介紹 <ArrowRight class="size-4" aria-hidden="true" /></a>
				{:else}
					<h2 class="mt-3 text-xl font-semibold">安排你的下一次到訪。</h2>
					<p class="mt-4 text-sm leading-7 text-muted-foreground">先認識院所與團隊，再依院所提供的預約方式安排時間。</p>
				{/if}
				{#if clinic.members?.length}<a href="#team" class="flex min-h-11 items-center gap-2 border-t border-border pt-4 text-sm hover:text-primary">認識服務團隊 <ArrowRight class="size-4" aria-hidden="true" /></a>{/if}
				{#if clinic.address}<p class="mt-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground"><MapPin class="mt-1 size-4 shrink-0" aria-hidden="true" />{clinic.address}</p>{/if}
			</div>
		{/if}
		</div>
		<nav aria-label="店家內容" class="mt-7 flex flex-wrap gap-2 border-t border-border/70 pt-5 text-sm">
			{#if clinic.services?.length}<a href="#services" class="rounded-full bg-card px-4 py-2.5 hover:text-primary">服務項目</a>{/if}
			{#if clinic.members?.length}<a href="#team" class="rounded-full bg-card px-4 py-2.5 hover:text-primary">專業團隊</a>{/if}
			<a href="#contact" class="rounded-full bg-card px-4 py-2.5 hover:text-primary">聯絡與交通</a>
		</nav>
	</div>
	<ShareClinicDialog clinicId={clinic.id} clinicName={clinic.clinic_name} bind:open={shareOpen} />
</section>
