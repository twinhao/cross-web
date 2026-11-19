<script lang="ts">
	import { goto } from "$app/navigation";
	import { bookingApi } from "#lib/api/booking.ts";
	import { loadBookingPage, type BookingPageResult } from "#lib/booking/booking-flow.ts";
	import BookingError from "#lib/components/booking/BookingError.svelte";
	import BookingFlow from "#lib/components/booking/BookingFlow.svelte";
	import BookingLoading from "#lib/components/booking/BookingLoading.svelte";
	import ErrorPage from "#lib/components/ErrorPage.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";

	// 移植自舊版 app/booking/[clinic-id]/page.tsx + loading.tsx + app/booking/layout.tsx（PublicFrame，無 footer）
	let { data } = $props();
	const clinicId = $derived(data.clinicId);

	let result = $state.raw<BookingPageResult | null>(null);

	// 載入院所設定、服務、人員（查無院所或 config 為空 → 找不到頁面；其他失敗 → 伺服器異常；未開通線上預約 → 導回院所頁）。
	// 換院所時先回到骨架再重抓，舊回應作廢（對應舊版換 param 重新渲染整頁）。
	$effect(() => {
		const id = clinicId;
		result = null;
		let cancelled = false;
		loadBookingPage(bookingApi, id).then((next) => {
			if (cancelled) return;
			// 舊版 redirect()：以 replace 導回院所頁（顯示現場 / 電話預約），導向期間維持骨架
			if (next.kind === "redirect") goto(next.to, { replaceState: true });
			else result = next;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if result?.kind === "notFound"}
	<ErrorPage />
{:else}
	<PublicFrame footer={false} booking>
		{#if result === null || result.kind === "redirect"}
			<BookingLoading />
		{:else if result.kind === "error"}
			<BookingError />
		{:else}
			<BookingFlow
				{clinicId}
				clinicConfig={result.clinicConfig}
				services={result.services}
				doctors={result.doctors}
				paymentType={result.paymentType}
			/>
		{/if}
	</PublicFrame>
{/if}
