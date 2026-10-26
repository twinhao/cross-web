<script lang="ts">
	import { Button } from "#lib/components/ui/button/index.js";
	import ThemeToggle from "#lib/components/ThemeToggle.svelte";
	import AuthButton from "./AuthButton.svelte";
	import ClinicEntry from "./ClinicEntry.svelte";
	import { getAuth } from "#lib/auth/auth.svelte.ts";
	import { page } from "$app/state";
	import { canAccessAdmin } from "#lib/auth/roles.ts";
	import { isAppointmentPage } from "#lib/member/navigation.ts";

	let { home = false, compact = false }: { home?: boolean; compact?: boolean } = $props();
	const auth = getAuth();
	const isAdmin = $derived(canAccessAdmin(auth.user));
</script>

<header class="glass-bar sticky top-0 z-50 border-b border-border/70">
	<div
		class="home-container flex h-16 flex-nowrap items-center justify-between gap-2 sm:h-20"
	>
		<a href="/" class="flex shrink-0 items-center gap-2.5" aria-label="Cross 首頁">
			<img src="/cross-icon.png" alt="" width="32" height="32" class="size-8 rounded-lg" />
			<span class="hidden text-lg font-semibold tracking-tight min-[360px]:inline">Cross</span>
		</a>
		<nav aria-label="主要導覽" class="flex items-center gap-1 sm:gap-2">
			{#if !compact}
			<Button
				href={`${home ? "" : "/"}#how-it-works`}
				variant="ghost"
				size="sm"
				class="hidden lg:inline-flex"
			>
				如何預約
			</Button>
			<Button href="/search" size="sm" class="min-h-11">線上預約</Button>
			{#if !auth.isLoading && !isAdmin}
				<Button href="/member" aria-current={isAppointmentPage(page.url.pathname) ? "page" : undefined} variant={isAppointmentPage(page.url.pathname) ? "secondary" : "ghost"} size="sm" class="min-h-11">我的預約</Button>
			{/if}
			{#if !isAdmin}<span class={auth.isAuthenticated ? "hidden md:inline-flex" : "inline-flex"}><ClinicEntry /></span>{/if}
			{/if}
			<span class="hidden md:inline-flex">
				<ThemeToggle class={home ? "size-11" : undefined} />
			</span>
			<span class={compact ? (auth.isAuthenticated ? "inline-flex" : "hidden") : (auth.isAuthenticated ? "inline-flex" : "hidden md:inline-flex")}>
				<AuthButton next={compact ? page.url.pathname : undefined}/>
			</span>
		</nav>
	</div>
</header>
