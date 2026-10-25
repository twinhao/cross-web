<script lang="ts">
	import { untrack } from "svelte";
	import { tick } from "svelte";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Skeleton } from "#lib/components/ui/skeleton/index.js";
	import BookingSummary from "./BookingSummary.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { bookingApi } from "#lib/api/booking.ts";
	import { getAuth } from "#lib/auth/auth.svelte.ts";
	import { AvailableSlots } from "#lib/booking/available-slots.svelte.ts";
	import {
		bookingAuthPath,
		bookingSuccessPath,
		canProceed as canProceedFor,
		nextButtonLabel as nextButtonLabelFor,
		restoreBookingDraft,
		saveBookingDraft,
		submitHint as submitHintFor,
	} from "#lib/booking/booking-flow.ts";
	import { availableSlotForSelection } from "#lib/booking-draft.ts";
	import { isDemoClinic } from "#lib/clinic-discovery.ts";

	import PatientSelector from "#lib/components/patient/PatientSelector.svelte";
	import type { ClinicConfig, DoctorOption, ServiceOption } from "#lib/types/booking.ts";
	import type { PaymentType } from "#lib/types/clinic.ts";
	import type { MemberPatientRead } from "#lib/types/member-patient.ts";
	import { setBookingStore } from "./booking-context.svelte";
	import BookingForm from "./BookingForm.svelte";
	import BookingSection from "./BookingSection.svelte";
	import BookingStepper from "./BookingStepper.svelte";
	import ClinicHeader from "./ClinicHeader.svelte";
	import DatePicker from "./DatePicker.svelte";
	import DoctorSelector from "./DoctorSelector.svelte";
	import ServiceList from "./ServiceList.svelte";
	import StickySubmitButton from "./StickySubmitButton.svelte";
	import TimeSlotGrid from "./TimeSlotGrid.svelte";

	// 移植自舊版 components/booking/booking-flow.tsx。本元件即舊版的 <BookingProvider><BookingFlow /></BookingProvider>：
	// 建立預約流程狀態（context），子元件 BookingForm 由 context 取用。
	let {
		clinicId,
		clinicConfig,
		services,
		doctors,
		paymentType,
	}: {
		clinicId: string;
		clinicConfig: ClinicConfig;
		services: ServiceOption[];
		doctors: DoctorOption[];
		/** 院所付款方式（健保 / 自費 / 兩者）；服務的健保 badge 依此 gating */
		paymentType?: PaymentType;
	} = $props();

	const auth = getAuth();
	const store = setBookingStore();

	// 個別欄位以 $derived 取出：reducer 對沒變的欄位保留同一個參照，只有真的換了才觸發下游（同舊版 React 依賴比對）
	const selection = $derived(store.state.selection);
	const formData = $derived(store.state.formData);
	const currentStep = $derived(store.state.currentStep);
	const selectedService = $derived(selection.service);
	const selectedDoctor = $derived(selection.doctor);

	const slots = new AvailableSlots();
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	let selectedPatient = $state.raw<MemberPatientRead | null>(null);
	const isDemo = $derived(isDemoClinic(clinicId));
  $effect(()=>{void auth.user?.id;selectedPatient=null;});

	const sessionStore = () => sessionStorage;

	// 登入後回到原本選取的時段；重新取得名額後才允許送出。
	$effect(() => {
		const draft = restoreBookingDraft(sessionStore, clinicId, services, doctors);
		if (draft) store.dispatch({ type: "RESTORE_SELECTION", payload: draft });
	});

	const primaryColor = $derived(clinicConfig.primary_color);
  let stepContent=$state<HTMLDivElement>();
  let timePanel=$state<HTMLDivElement>();
  async function chooseDate(date:string){
    submitError=null;
    store.dispatch({type:"SET_DATE",payload:date});
    await tick();
    timePanel?.focus({preventScroll:true});
    timePanel?.scrollIntoView({block:"start",behavior:"instant"});
  }
  async function focusStep() {
    await tick();
    stepContent?.focus({ preventScroll:true });
    stepContent?.scrollIntoView({block:"start",behavior:"instant"});
  }

	const loadSlots = () => {
		const service = selectedService;
		if (!service) return;
		const doctorId = selectedDoctor?.id ?? null;
		slots.load(() => bookingApi.getAvailableSlots(clinicId, service.id, doctorId));
	};

	// 載入可預約時段：第 3 步且已選服務時。依賴同舊版 useEffect [currentStep, selection.service, loadSlots]
	// （loadSlots 依賴 clinicId、service、doctor）：任一改變即作廢進行中的請求（舊版 effect 清除），再視需要重抓。
	$effect(() => {
		const step = currentStep;
		const service = selectedService;
		void selectedDoctor;
		void clinicId;
		if (step >= 2 && service) untrack(loadSlots);
		return () => slots.cancel();
	});

	// 取得選取日期的時段
	const selectedDateSlots = $derived.by(() => {
		if (!selection.date) return [];
		const dateInfo = slots.dates.find((d) => d.date === selection.date);
		return dateInfo?.slots || [];
	});
	const currentSlot = $derived(availableSlotForSelection(slots.dates, selection));
	const validSlot = $derived(Boolean(currentSlot && !slots.isLoading && !slots.error));

	// 判斷是否可以進入下一步
	const canProceed = $derived(
		canProceedFor({
			currentStep,
			selection,
			privacyAccepted: formData.privacyAccepted,
			hasPatient: selectedPatient !== null,
			validSlot,
			authLoading: auth.isLoading,
			isAuthenticated: auth.isAuthenticated,
			isDemo,
		}),
	);

	// 下一步按鈕文字
	const nextButtonLabel = $derived(nextButtonLabelFor(currentStep, auth.isAuthenticated, isDemo));

	// sticky 按鈕上方的選取摘要提示
	const submitHint = $derived(submitHintFor(selection, currentStep));
  const actionHint = $derived(isDemo ? "示範院所不會建立實際預約" : isSubmitting ? "正在確認名額，請稍候" : !selection.service ? "先選擇一項想預約的服務" : currentStep === 2 && (!selection.date || !selection.timeSlot) ? "選擇日期與時段後，即可繼續" : currentStep === 3 && auth.isAuthenticated && !selectedPatient ? "請選擇本次預約對象" : currentStep === 3 && auth.isAuthenticated && !formData.privacyAccepted ? "請核對資料並勾選同意條款" : submitHint);


	// 處理下一步
	const handleNext = async () => {
		if (!canProceed || isSubmitting) return;

		if (currentStep === 3) {
			if (isDemo || !validSlot) return;
			if (!auth.isAuthenticated) {
				saveBookingDraft(sessionStore, clinicId, selection);
				goto(bookingAuthPath(page.url.pathname));
				return;
			}
			// 送出預約
			if (!selection.service || !selection.date || !selection.timeSlot || !selectedPatient) {
				return;
			}

			isSubmitting = true;
			submitError = null;
			try {
				const response = await bookingApi.createBooking({
					clinic_id: clinicId,
					member_patient_id: selectedPatient.id,
					service_id: selection.service.id,
					doctor_id: selection.doctor?.id ?? null,
					appointment_date: selection.date,
					appointment_time: selection.timeSlot.time,
					notes: formData.notes || undefined,
				});

				// 導向成功頁（舊版 router.push 不等待導航完成，送出鈕隨即恢復）
				goto(bookingSuccessPath(clinicId, response.id, response.booking_number));
			} catch (error) {
				console.error("Booking failed:", error);
				const status = error && typeof error === "object" && "status" in error ? error.status : null;
        if (status === 409) {
          submitError = "此時段已無法預約，請重新選擇可約時間。";
          store.dispatch({ type: "GO_TO_STEP", payload: 2 });
          loadSlots();
        } else submitError = "預約未完成，請稍後重試；你的選擇與填寫資料已保留。";
        await focusStep();
			} finally {
				isSubmitting = false;
			}
		} else {
			store.dispatch({ type: "NEXT_STEP" });
			await focusStep();
		}
	};

	// 處理返回上一步
	const handleStepClick = (step: 1 | 2 | 3) => {
		if (!isSubmitting && step < currentStep) {
			store.dispatch({ type: "GO_TO_STEP", payload: step });
			void focusStep();
		}
	};
