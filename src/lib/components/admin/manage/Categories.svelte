<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { SvelteURL } from "svelte/reactivity";
  import { Plus, Search, Trash2, Tags } from "@lucide/svelte";
  import AdminSkeleton from "../layout/AdminSkeleton.svelte";
  import AdminEmpty from "../layout/AdminEmpty.svelte";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";
  import * as NativeSelect from "#lib/components/ui/native-select/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Checkbox } from "#lib/components/ui/checkbox/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { adminServiceCategoriesApi, type ServiceCategoryAdmin } from "#lib/api/admin/service-categories.ts";
  import { FACILITY_TYPE_LABELS } from "#lib/constants/clinic-constants.ts";
  import { refreshServiceTaxonomy } from "#lib/hooks/service-taxonomy.svelte.ts";
  import { apiMessage } from "#lib/admin/scheduling.ts";
  import Feedback from "./Feedback.svelte";
  import Modal from "./Modal.svelte";
  import type { FacilityType } from "#lib/types/clinic.ts";

  const formId = $props.id();
  const groups = Object.entries(FACILITY_TYPE_LABELS).map(([key, name]) => ({ key: key as FacilityType, name }));
  const examples: Record<FacilityType, string> = { healthcare: "例如：皮膚科", aesthetic: "例如：雷射光療", beauty: "例如：臉部護理", other: "例如：健康諮詢" };
  const currentType = $derived(groups.find((group) => group.key === page.url.searchParams.get("category_type"))?.key ?? "healthcare");
  let rows = $state<ServiceCategoryAdmin[]>([]), loading = $state(true), error = $state(""),
    formError = $state(""), message = $state(""), revision = $state(0), query = $state(""),
    status = $state("all"), open = $state(false), remove = $state(false),
    selected = $state<ServiceCategoryAdmin | null>(null), type = $state<FacilityType>("healthcare"),
    label = $state(""), order = $state<number | undefined>(0), active = $state(true), busy = $state(false);
  const groupRows = $derived(rows.filter((row) => row.facility_type === currentType));
  const visible = $derived(groupRows.filter((row) =>
    (!query.trim() || row.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
    (status === "all" || row.is_active === (status === "active")),
  ).sort((a, b) => a.sort_order - b.sort_order));
  const filtered = $derived(!!query.trim() || status !== "all");
  const validOrder = $derived(typeof order === "number" && Number.isInteger(order) && order >= -2147483648 && order <= 2147483647);
  const canSave = $derived(!busy && !!label.trim() && label.trim().length <= 100 && (!selected || validOrder));
  const duplicate = $derived(!!label.trim() && rows.some((row) => row.facility_type === type && row.id !== selected?.id && row.label.trim().toLocaleLowerCase() === label.trim().toLocaleLowerCase()));

  $effect(() => {
    const r = revision; void r;
    let live = true; loading = true; error = "";
    adminServiceCategoriesApi.list().then((value) => { if (live) rows = value; })
      .catch((e) => { if (live) error = apiMessage(e, "服務分類載入失敗"); })
      .finally(() => { if (live) loading = false; });
    return () => { live = false; };
  });
  function selectType(value: string) {
    if (value === currentType || !groups.some((group) => group.key === value)) return;
    const url = new SvelteURL(page.url.href); url.searchParams.set("category_type", value);
    void goto(url, { reset: false });
  }
  function clearFilters() { query = ""; status = "all"; }
  function edit(category: ServiceCategoryAdmin | null) {
    selected = category; type = category?.facility_type ?? currentType;
    label = category?.label ?? ""; order = category?.sort_order ?? 0;
    active = category?.is_active ?? true; formError = ""; message = ""; open = true;
  }
  function replaceCategory(category: ServiceCategoryAdmin) {
    rows = rows.some((row) => row.id === category.id) ? rows.map((row) => row.id === category.id ? category : row) : [...rows, category];
    refreshServiceTaxonomy();
  }
  async function save(event: SubmitEvent) {
    event.preventDefault(); if (!canSave) return;
    busy = true; formError = "";
    try {
      const created = !selected;
      const category = selected
        ? await adminServiceCategoriesApi.update(selected.id, { label: label.trim(), sort_order: order!, is_active: active })
        : await adminServiceCategoriesApi.create({ facility_type: type, label: label.trim() });
      replaceCategory(category); if (created) clearFilters();
      open = false; message = `「${category.label}」已${created ? "新增" : "儲存"}`;
    } catch (e) { formError = apiMessage(e, "分類儲存失敗，請保留內容並重試"); }
    finally { busy = false; }
  }
  async function deactivate() {
    if (!selected || busy) return;
    busy = true; formError = "";
    try {
      const category = await adminServiceCategoriesApi.update(selected.id, { is_active: false });
      replaceCategory(category); remove = false; message = `「${category.label}」已停用`;
    } catch (e) { formError = apiMessage(e, "分類停用失敗，請重試"); }
    finally { busy = false; }
  }
  async function del() {
    if (!selected || busy) return;
    busy = true; formError = "";
    try {
      await adminServiceCategoriesApi.delete(selected.id);
      rows = rows.filter((row) => row.id !== selected!.id); refreshServiceTaxonomy();
      remove = false; message = `「${selected.label}」已刪除`;
    } catch (e) { formError = apiMessage(e, "分類刪除失敗，請重試"); }
    finally { busy = false; }
  }
</script>

<div class="min-w-0 space-y-6 break-words">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight">服務類別管理</h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">設定民眾搜尋與院所建檔使用的分類。個別療程、時長與價格，請到院所的服務項目設定。</p>
    </div>
    <Button class="min-h-11 gap-2" disabled={loading || !!error} onclick={() => edit(null)}><Plus class="size-4" />新增{FACILITY_TYPE_LABELS[currentType]}分類</Button>
  </div>
  <Feedback {error} {message} />
  {#if error}<Button variant="outline" class="min-h-11" onclick={() => revision++}>重試服務分類</Button>{/if}
  <Tabs.Root value={currentType} onValueChange={selectType} class="gap-5">
    <Tabs.List aria-label="院所類型" class="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
      {#each groups as group (group.key)}<Tabs.Trigger value={group.key} aria-label={group.name} class="min-h-11 gap-2 px-3">
        {group.name}<span aria-hidden="true" class="rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs tabular-nums">{loading ? "—" : rows.filter((row) => row.facility_type === group.key).length}</span>
      </Tabs.Trigger>{/each}
    </Tabs.List>
    {#each groups as group (group.key)}<Tabs.Content value={group.key} class="space-y-4 outline-none">
      {#if currentType === group.key}
      {#if loading}<AdminSkeleton label="載入分類中…" variant="table" />
      {:else if !error}
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div><h2 class="font-semibold">{group.name}分類</h2><p class="mt-1 text-sm text-muted-foreground">共 {groupRows.length} 個分類，{groupRows.filter((row) => row.is_active).length} 個啟用中。</p></div>
          <p class="text-xs leading-5 text-muted-foreground">依顯示順序由小到大排列</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <div class="relative min-w-0 flex-1"><Search aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="搜尋分類名稱" placeholder={`搜尋${group.name}分類`} bind:value={query} class="min-h-11 pl-9" /></div>
          <NativeSelect.Root aria-label="分類狀態" bind:value={status} class="min-h-11 w-full sm:w-40">
            <NativeSelect.Option value="all">全部狀態</NativeSelect.Option><NativeSelect.Option value="active">啟用中</NativeSelect.Option><NativeSelect.Option value="inactive">已停用</NativeSelect.Option>
          </NativeSelect.Root>
        </div>
        {#if filtered}<div class="flex flex-wrap items-center justify-between gap-2"><p role="status" class="text-sm text-muted-foreground">找到 {visible.length} 個分類</p>{#if visible.length}<Button variant="ghost" class="min-h-11" onclick={clearFilters}>清除篩選</Button>{/if}</div>{/if}
        {#if visible.length}<Card.Root class="gap-0 overflow-hidden py-0 shadow-sm">
          <div aria-hidden="true" class="hidden grid-cols-[minmax(0,1fr)_6rem_5rem_8rem] gap-4 border-b bg-muted/30 px-5 py-3 text-xs text-muted-foreground sm:grid"><span>分類名稱</span><span>狀態</span><span>顯示順序</span><span class="text-right">操作</span></div>
          <ul aria-label={`${group.name}分類清單`} class="divide-y divide-border/60">
            {#each visible as category (category.id)}<li class="flex items-start justify-between gap-4 px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_5rem_8rem] sm:items-center sm:px-5">
              <div class="min-w-0 flex-1"><p class="break-words text-sm font-medium">{category.label}</p><div class="mt-2 flex flex-wrap items-center gap-2 sm:hidden"><Badge variant={category.is_active ? "secondary" : "outline"}>{category.is_active ? "啟用中" : "已停用"}</Badge><span class="text-xs text-muted-foreground">順序 {category.sort_order}</span></div></div>
              <div class="hidden sm:block"><Badge variant={category.is_active ? "secondary" : "outline"}>{category.is_active ? "啟用中" : "已停用"}</Badge></div>
              <span class="hidden text-sm tabular-nums text-muted-foreground sm:block">{category.sort_order}</span>
              <div class="flex shrink-0 items-center justify-end gap-1"><Button variant="outline" class="min-h-11 px-3" aria-label={`編輯「${category.label}」`} onclick={() => edit(category)}>編輯</Button><Button variant="ghost" size="icon" class="size-11 text-muted-foreground hover:text-destructive" aria-label={`刪除「${category.label}」`} title="刪除分類" onclick={() => { selected = category; formError = ""; message = ""; remove = true; }}><Trash2 class="size-4" /></Button></div>
            </li>{/each}
          </ul>
        </Card.Root>
        {:else}<AdminEmpty title={filtered ? "找不到符合的分類" : `尚無${group.name}分類`} description={filtered ? "試著調整名稱或狀態，也可以清除篩選。" : "從上方新增分類，提供院所建檔與民眾搜尋使用。"} search={filtered}>
          {#if filtered}<Button variant="outline" class="min-h-11" onclick={clearFilters}>清除篩選</Button>{/if}
        </AdminEmpty>{/if}
        <p class="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Tags class="mt-1 size-4 shrink-0" />暫時不用的分類可先停用；停用會從公開選項移除，既有院所資料不會因此自動改寫。</p>
      {/if}
      {/if}
    </Tabs.Content>{/each}
  </Tabs.Root>
</div>

<Modal bind:open title={selected ? "編輯分類" : "新增分類"} description={`${FACILITY_TYPE_LABELS[type]}的服務分類`} {busy}>
  <form onsubmit={save} class="space-y-5 break-words">
    <Feedback error={formError} />
    <Field.Set disabled={busy} class="gap-5">
      <p class="text-sm text-muted-foreground">所屬類型：<span class="font-medium text-foreground">{FACILITY_TYPE_LABELS[type]}</span></p>
      <Field.Field class="gap-2"><div class="flex items-center justify-between gap-3"><Field.Label for={`${formId}-name`} class="text-sm font-medium">分類名稱</Field.Label><span aria-hidden="true" class="text-xs tabular-nums text-muted-foreground">{label.length}/100</span></div><Input id={`${formId}-name`} bind:value={label} placeholder={examples[type]} required maxlength={100} aria-describedby={`${formId}-name-hint`} /><p id={`${formId}-name-hint`} class="text-xs leading-5 text-muted-foreground">填寫院所與民眾容易辨識的名稱，不能只有空白。</p>
        {#if duplicate}<p role="status" class="text-xs leading-5 text-amber-700 dark:text-amber-300">此類型已有相同名稱，請確認是否需要重複建立。</p>{/if}
      </Field.Field>
      {#if selected}<Field.Field class="gap-2"><Field.Label for={`${formId}-order`} class="text-sm font-medium">顯示順序</Field.Label><Input id={`${formId}-order`} type="number" step="1" min={-2147483648} max={2147483647} bind:value={order} required aria-describedby={`${formId}-order-hint`} /><p id={`${formId}-order-hint`} class="text-xs leading-5 text-muted-foreground">數字越小越前面，可使用整數調整位置。</p></Field.Field>
        <Field.Field orientation="horizontal" class="items-start gap-3 rounded-xl border p-4"><Checkbox id={`${formId}-active`} bind:checked={active} class="mt-0.5" /><div class="space-y-1"><Field.Label for={`${formId}-active`} class="cursor-pointer text-sm font-medium">啟用分類</Field.Label><p class="text-xs leading-5 text-muted-foreground">停用後不再提供於公開分類選項；既有院所可能仍保留此分類。</p></div></Field.Field>
      {:else}<p class="rounded-xl bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">新增分類會預設啟用，並自動排在此類型的最後。</p>{/if}
    </Field.Set>
    <Dialog.Footer class="admin-dialog-footer"><Button variant="outline" class="min-h-11" disabled={busy} onclick={() => open = false}>取消</Button><Button type="submit" class="min-h-11" disabled={!canSave}>{busy ? "儲存中…" : "儲存分類"}</Button></Dialog.Footer>
  </form>
</Modal>
<Modal bind:open={remove} title="刪除分類" description="分類刪除後無法直接復原。" {busy}>
  <div class="space-y-4 break-words"><p class="font-medium">{selected?.label}</p><Feedback error={formError} /><p class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6">系統不會自動檢查這個分類是否仍被院所使用。刪除前，請先確認相關院所已調整分類；暫時不用可改為停用。</p><div class="admin-dialog-footer flex flex-wrap justify-end gap-2"><Button variant="outline" class="min-h-11" disabled={busy} onclick={() => remove = false}>取消</Button>{#if selected?.is_active}<Button variant="secondary" class="min-h-11" disabled={busy} onclick={deactivate}>改為停用</Button>{/if}<Button variant="destructive" class="min-h-11" disabled={busy} onclick={del}>{busy ? "處理中…" : "確認刪除分類"}</Button></div></div>
</Modal>
