<script lang="ts">
	import AnnouncementsSection from "#lib/components/clinic-detail/AnnouncementsSection.svelte";
	import BookingCard from "#lib/components/clinic-detail/BookingCard.svelte";
	import BusinessHoursSection from "#lib/components/clinic-detail/BusinessHoursSection.svelte";
	import ClinicContactInfo from "#lib/components/clinic-detail/ClinicContactInfo.svelte";
	import ClinicDetailHeader from "#lib/components/clinic-detail/ClinicDetailHeader.svelte";
	import DepartmentBadges from "#lib/components/clinic-detail/DepartmentBadges.svelte";
	import DoctorTeamSection from "#lib/components/clinic-detail/DoctorTeamSection.svelte";
	import RecordView from "#lib/components/clinic-detail/RecordView.svelte";
	import ScheduleTimetable from "#lib/components/clinic-detail/ScheduleTimetable.svelte";
	import ServicePreviewList from "#lib/components/clinic-detail/ServicePreviewList.svelte";
	import StickyBookingButton from "#lib/components/clinic-detail/StickyBookingButton.svelte";
	import TrackView from "#lib/components/clinic-detail/TrackView.svelte";
	import WalkInCard from "#lib/components/clinic-detail/WalkInCard.svelte";
	import Seo from "#lib/components/Seo.svelte";
	import { inDemoContext } from "#lib/demo/context.ts";
	const demoSession = inDemoContext();

	let { data, renderSeo = true } = $props();

	const clinic = $derived(data.clinic);
	const bookingHref = $derived(clinic.online_booking_enabled ? `/booking/${clinic.id}` : clinic.phone_booking_enabled && clinic.phone ? `tel:${clinic.phone}` : "#contact");
	const bookingLabel = $derived(clinic.online_booking_enabled ? "選擇服務與時間" : clinic.phone_booking_enabled && clinic.phone ? "來電詢問與預約" : "查看到訪方式");
</script>

{#snippet servicesSection()}
  {#if clinic.services?.length}<div id="services" class="scroll-mt-28"><ServicePreviewList services={clinic.services} paymentType={clinic.payment_type} {bookingHref} {bookingLabel} /></div>{/if}
{/snippet}

{#snippet teamSection()}
  {#if clinic.members?.length}<div id="team" class="scroll-mt-28"><DoctorTeamSection members={clinic.members} details={data.doctorDetails} /></div>{/if}
{/snippet}

<!-- metadata 與院所 JSON-LD（示範院所不輸出）由 Seo 放進 <head>；舊版 JSON-LD 在 body，爬蟲讀到的內容相同 -->
{#if renderSeo}<Seo {...data.seo} />{/if}

<div class="min-h-screen bg-background pb-28 lg:pb-16">
	<!-- 造訪回報（不渲染任何東西） -->
	{#if !data.isDemo}<TrackView clinicId={clinic.id} />{/if}
	<!-- 記錄一次瀏覽（登入會員，跨裝置同步；純副作用） -->
	{#if !data.isDemo}<RecordView clinicId={data.clinicId} />{/if}

	<!-- Hero：裝飾性 banner + 院所識別卡 -->
	<ClinicDetailHeader {clinic} />
	{#if data.isDemo}<div class="home-container pt-6">
			<p class="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
				示範院所：本頁的團隊、地址、費用與班表僅供功能展示，不提供實際看診服務。
				{#if !demoSession}<a href="/demo" class="mt-2 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">體驗新版示範門面、完整預約與院所後台 →</a>{/if}
			</p>
		</div>{/if}

	<!-- 桌機雙欄：主內容 + 黏性側欄 -->
	<div class="home-container pt-6 sm:pt-8">
		<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<!-- ===== 主內容 ===== -->
			<div class="space-y-6">
				<!-- 公告（最多 3 則 active；無公告自動隱藏） -->
				<AnnouncementsSection announcements={data.announcements} />

				<!-- 診療科別：僅看診大類顯示（元件內自動 gate，非看診不渲染） -->
				<DepartmentBadges departments={clinic.departments} facilityType={clinic.facility_type} />

				{#if clinic.facility_type !== "healthcare"}{@render servicesSection()}{@render teamSection()}{/if}
				<!-- 門診時刻表（醫師排班：早/午/晚 × 週一~週日） -->
				{#if data.showSchedule && data.schedule}
					<ScheduleTimetable schedule={data.schedule} />
				{/if}

				<!-- 團隊成員（點擊顯示詳情） -->
				{#if clinic.facility_type === "healthcare"}{@render teamSection()}{@render servicesSection()}{/if}
			</div>

			<!-- ===== 側欄（桌機黏性） ===== -->
			<aside class="space-y-6 lg:sticky lg:top-28">
				<!-- 線上預約為付費功能：未開通的院所改顯示現場預約（電話由後台勾選才顯示） -->
				{#if clinic.online_booking_enabled}
					<BookingCard clinicId={data.clinicId} class="hidden lg:block" />
				{:else}
					<WalkInCard phone={clinic.phone} phoneBookingEnabled={clinic.phone_booking_enabled} />
				{/if}
				<div id="contact" class="scroll-mt-28"><ClinicContactInfo {clinic} /></div>
				{#if clinic.business_hours && clinic.business_hours.length > 0}
					<BusinessHoursSection businessHours={clinic.business_hours} />
				{/if}
			</aside>
		</div>
	</div>

	<!-- 手機底部 sticky 預約 bar：僅開通線上預約的院所顯示（免費院所用側欄現場預約卡） -->
	{#if clinic.online_booking_enabled}
		<StickyBookingButton clinicId={data.clinicId} />
	{/if}
</div>
