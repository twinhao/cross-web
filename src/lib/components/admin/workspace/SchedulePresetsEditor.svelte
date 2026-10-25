<script lang="ts">
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import { apiMessage } from "#lib/admin/scheduling.ts";
  import { schedulePresets, validSchedulePresets, SESSION_KEYS, SESSION_LABELS, type SchedulePresets } from "#lib/schedule-presets.ts";
  let { facilityId, onSaved }: { facilityId: string; onSaved: (value: SchedulePresets) => void } = $props();
  let open = $state(false), loading = $state(false), busy = $state(false), ready = $state(false), error = $state("");
  let values = $state(schedulePresets());
  async function edit() {
    open = true; loading = true; ready = false; error = "";
    try {
      const settings = await adminClinicsApi.settings.get(facilityId);
      if (!("schedule_presets" in settings)) throw new Error("常用時段功能尚未開通，請稍後再試。");
      values = schedulePresets(settings.schedule_presets); ready = true;
    } catch (e) { error = apiMessage(e, e instanceof Error ? e.message : "常用時段載入失敗，請重試"); }
    finally { loading = false; }
  }
  async function save() {
    if (busy || loading || !ready || !validSchedulePresets(values)) return;
    busy = true; error = "";
    try {
      const settings = await adminClinicsApi.settings.update(facilityId, { schedule_presets: values });
      if (!settings.schedule_presets) throw new Error("未能確認常用時段已儲存，請重試。");
      onSaved(schedulePresets(settings.schedule_presets)); open = false;
    } catch (e) { error = apiMessage(e, e instanceof Error ? e.message : "常用時段儲存失敗，請保留表單並重試"); }
    finally { busy = false; }
  }
</script>
<Button variant="outline" onclick={edit}>設定常用時段</Button>
<Dialog.Root bind:open>
  <Dialog.Content class="admin-dialog" showCloseButton={!busy} onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeydown={e => { if (busy) e.preventDefault(); }}>
    <Dialog.Header><Dialog.Title>院所常用時段</Dialog.Title><Dialog.Description>新增單日或批次排班時自動帶入，個別日期仍可修改。儲存只更新預設值，不會改動既有班表、營業時間或預約。</Dialog.Description></Dialog.Header>
    {#if error}<p role="alert" class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>{#if !ready}<Button variant="outline" disabled={loading || busy} onclick={edit}>重新讀取</Button>{/if}{/if}
    {#if loading}<p role="status" class="text-sm text-muted-foreground">正在讀取院所設定…</p>{:else}
      <div class="space-y-4">
        {#each SESSION_KEYS as key (key)}<fieldset class="rounded-xl border p-3"><legend class="px-1 text-sm font-medium">{SESSION_LABELS[key]}</legend><div class="grid grid-cols-2 gap-3"><div><Field.Label for={"preset-"+key+"-start"}>開始時間</Field.Label><Input id={"preset-"+key+"-start"} type="time" bind:value={values[key].start} disabled={busy} /></div><div><Field.Label for={"preset-"+key+"-end"}>結束時間</Field.Label><Input id={"preset-"+key+"-end"} type="time" bind:value={values[key].end} disabled={busy} /></div></div></fieldset>{/each}
      </div>
      {#if !validSchedulePresets(values)}<p class="text-sm text-destructive">請填寫有效時間，結束時間必須晚於開始時間；跨日班次請分日安排。</p>{/if}
      <Dialog.Footer><Button variant="outline" disabled={busy} onclick={() => open = false}>取消</Button><Button disabled={busy || !ready || !validSchedulePresets(values)} onclick={save}>{busy ? "儲存中…" : "儲存常用時段"}</Button></Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
