<script lang="ts">
	import CalendarDays from "@lucide/svelte/icons/calendar-days";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import Clock from "@lucide/svelte/icons/clock";
	import MapPin from "@lucide/svelte/icons/map-pin";
	import Stethoscope from "@lucide/svelte/icons/stethoscope";
	import { untrack } from "svelte";
	import { memberAppointmentApi, type MemberAppointment } from "#lib/api/member-appointment.ts";
	import { requireMember } from "#lib/auth/auth.svelte.ts";

	import { Badge } from "#lib/components/ui/badge/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Card } from "#lib/components/ui/card/index.js";
	import { Skeleton } from "#lib/components/ui/skeleton/index.js";
	import { Tabs, TabsContent, TabsList, TabsTrigger } from "#lib/components/ui/tabs/index.js";
	import { APPOINTMENT_STATUS_LABELS, QUEUE_ACTIVE_STATUSES } from "#lib/constants/appointment.ts";
	import {
		STATUS_VARIANT,
		formatMonthDay,
		formatTime,
		formatWeekday,
		groupMemberAppointments,
	} from "#lib/member/appointments.ts";

	// 移植自舊版 app/member/page.tsx
	// 守衛：未登入導向登入頁，後台帳號（管理員 / 院所）導回後台，不渲染民眾端內容
	const guard = requireMember(() => "/member");

	let appointments = $state.raw<MemberAppointment[]>([]);
	let isLoading = $state(true);

	let appointmentsError = $state("");
	let appointmentsLoaded = $state(false);
	let updatedAt = $state("");
	let requestVersion = 0;
	async function fetchData() {
		const version = ++requestVersion;
		isLoading = true;
		try {
			const result = await memberAppointmentApi.list();
			if (version !== requestVersion) return;
			appointments = result;
			appointmentsLoaded = true;
			appointmentsError = "";
			updatedAt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" }).format(new Date());
		} catch {
			if (version === requestVersion) appointmentsError = "暫時無法取得預約紀錄，請重試確認。";
		} finally {
			if (version === requestVersion) isLoading = false;
		}
	}

	$effect(() => {
		if (!guard.ready) return;
		untrack(fetchData);
		return () => { requestVersion++; };
	});

	const groups = $derived(groupMemberAppointments(appointments));

</script>

