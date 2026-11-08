<script lang="ts">
  import ClinicReadiness from "./ClinicReadiness.svelte";
  import AdminSkeleton from "../layout/AdminSkeleton.svelte";
  import { SvelteURL } from "svelte/reactivity";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Button } from "#lib/components/ui/button/index.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";
  import { Share2, ArrowUpRight } from "@lucide/svelte";
  import AdminFrame from "../layout/AdminFrame.svelte";
  import { getAuth } from "#lib/auth/auth.svelte.ts";
  import { isSystemAdmin, canManageFacility, canOperateFacility } from "#lib/auth/roles.ts";
  import { workspaceParams } from "#lib/admin/navigation.ts";
  import { taipeiToday } from "#lib/constants/appointment.ts";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import {
    clinicHref,
    PANEL_LABELS,
    SETTINGS_PANELS,
  } from "#lib/admin/workspace.ts";
  import { apiMessage } from "#lib/admin/scheduling.ts";
  import { canAccessFeature } from "#lib/feature-access.ts";
  import { subscriptionWarning } from "#lib/admin/subscription.ts";
  import type { MedicalFacility } from "#lib/types/clinic.ts";
  import Appointments from "./Appointments.svelte";
  import Queue from "./Queue.svelte";
  import Schedule from "./Schedule.svelte";
  import Customers from "./Customers.svelte";
  import ClinicEditor from "../manage/ClinicEditor.svelte";
  import ClinicPhotoManager from "../manage/ClinicPhotoManager.svelte";
  import Personnel from "../manage/Personnel.svelte";
  import Services from "../manage/Services.svelte";
  import Announcements from "../manage/Announcements.svelte";
  import Analytics from "../manage/Analytics.svelte";
  import Subscription from "../manage/Subscription.svelte";
  import Modal from "../manage/Modal.svelte";
  import Feedback from "../manage/Feedback.svelte";
  import ShareClinicDialog from "#lib/components/clinics/ShareClinicDialog.svelte";
  import { inDemoContext } from "#lib/demo/context.ts";
  const demoSession = inDemoContext();
  let { name, facilityId }: { name: string; facilityId: string } = $props();
  const auth = getAuth();
  const system = $derived(isSystemAdmin(auth.user));
  const canManageGallery = $derived(canManageFacility(auth.user, facilityId));
  const canOperate = $derived(canOperateFacility(auth.user, facilityId));
  let galleryOpen = $state(false), galleryBusy = $state(false);
  let galleryManager = $state<{ savePending: () => Promise<boolean> }>();
  async function finishGallery() {
    if (!galleryBusy && (!galleryManager || await galleryManager.savePending())) galleryOpen = false;
  }
  const tab = $derived(
    name === "dashboard"
      ? "today"
      : name === "analytics"
        ? "analytics"
        : name === "subscription"
          ? "subscription"
          : PANEL_LABELS[page.url.searchParams.get("tab") ?? ""]
            ? page.url.searchParams.get("tab")!
            : system
              ? "info"
              : "appointments",
  );
  const heading = $derived(
    tab === "today"
      ? "今日工作台"
      : tab === "subscription"
        ? "我的訂閱"
        : PANEL_LABELS[tab],
  );
  const todayHref = $derived(
    system || demoSession ? clinicHref(facilityId, "today") : "/admin/dashboard",
  );
  const subscriptionHref = $derived(
    system || demoSession ? clinicHref(facilityId, "subscription") : "/admin/subscription",
  );
  const navigation = $derived([
    { key: "today", label: "今日工作台", href: todayHref },
    {
      key: "appointments",
      label: "預約管理",
      href: clinicHref(facilityId, "appointments"),
    },
    {
      key: "queue",
      label: "叫號與報到",
      href: clinicHref(facilityId, "queue"),
    },
    {
      key: "patients",
      label: "客戶管理",
      href: clinicHref(facilityId, "patients"),
    },
    {
      key: "schedule",
      label: "排班管理",
      href: clinicHref(facilityId, "schedule"),
    },
    {
      key: "analytics",
      label: "營運分析",
      href: clinicHref(facilityId, "analytics"),
    },
    { key: "info", label: "院所設定", href: clinicHref(facilityId, "info") },
    { key: "subscription", label: "我的訂閱", href: subscriptionHref },
  ]);
  let facility = $state<MedicalFacility | null>(null),
    loading = $state(true),
    error = $state(""),
    revision = $state(0),
    edit = $state(false),
    remove = $state(false),
    saving = $state(false),
    notice = $state(""),
    deleteError = $state(""),
    share = $state(false);
  $effect(() => {
    const id = facilityId,
      r = revision;
    void r;
    let active = true;
    loading = true;
    error = "";
    adminClinicsApi
      .get(id)
      .then((data) => {
        if (active) facility = data;
      })
      .catch((e) => {
        if (active) error = apiMessage(e, "無法載入院所資料，請重試");
      })
      .finally(() => {
        if (active) loading = false;
      });
    return () => {
      active = false;
    };
  });
  const subscriptionIssue = $derived(facility ? subscriptionWarning(facility) : null);
  const pageHasSubscriptionGate = $derived(!!facility && (
    (tab === "queue" && canOperate && !canAccessFeature(facility, "queue_management")) ||
    (tab === "analytics" && !canAccessFeature(facility, "analytics")) ||
    (tab === "stats" && !canAccessFeature(facility, "advanced_queue"))
  ));
  async function deleteClinic() {
    saving = true;
    deleteError = "";
    try {
      await adminClinicsApi.delete(facilityId);
      await goto("/admin/clinics");
    } catch (e) {
      deleteError = apiMessage(e, "刪除院所失敗，請重試");
    } finally {
      saving = false;
    }
  }
  function hrefFor(key: string) {
    const url = new SvelteURL(page.url.href);
    url.pathname = demoSession ? "/demo" : `/admin/clinics/${facilityId}`;
    if (demoSession) url.searchParams.set("mode", "admin");
    url.search = workspaceParams(url.searchParams, tab, key, taipeiToday()).toString();
    return url.pathname + url.search;
  }
  const settingsPanels = $derived(SETTINGS_PANELS.filter(key => key !== "announcements" || canManageGallery));
  const settingsNavigation = $derived(settingsPanels.map(key => ({
    key, label: key === "info" ? "基本資料" : PANEL_LABELS[key], href: hrefFor(key),
  })));
