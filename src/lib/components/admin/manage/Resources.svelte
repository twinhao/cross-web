<script lang="ts">
  import { getAuth } from "#lib/auth/auth.svelte.ts";
  import { canManageFacility } from "#lib/auth/roles.ts";
  import AdminEmpty from "../layout/AdminEmpty.svelte";
  import AdminSkeleton from "../layout/AdminSkeleton.svelte";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import Modal from "./Modal.svelte";
  import Feedback from "./Feedback.svelte";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import { apiMessage } from "#lib/admin/scheduling.ts";
  import { clinicHref } from "#lib/admin/workspace.ts";
  import type { ApiResource } from "#lib/types/clinic.ts";

  let { facilityId }: { facilityId: string } = $props();
  const formId = $props.id();
  let rows = $state<ApiResource[]>([]),
    loading = $state(true),
    loadError = $state(""),
    error = $state(""),
    formError = $state(""),
    message = $state(""),
    revision = $state(0),
    editor = $state(false),
    busy = $state(false),
    selected = $state<ApiResource | null>(null),
    name = $state(""),
    category = $state("");

  $effect(() => {
    const id = facilityId;
    void revision;
    let live = true;
    loading = true;
    loadError = "";
    adminClinicsApi.resources
      .list(id)
      .then((v) => { if (live) rows = v; })
      .catch((e) => { if (live) loadError = apiMessage(e, "無法載入診間與設備"); })
      .finally(() => { if (live) loading = false; });
    return () => { live = false; };
  });

  // 依分類分組；分類是自由文字，服務以分類指定「需要哪一種」
  const groups = $derived(
    Object.entries(
      rows.reduce<Record<string, ApiResource[]>>((acc, r) => ((acc[r.category] ??= []).push(r), acc), {}),
    ),
  );
  const categories = $derived([...new Set(rows.map((r) => r.category))]);

  function edit(r: ApiResource | null) {
    selected = r;
    name = r?.name ?? "";
    category = r?.category ?? categories[0] ?? "";
    formError = "";
    editor = true;
  }

  async function run(action: () => Promise<unknown>, done: string, fail: string) {
    busy = true;
    formError = "";
    error = "";
    message = "";
    try {
      await action();
      editor = false;
      revision++;
      message = done;
    } catch (e) {
      formError = apiMessage(e, fail);
      if (!editor) error = formError;
    } finally {
      busy = false;
    }
  }

  function save(e: SubmitEvent) {
    e.preventDefault();
    const data = { name: name.trim(), category: category.trim() };
    run(
      () => selected ? adminClinicsApi.resources.update(facilityId, selected.id, data) : adminClinicsApi.resources.create(facilityId, data),
      "已儲存",
      "儲存失敗",
    );
  }

  const toggle = (r: ApiResource) =>
    run(
      () => adminClinicsApi.resources.update(facilityId, r.id, { is_active: !r.is_active }),
      r.is_active ? `已停用「${r.name}」` : `已啟用「${r.name}」`,
      "更新失敗",
    );

  const auth = getAuth();
  const canManage = $derived(canManageFacility(auth.user, facilityId));
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="font-semibold">診間與設備</h2>
    {#if canManage}<div class="flex flex-wrap gap-2"><Button variant="outline" href={clinicHref(facilityId, "services")}>設定服務需求</Button><Button onclick={() => edit(null)}>新增診間或設備</Button></div>{/if}
  </div>
  <p class="text-sm leading-6 text-muted-foreground">
    每間診間、每台儀器各建一筆，同一種類放在同一個分類（例如三間「治療室」）。在服務項目勾選需要的分類後，預約會自動分配當時有空的一台，同一台不會被重複預約。
  </p>
  {#if !canManage}<p class="text-sm text-muted-foreground">資料為唯讀，修改請洽院所管理員。</p>{/if}
  <Feedback error={loadError || error} {message} />
  {#if loading}<AdminSkeleton label="載入診間與設備中…" variant="list" />
  {:else if !loadError}
    {#each groups as [group, items] (group)}
      <section class="rounded-2xl border bg-card">
        <h3 class="border-b px-5 py-3 text-sm font-semibold">{group}<span class="ml-2 font-normal text-muted-foreground">{items.filter((r) => r.is_active).length} 台可用</span></h3>
        <ul class="divide-y">
          {#each items as r (r.id)}
            <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span class={r.is_active ? "font-medium" : "text-muted-foreground line-through"}>{r.name}{r.is_active ? "" : "（停用）"}</span>
              {#if canManage}<div class="flex gap-2">
                <Button variant="outline" size="sm" disabled={busy} onclick={() => edit(r)}>編輯</Button>
                <Button variant="ghost" size="sm" disabled={busy} onclick={() => toggle(r)}>{r.is_active ? "停用" : "啟用"}</Button>
              </div>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <div class="rounded-2xl border bg-card">
        <AdminEmpty title="尚未建立診間或設備" description="療程需要固定診間或儀器時才需要設定；只需人員的服務可以略過。">
          {#if canManage}<Button onclick={() => edit(null)}>新增第一筆</Button>{/if}
        </AdminEmpty>
      </div>
    {/each}
  {/if}
</div>

<Modal bind:open={editor} title={selected ? "編輯診間或設備" : "新增診間或設備"} {busy}>
  <form onsubmit={save} class="space-y-4">
    <Feedback error={formError} />
    <Field.Set disabled={busy} class="gap-5">
      <Field.Field class="gap-2">
        <Field.Label for={`${formId}-name`} class="text-sm font-medium">名稱</Field.Label>
        <Input id={`${formId}-name`} bind:value={name} required maxlength={100} placeholder="例如：2 號治療室、皮秒雷射 A" />
      </Field.Field>
      <Field.Field class="gap-2">
        <Field.Label for={`${formId}-category`} class="text-sm font-medium">分類</Field.Label>
        <Input id={`${formId}-category`} bind:value={category} required maxlength={50} list={`${formId}-categories`} placeholder="例如：治療室、皮秒雷射" aria-describedby={`${formId}-category-hint`} />
        <datalist id={`${formId}-categories`}>{#each categories as c (c)}<option value={c}></option>{/each}</datalist>
        <p id={`${formId}-category-hint`} class="text-xs leading-6 text-muted-foreground">同分類的任何一台有空即可承接預約。</p>
      </Field.Field>
    </Field.Set>
    <Dialog.Footer class="admin-dialog-footer">
      <Button variant="outline" disabled={busy} onclick={() => (editor = false)}>取消</Button>
      <Button type="submit" disabled={busy}>儲存</Button>
    </Dialog.Footer>
  </form>
</Modal>