{#snippet emptyState(text: string, showCta: boolean)}
	<Card class="flex flex-col items-center gap-3 p-10 text-center">
		<span class="text-muted-foreground"><CalendarDays class="size-10" /></span>
		<p class="text-sm text-muted-foreground">{text}</p>
		{#if showCta}<Button href="/search" size="sm">立即預約</Button>{/if}
	</Card>
{/snippet}

{#snippet appointmentCard(appt: MemberAppointment, highlight: boolean)}
	<a href="/member/appointments/{appt.id}" class="block">
		<Card class="group overflow-hidden p-0 transition-shadow hover:shadow-md">
			<div class="flex items-stretch">
				<!-- 日期區塊 -->
				<div
					class={highlight
						? "flex w-20 shrink-0 flex-col items-center justify-center bg-primary py-4 text-primary-foreground"
						: "flex w-20 shrink-0 flex-col items-center justify-center bg-muted py-4 text-muted-foreground"}
				>
					<div class="text-lg leading-none font-bold">{formatMonthDay(appt.appointment_date)}</div>
					<div class="mt-1 text-[11px] opacity-80">{formatWeekday(appt.appointment_date)}</div>
					<div class="mt-1.5 flex items-center gap-0.5 text-xs font-medium">
						<Clock class="size-3" />
						{formatTime(appt.appointment_time)}
					</div>
				</div>

				<!-- 內容 -->
				<div class="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
							<MapPin class="size-3.5 shrink-0 text-muted-foreground" />
							<span class="truncate">{appt.facility_name}</span>
						</div>
						<Badge variant={STATUS_VARIANT[appt.status]} class="shrink-0">
							{APPOINTMENT_STATUS_LABELS[appt.status]}
						</Badge>
					</div>
					{#if appt.staff_name}
						<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Stethoscope class="size-3.5 shrink-0" />
							{appt.staff_name}
						</div>
					{/if}
					<div class="flex items-center justify-between gap-2">
						<div class="text-xs text-muted-foreground">預約編號 {appt.booking_number}</div>
						<ChevronRight
							class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
						/>
					</div>
				</div>
			</div>
		</Card>
	</a>
{/snippet}

<!-- 依分頁渲染一組預約卡片，空時顯示空狀態 -->
{#snippet appointmentGroup(items: MemberAppointment[], emptyText: string, showEmptyCta = false, highlight = false)}
	{#if items.length === 0}
		{@render emptyState(emptyText, showEmptyCta)}
	{:else}
		<div class="space-y-3">
			{#each items as appt, i (`${appt.id}-${i}`)}
				{@render appointmentCard(appt, highlight && QUEUE_ACTIVE_STATUSES.includes(appt.status))}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet appointmentSkeleton()}
	<Card class="overflow-hidden p-0">
		<div class="flex items-stretch">
			<Skeleton class="h-[88px] w-20 rounded-none" />
			<div class="flex flex-1 flex-col justify-center gap-2 p-4">
				<Skeleton class="h-4 w-2/3" />
				<Skeleton class="h-3 w-1/3" />
				<Skeleton class="h-3 w-1/2" />
			</div>
		</div>
	</Card>
{/snippet}

{#snippet tabCount(count: number)}
	{#if count > 0}<span class="ml-1 text-xs opacity-70">({count})</span>{/if}
{/snippet}

{#if !guard.ready}
	<div class="flex min-h-[60vh] items-center justify-center bg-background">
		<div class="size-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
	</div>
{:else}
	<div class="min-h-[60vh] bg-background pb-12">
		<div class="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
			<!-- 預約紀錄 -->
			<div>
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h1 class="text-xl font-semibold text-foreground">我的預約</h1><p class="mt-2 text-sm text-muted-foreground">查看預約時間、狀態與到訪資訊。</p></div><Button href="/search" size="sm" class="min-h-11">預約服務</Button></div>
                {#if appointmentsError}<div role="alert" class="mb-4 space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"><p>{appointmentsError}</p>{#if appointmentsLoaded}<p class="text-sm text-muted-foreground">以下保留上次資料，最後更新 {updatedAt}（臺北時間）。</p>{/if}<Button variant="outline" disabled={isLoading} onclick={fetchData}>重新載入預約</Button></div>{/if}

				{#if isLoading}
					<div class="space-y-3">
						{@render appointmentSkeleton()}
						{@render appointmentSkeleton()}
					</div>
				{:else if appointmentsLoaded}
					<Tabs value="confirmed">
						<TabsList class="w-full">
							<TabsTrigger value="all">全部{@render tabCount(groups.all.length)}</TabsTrigger>
							<TabsTrigger value="confirmed">已預約{@render tabCount(groups.confirmed.length)}</TabsTrigger>
							<TabsTrigger value="completed">已完成{@render tabCount(groups.completed.length)}</TabsTrigger>
							<TabsTrigger value="cancelled">已取消{@render tabCount(groups.cancelled.length)}</TabsTrigger>
						</TabsList>

						<TabsContent value="all" class="mt-4">
							{@render appointmentGroup(groups.all, "尚無預約紀錄", true)}
						</TabsContent>
						<TabsContent value="confirmed" class="mt-4">
							{@render appointmentGroup(groups.confirmed, "目前沒有即將到來的預約", true, true)}
						</TabsContent>
						<TabsContent value="completed" class="mt-4">
							{@render appointmentGroup(groups.completed, "尚無已完成的預約")}
						</TabsContent>
						<TabsContent value="cancelled" class="mt-4">
							{@render appointmentGroup(groups.cancelled, "尚無已取消的預約")}
						</TabsContent>
					</Tabs>
				{/if}
			</div>

		</div>

	</div>
{/if}
