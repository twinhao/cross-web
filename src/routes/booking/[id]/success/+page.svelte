<script lang="ts">
	import { untrack } from "svelte";
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import { page } from "$app/state";
	import { bookingApi } from "#lib/api/booking.ts";
	import CalendarButtons from "#lib/components/booking/CalendarButtons.svelte";
	import SuccessCard from "#lib/components/booking/SuccessCard.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";
	import { Button } from "#lib/components/ui/button/index.js";
	import type { BookingResponse } from "#lib/types/booking.ts";

	// 移植自舊版 app/booking/[clinic-id]/success/page.tsx（外框為 app/booking/layout.tsx 的 PublicFrame，無 footer）
	let { data } = $props();
	const clinicId = $derived(data.clinicId);
	const bookingId = $derived(page.url.searchParams.get("id"));

	let booking = $state.raw<BookingResponse | null>(null);
	// 初始值只取進頁時的網址（舊版 useState 初始值）；之後換 id 只重抓、不重設這兩個狀態（同舊版）
	let isLoading = $state(untrack(() => !!bookingId));
	let error = $state(untrack(() => !bookingId));

	// 與站上 --primary 一致；原本寫死的 #ec4899 配白字只有 3.53:1
	const primaryColor = "#1d4ed8";

  $effect(() => {
    const id=bookingId;
    booking=null;error=!id;isLoading=!!id;
    let cancelled=false;
    if(id)bookingApi.getBooking(id).then(result=>{if(!cancelled)booking=result;}).catch(()=>{if(!cancelled)error=true;}).finally(()=>{if(!cancelled)isLoading=false;});
    return ()=>{cancelled=true;};
  });

</script>

<PublicFrame footer={false} booking>
	<div class="mx-auto min-h-[70vh] max-w-xl bg-background pb-12">
		<!-- Header -->
		<div class="px-4 py-6">
			<a
				href={`/clinic/${clinicId}`}
				class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft class="size-4" />
				返回診所
			</a>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center py-20">
				<div
					class="size-8 animate-spin rounded-full border-4 border-border border-t-current"
					style:border-top-color={primaryColor}
				></div>
			</div>
		{:else if error || !booking}
			<div class="flex flex-col items-center gap-3 py-20 text-center">
				<p class="text-sm text-muted-foreground">無法載入預約資訊</p>
				<Button href={`/clinic/${clinicId}`} variant="outline" size="sm">返回診所首頁</Button>
			</div>
		{:else}
			<!-- Success Card -->
			<div class="py-4">
				<SuccessCard {booking} {primaryColor} />
			</div>


		{/if}

		<!-- Actions -->
    <div class="mt-4 grid gap-3 px-4">
      <Button href="/member" class="min-h-12 rounded-xl">查看我的預約</Button>
      <Button href={`/clinic/${clinicId}`} variant="outline" class="min-h-12 rounded-xl">返回診所首頁</Button>
    </div>
    {#if booking && !isLoading && !error}<div class="py-6"><CalendarButtons {booking} {primaryColor}/></div>{/if}

	</div>
</PublicFrame>
