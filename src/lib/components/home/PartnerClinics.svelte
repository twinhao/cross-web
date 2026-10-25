<script lang="ts">
  import { onMount } from "svelte";
  import { clinicsApi } from "#lib/api/clinics.ts";
  import type { Clinic } from "#lib/types/clinic.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import ClinicLogo from "#lib/components/clinics/ClinicLogo.svelte";
  import { FACILITY_TYPE_LABELS } from "#lib/constants/clinic-constants.ts";
  let clinics = $state.raw<Clinic[]>([]),
    loading = $state(true),
    failed = $state(false);
  let alive = true;
  async function load() {
    loading = true;
    failed = false;
    try {
      const data = await clinicsApi.getClinics();
      if (alive) clinics = data;
    } catch {
      if (alive) failed = true;
    } finally {
      if (alive) loading = false;
    }
  }
  onMount(() => {
    void load();
    return () => {
      alive = false;
    };
  });
</script>

<section
  class="home-section border-b border-border/60"
  aria-labelledby="partner-title"
>
  <div class="home-container">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="home-eyebrow">從合作院所開始</p>
        <h2 id="partner-title" class="home-heading mt-2">
          看看服務，找到適合的安排。
        </h2>
      </div>
      <Button href="/search?online=1" variant="outline" class="min-h-11">
        找可線上預約的院所
      </Button>
    </div>
    <p class="mt-3 text-sm leading-7 text-muted-foreground">
      每間院所都會標示預約方式。先認識服務與團隊，再選擇線上、電話或現場安排；營業時間不代表仍有可約名額。
    </p>
    {#if loading}<p role="status" class="mt-6 text-sm text-muted-foreground">
        正在載入合作院所…
      </p>
    {:else if failed}<div
        role="alert"
        class="mt-6 flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm"
      >
        暫時無法取得合作院所。<Button variant="outline" onclick={load}>
          重新載入
        </Button>
      </div>
    {:else if !clinics.length}<p class="mt-6 text-sm text-muted-foreground">
        合作院所陸續開放中，可前往搜尋頁查看最新資訊。
      </p>
    {:else}<ul class="mt-7 grid gap-4 md:grid-cols-3">
        {#each clinics.slice(0, 3) as clinic, i (i)}<li>
            <a
              href={`/clinic/${clinic.id}`}
              class="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {#if clinic.images?.[0]}<img src={clinic.images[0]} alt={`${clinic.clinic_name}院所環境`} loading="lazy" class="aspect-[16/9] w-full object-cover" />{/if}
              <div class="flex flex-1 flex-col gap-3 p-6">
              <div class="flex items-center justify-between gap-3">
              <ClinicLogo logo={clinic.logo} name={clinic.clinic_name} />
              {#if clinic.facility_type}<span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{FACILITY_TYPE_LABELS[clinic.facility_type]}</span>{/if}
              </div>
              <h3 class="font-semibold">{clinic.clinic_name}</h3>
              <p class="text-sm text-muted-foreground">
                {clinic.city || "地點請見院所資訊"}
              </p>
              {#if clinic.service_names?.length}<p class="text-sm leading-6 text-muted-foreground">{clinic.service_names.slice(0, 3).join("・")}</p>{/if}
              <p class="mt-auto pt-2 text-sm font-medium text-primary">
                {clinic.online_booking_enabled === true
                  ? "可線上預約"
                  : clinic.phone_booking_enabled
                    ? "電話／現場預約"
                    : "查看到訪方式"}
              </p>
              <span class="border-t border-border pt-3 text-sm group-hover:text-primary">認識院所與服務 →</span>
              </div>
            </a>
          </li>{/each}
      </ul>{/if}
    <Button href="/search" variant="link" class="mt-3 min-h-11 px-0">
      瀏覽所有合作院所 →
    </Button>
  </div>
</section>