</script>

<div class="cross-admin min-h-dvh bg-background">
  <AdminFrame
    heading={heading ?? "院所工作區"}
    facilityName={facility?.name ?? ""}
    {system}
    activeKey={tab === "stats"
        ? "analytics"
        : tab}
    groups={[
      {
        label: "日常作業",
        items: [navigation[0], navigation[1], navigation[2], navigation[4]].filter(item => item.key !== "queue" || canOperate).map(
          (item) => ({
            ...item,
            href: item.key === "today" ? item.href : hrefFor(item.key),
          }),
        ),
      },
      {
        label: "客戶與營運",
        items: [navigation[3], navigation[5]].map((item) => ({
          ...item,
          href: hrefFor(item.key),
        })),
      },
      {
        label: "設定與帳務",
        items: navigation
          .slice(6)
          .map((item) => ({
            ...item,
            href: item.key === "subscription" ? item.href : hrefFor(item.key),
            ...(item.key === "info" ? { children: settingsNavigation } : {}),
          })),
      },
    ]}
    mobile={[
      { key: "today", label: "今日", href: todayHref },
      { key: "appointments", label: "預約", href: hrefFor("appointments") },
      canOperate ? { key: "queue", label: "叫號", href: hrefFor("queue") } : {key: "patients", label: "客戶", href: hrefFor("patients")},
    ]}
  >
    {#snippet actions()}<Button
        variant="outline"
        size="sm"
        aria-label="分享院所頁"
        onclick={() => (share = true)}
      >
        <Share2 class="size-4" />
        <span class="hidden sm:inline">分享院所頁</span>
      </Button><Button
        href={demoSession ? "/demo" : "/clinic/" + facilityId}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        variant="outline"
        aria-label="查看公開頁"
      >
        <ArrowUpRight class="size-4" />
        <span class="hidden sm:inline">查看公開頁</span>
      </Button>{/snippet}
    <div class="space-y-7" data-native-workspace="true">
      {#if error}<div
          role="alert"
          class="space-y-2 rounded-xl bg-destructive/10 p-4 text-destructive"
        >
          <p>{error}</p>
          <Button variant="outline" onclick={() => revision++}>
            重試院所資料
          </Button>
        </div>{/if}
      {#if notice}<p
          role="status"
          class="rounded-xl bg-primary/10 p-3 text-primary"
        >
          {notice}
        </p>{/if}
      {#if loading && !facility}<AdminSkeleton
          label="正在載入院所工作區…"
          variant="dashboard"
        />
      {:else if facility}
        {#if subscriptionIssue && tab !== "subscription" && !pageHasSubscriptionGate}<p
            role="status"
            aria-label="訂閱提醒"
            class="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            {subscriptionIssue}
            <a href={subscriptionHref} class="ml-2 text-primary underline">
              查看訂閱
            </a>
          </p>{/if}
        {#if tab === "today" || tab === "info"}{#key facility}<ClinicReadiness {facility} {subscriptionHref} compact={tab === "today"} />{/key}{/if}
        {#if tab === "today" || tab === "appointments"}<Appointments
            {facility}
            workbench={tab === "today"}
          />
        {:else if tab === "queue"}<Queue {facility} {subscriptionHref} />
        {:else if tab === "schedule"}<Schedule {facility} />
        {:else if tab === "patients"}<Customers {facilityId} />
        {:else if tab === "analytics" || tab === "stats"}<div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h1 class="text-2xl font-semibold tracking-tight">營運分析</h1>
              <nav class="flex gap-2" aria-label="分析分類">
                <Button
                  aria-current={tab === "analytics" ? "page" : undefined}
                  href={hrefFor("analytics")}
                  variant={tab === "analytics" ? "default" : "outline"}
                >
                  客戶分析
                </Button><Button
                  aria-current={tab === "stats" ? "page" : undefined}
                  href={hrefFor("stats")}
                  variant={tab === "stats" ? "default" : "outline"}
                >
                  看診統計
                </Button>
              </nav>
            </div>
            {#key tab}<Analytics {facility} {subscriptionHref} stats={tab === "stats"} />{/key}
          </div>
        {:else if tab === "subscription"}<div class="space-y-4">
            <h1 class="text-2xl font-semibold tracking-tight">我的訂閱</h1>
            <Subscription
              {facility}
              onUpdated={(value) => (facility = value)}
            />
          </div>
        {:else}
          <div class="space-y-4">
            <h1 class="text-2xl font-semibold tracking-tight">院所設定</h1>
            <Tabs.Root
              value={tab}
              onValueChange={(key) => {
                void goto(hrefFor(key), { reset: false });
              }}
            >
              <Tabs.List
                aria-label="院所設定分類"
                class="grid w-full grid-cols-2 sm:inline-flex sm:w-fit"
              >
                {#each settingsPanels as key (key)}<Tabs.Trigger
                    value={key}
                    class="px-4 py-2"
                  >
                    {PANEL_LABELS[key]}
                  </Tabs.Trigger>{/each}
              </Tabs.List>
              <Tabs.Content value={tab} class="space-y-4">
                {#if tab === "info"}<section
                    class="space-y-4 rounded-2xl border bg-card p-5"
                  >
                    <div
                      class="flex flex-wrap items-center justify-between gap-3"
                    >
                      <h2 class="font-semibold">基本資訊</h2>
                      <div class="flex flex-wrap gap-2">
                      {#if canManageGallery}<Button variant="outline" onclick={() => (galleryOpen = true)}>環境相簿</Button>{/if}
                      {#if canManageGallery}<Button variant="outline" onclick={() => (edit = true)}>
                        編輯資訊
                      </Button>{/if}
                      </div>
                    </div>
                    <dl class="grid gap-4 text-sm sm:grid-cols-2">
                      {#each [{ label: "院所名稱", value: facility.name }, { label: "電話", value: facility.phone }, { label: "地址", value: facility.address }, { label: "預約間隔", value: facility.slot_duration + " 分鐘" }, { label: "院所狀態", value: facility.is_active ? "啟用" : "停用" }, { label: "營業時間", value: facility.business_hours ? Object.entries(facility.business_hours)
                                  .map(([day, h]) => (({ monday: "週一", tuesday: "週二", wednesday: "週三", thursday: "週四", friday: "週五", saturday: "週六", sunday: "週日" })[day] ?? day) + " " + h.open + "–" + h.close)
                                  .join("、") : "未設定" }] as item (item.label)}<div
                        >
                          <dt class="text-muted-foreground">{item.label}</dt>
                          <dd class="mt-1">{item.value || "未填"}</dd>
                        </div>{/each}
                    </dl>
                  </section>
                  {#if system}<section
                      class="space-y-3 rounded-xl border border-destructive/20 p-4"
                    >
                      <h2 class="font-medium text-destructive">刪除院所</h2>
                      <p class="text-sm text-muted-foreground">
                        刪除會移除相關資料，請確認院所與資料用途。
                      </p>
                      <Button
                        variant="destructive"
                        onclick={() => (remove = true)}
                      >
                        刪除此院所
                      </Button>
                    </section>{/if}
                {:else}{#key tab}{#if tab === "personnel"}<Personnel
                        {facilityId}
                      />{:else if tab === "services"}<Services
                        {facilityId}
                      />{:else if tab === "announcements" && canManageGallery}<Announcements
                        {facilityId}
                      />{:else if tab === "announcements"}<p class="rounded-xl border p-4 text-sm text-muted-foreground">公告由院所管理員維護；目前帳號無公告管理權限。</p>{/if}{/key}{/if}
              </Tabs.Content>
            </Tabs.Root>
          </div>
        {/if}
      {/if}
    </div>
  </AdminFrame>
</div>
{#if facility && edit && canManageGallery}<ClinicEditor
    bind:open={edit}
    clinic={facility}
    onSaved={(value) => {
      facility = value;
      notice = "院所資訊已更新";
    }}
  />{/if}
{#if facility && galleryOpen && canManageGallery}<Modal bind:open={galleryOpen} title="管理院所環境相簿" description="讓民眾在院所門面先認識你的空間。" busy={galleryBusy}><ClinicPhotoManager clinicId={facilityId} bind:this={galleryManager} bind:busy={galleryBusy} /><div class="admin-dialog-footer"><Button disabled={galleryBusy} onclick={finishGallery}>{galleryBusy ? "儲存中…" : "完成"}</Button></div></Modal>{/if}
<Modal
  bind:open={remove}
  title="刪除院所"
  description={"確認永久刪除「" +
    (facility?.name ?? "") +
    "」及其相關資料？此操作無法復原。"}
  busy={saving}
>
  <Feedback error={deleteError} />
  <div class="mt-4 flex justify-end gap-2">
    <Button
      variant="outline"
      disabled={saving}
      onclick={() => (remove = false)}
    >
      取消
    </Button><Button
      variant="destructive"
      disabled={saving}
      onclick={deleteClinic}
    >
      確認永久刪除
    </Button>
  </div>
</Modal>
{#if facility}<ShareClinicDialog
    bind:open={share}
    clinicId={facilityId}
    clinicName={facility.name}
  />{/if}
