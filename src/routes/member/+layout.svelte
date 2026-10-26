<script lang="ts">
	import MemberNavigation from "#lib/components/public/MemberNavigation.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";
	import { page } from "$app/state";
	import { isAccountPage } from "#lib/member/navigation.ts";

	// 預約頁維持單一任務；帳戶子頁才呈現帳戶功能導覽。
	let { children } = $props();
</script>

<PublicFrame>{#if isAccountPage(page.url.pathname)}<MemberNavigation />{/if}{@render children()}</PublicFrame>
