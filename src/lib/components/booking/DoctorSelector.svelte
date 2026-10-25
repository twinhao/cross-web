<script lang="ts">
	import { NO_PREFERENCE_DOCTOR } from "#lib/constants/booking-constants.ts";
	import type { DoctorOption } from "#lib/types/booking.ts";
	import DoctorCard from "./DoctorCard.svelte";

	// 移植自舊版 components/booking/doctor-selector.tsx
	let {
		doctors,
		selectedDoctor,
		onSelectDoctor,
		primaryColor,
	}: {
		doctors: DoctorOption[];
		selectedDoctor: DoctorOption | null;
		onSelectDoctor: (doctor: DoctorOption) => void;
		primaryColor?: string;
	} = $props();

	const allOptions = $derived([NO_PREFERENCE_DOCTOR, ...doctors]);
</script>

<div class="space-y-4">
  <div><h2 class="text-base font-semibold">服務人員</h2><p class="mt-1 text-sm leading-6 text-muted-foreground">可指定人員，或選擇不指定，查看院所可安排的時間。</p></div>
  <div class="grid gap-3 sm:grid-cols-2">
    {#each allOptions as doctor, i (i)}<DoctorCard {doctor} isSelected={selectedDoctor?.id === doctor.id} onSelect={onSelectDoctor} {primaryColor}/>{/each}
  </div>
</div>
