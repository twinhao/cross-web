<script lang="ts">
	import PageIntro from "#lib/components/public/PageIntro.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";
	import Seo from "#lib/components/Seo.svelte";

	let { data } = $props();

	// App Store 規定的支援網址：民眾端常見問題與客服聯絡方式
	const faqs = [
		{
			q: "如何預約？",
			a: "在「探索」找到院所，進入院所頁點「立即預約」，依序選擇服務、醫師與時段，確認看診人資料後送出即可。",
		},
		{
			q: "如何取消預約？",
			a: "到「預約」分頁點選該筆預約，在詳情頁點「取消預約」。如需改期，請先取消再重新預約，或直接聯繫院所。",
		},
		{
			q: "看診號與叫號進度在哪裡看？",
			a: "預約成功後會顯示看診號。到院報到後，可在預約詳情即時查看目前叫號；開啟通知後也會顯示在動態島與鎖定畫面。",
		},
		{
			q: "為什麼沒收到預約提醒？",
			a: "提醒會在看診前一天傍晚以推播送出。請到 iPhone「設定 → 通知 → Cross」確認已允許通知。",
		},
		{
			q: "看診人資料可以修改嗎？",
			a: "可以。到「我的 → 看診人管理」新增、修改或停用家人資料。證件號碼會加密保存，畫面只顯示末 4 碼。",
		},
		{
			q: "如何刪除帳號？",
			a: "到「我的」頁面最下方點「刪除帳號」，帳號、看診人、收藏與通知設定會立即刪除且無法復原。院所端的就診紀錄依法由院所保存，會解除與您帳號的連結。",
		},
		{
			q: "我是院所，想加入 Cross？",
			a: "請到院所導入頁申請，驗證信箱後即可開通後台並免費試用。",
		},
	];
</script>

<Seo {...data.seo} />

<PublicFrame>
	<PageIntro eyebrow="CROSS / 使用說明與政策" title="客服與支援" />
	<div class="home-container py-10 sm:py-14">
		<div class="mx-auto max-w-3xl space-y-6">
			<section class="rounded-3xl border border-border bg-card p-6 sm:p-9">
				<h2 class="text-lg font-semibold text-foreground">聯絡我們</h2>
				<p class="mt-2 text-base leading-8 text-muted-foreground">
					使用上遇到問題、想更正或刪除個人資料，請來信
					<a class="font-medium text-primary underline-offset-4 hover:underline" href="mailto:office@twinhao.com">office@twinhao.com</a>，
					我們會在 2 個工作天內回覆。預約時間或療程內容請直接聯繫該院所。
				</p>
			</section>

			<section class="rounded-3xl border border-border bg-card p-6 sm:p-9">
				<h2 class="text-lg font-semibold text-foreground">常見問題</h2>
				<dl class="mt-4 divide-y divide-border">
					{#each faqs as item (item.q)}
						<div class="py-4 first:pt-0 last:pb-0">
							<dt class="font-medium text-foreground">{item.q}</dt>
							<dd class="mt-1 leading-7 text-muted-foreground">
								{item.a}
								{#if item.q.startsWith("我是院所")}<a class="text-primary underline-offset-4 hover:underline" href="/join">前往院所導入</a>{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</section>

			<p class="text-center text-sm text-muted-foreground">
				相關政策：<a class="text-primary hover:underline" href="/privacy">隱私權政策</a>・<a class="text-primary hover:underline" href="/terms">服務條款</a>
			</p>
		</div>
	</div>
</PublicFrame>