</script>

<div class="min-h-[80vh] bg-background pb-44 sm:pb-32">
  <ClinicHeader clinic={clinicConfig}/>
  <BookingStepper {currentStep} onStepClick={handleStepClick} {primaryColor}/>
  <div class="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
    <div bind:this={stepContent} tabindex="-1" class="min-w-0 scroll-mt-44 outline-none">
      <p class="mb-3 text-xs text-muted-foreground">步驟 {currentStep} / 3</p>
      {#if isDemo}<p class="mb-5 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6">這是示範院所，可體驗選擇流程，不會建立實際預約。<a href="/search" class="ml-1 text-primary underline">查看合作店家</a></p>{/if}
      {#if submitError}<div role="alert" class="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">{submitError}</div>{/if}
      {#if currentStep === 1}
        <ServiceList {services} selectedService={selection.service} onSelectService={service => store.dispatch({type:"SET_SERVICE",payload:service})} {primaryColor} {paymentType}/>
      {:else if currentStep === 2}
        <div class="space-y-6">
          <div><h2 class="text-xl font-semibold tracking-tight">選擇預約時間</h2><p class="mt-2 text-sm leading-6 text-muted-foreground">選擇服務人員，再挑選適合你的日期與時段。</p></div>
          <DoctorSelector {doctors} selectedDoctor={selectedDoctor} onSelectDoctor={doctor => store.dispatch({type:"SET_DOCTOR",payload:doctor})} {primaryColor}/>
          <BookingSection title="日期與時段">
            {#if slots.isLoading}
              <div role="status" aria-label="載入可約時段中" class="space-y-4"><Skeleton class="h-8 w-36"/><Skeleton class="h-64 w-full rounded-xl"/></div>
            {:else if slots.error}
              <div role="alert" class="space-y-3 py-6 text-center"><p class="text-sm text-muted-foreground">無法載入可預約時段，請稍後再試</p><Button variant="outline" class="min-h-11 rounded-xl" onclick={loadSlots}>重新載入</Button></div>
            {:else}
              <div class="grid gap-6 @container xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div class="min-w-0">{#key `${selectedService?.id}-${selectedDoctor?.id}`}<DatePicker dates={slots.dates} selectedDate={selection.date} onSelectDate={chooseDate} {primaryColor}/>{/key}</div>
                <div bind:this={timePanel} tabindex="-1" class="min-w-0 scroll-mt-44 border-t border-border/70 pt-5 outline-none xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
                  {#if selection.date}<h3 class="mb-4 text-sm font-semibold">{selection.date.slice(5).replace("-"," / ")} 的可約時間</h3><TimeSlotGrid slots={selectedDateSlots} selectedSlot={currentSlot ?? null} onSelectSlot={slot => {submitError=null;store.dispatch({type:"SET_TIME_SLOT",payload:slot});}} {primaryColor}/>{:else}<div class="rounded-xl bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">先選擇左側或上方日曆的日期，即可查看當天時段。</div>{/if}
                </div>
              </div>
            {/if}
            {#if !slots.isLoading && !slots.error && selection.timeSlot && !currentSlot}<p class="mt-4 text-sm text-destructive" role="status">原先選取的時段已無法預約，請重新選擇。</p>{/if}
          </BookingSection>
        </div>
      {:else}
        <div class="space-y-6">
          <div><h2 class="text-xl font-semibold tracking-tight">確認預約資料</h2><p class="mt-2 text-sm leading-6 text-muted-foreground">核對服務、時間與預約對象，確認後再送出。</p></div>
          <div class="lg:hidden"><BookingSummary clinic={clinicConfig} {selection} {paymentType} onEdit={handleStepClick} compact/></div>
          {#if slots.isLoading}<p role="status" class="text-sm text-muted-foreground">正在重新確認可約名額…</p>{:else if slots.error || !validSlot}<div role="alert" class="space-y-3 rounded-xl border p-4"><p class="text-sm">無法確認這個時段的剩餘名額，請返回重新選擇。</p><Button variant="outline" class="min-h-11 rounded-xl" onclick={() => handleStepClick(2)}>重新選擇時段</Button></div>{/if}
          {#if auth.isAuthenticated && !isDemo}
            <fieldset disabled={isSubmitting} class="min-w-0 space-y-6">
              <BookingSection title="這次為誰預約？"><PatientSelector selectedId={selectedPatient?.id || null} onSelect={patient => selectedPatient = patient}/></BookingSection>
              <BookingSection title="備註與同意"><BookingForm {primaryColor}/></BookingSection>
            </fieldset>
          {:else if !isDemo}
            <BookingSection title="登入後完成預約"><p class="text-sm leading-7 text-muted-foreground">登入後選擇本人或家人，即可完成預約。你選擇的服務與時間會暫存 30 分鐘，登入後會再次確認名額。</p></BookingSection>
          {/if}
        </div>
      {/if}
    </div>
    <aside aria-label="預約摘要" class="hidden min-w-0 lg:sticky lg:top-44 lg:block">
      <BookingSummary clinic={clinicConfig} {selection} {paymentType} onEdit={currentStep > 1 ? handleStepClick : undefined}/>
      <p class="mt-4 px-1 text-xs leading-6 text-muted-foreground">{isDemo ? "示範體驗不會建立預約。" : "送出前不會保留名額，預約結果以成功確認頁為準。"}</p>
    </aside>
  </div>
  <StickySubmitButton label={nextButtonLabel} onClick={handleNext} onBack={currentStep > 1 ? () => handleStepClick((currentStep - 1) as 1 | 2) : undefined} disabled={!canProceed} isLoading={isSubmitting} {primaryColor} hint={actionHint}/>
</div>
