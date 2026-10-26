<script lang="ts">
	import Heart from "@lucide/svelte/icons/heart";
	import UserRound from "@lucide/svelte/icons/user-round";
	import Users from "@lucide/svelte/icons/users";
	import { page } from "$app/state";
	import { cn } from "#lib/utils.ts";
	import { ACCOUNT_LINKS } from "#lib/member/navigation.ts";

	const icons = { "/member/profile": UserRound, "/member/patients": Users, "/member/favorites": Heart };

	const pathname = $derived<string>(page.url.pathname);
</script>

<div class="border-b border-border/60 bg-[#eff4fa] dark:bg-[#142238]">
	<div class="home-container py-6 sm:py-8">
		<p class="home-eyebrow">MY CROSS / 帳戶與偏好</p>
		<nav aria-label="帳戶設定導覽" class="mt-4 grid grid-cols-3 gap-2 sm:flex sm:gap-3">
			{#each ACCOUNT_LINKS as { href, label } (href)}
				{@const Icon = icons[href]}
				{@const active = pathname === href}
				<a
					{href}
					aria-current={active ? "page" : undefined}
					class={cn(
						"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors sm:px-5",
						active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-primary",
					)}><Icon class="hidden size-4 min-[370px]:block" />{label}</a
				>
			{/each}
		</nav>
	</div>
</div>
