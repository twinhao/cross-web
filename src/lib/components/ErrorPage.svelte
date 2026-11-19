<script lang="ts">
	import FileQuestion from "@lucide/svelte/icons/file-question-mark";
	import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
	import { page } from "$app/state";
	import Seo from "#lib/components/Seo.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as Empty from "#lib/components/ui/empty/index.js";

	// 找不到頁面／錯誤頁：routes/+error.svelte 與預約頁（瀏覽器端查無院所）共用。
	// withSeo：+error 時 root layout 不輸出預設 Seo，由這裡輸出 noindex 與標題；預約頁沿用 layout 的 Seo，只改分頁標題。
	let { status = 404, withSeo = false }: { status?: number; withSeo?: boolean } = $props();

	const notFound = $derived(status === 404);
	const title = $derived(notFound ? "找不到頁面" : "頁面發生錯誤");
	const message = $derived(
		notFound ? "網址可能有誤，或院所已下架。可以回首頁，或重新搜尋院所。" : "暫時無法顯示這個頁面，請稍後再試。",
	);

	$effect(() => {
		if (!withSeo) document.title = `${title} | Cross`;
	});
</script>

<svelte:head>
	{#if !withSeo}<meta name="robots" content="noindex" />{/if}
</svelte:head>
{#if withSeo}<Seo {title} canonical={page.url.pathname} noindex />{/if}

<PublicFrame>
	<Empty.Root class="min-h-[60vh] border-0">
		<Empty.Header>
			<Empty.Media variant="icon">
				{#if notFound}<FileQuestion />{:else}<TriangleAlert />{/if}
			</Empty.Media>
			<Empty.Title><h1 class="text-xl font-semibold">{title}</h1></Empty.Title>
			<Empty.Description>{message}</Empty.Description>
		</Empty.Header>
		<Empty.Content class="flex-row flex-wrap justify-center">
			<Button href="/" class="min-h-11">回首頁</Button>
			<Button href="/search" variant="outline" class="min-h-11">搜尋院所</Button>
		</Empty.Content>
	</Empty.Root>
</PublicFrame>
