<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowUp, ArrowDown, ImagePlus, Trash2 } from "@lucide/svelte";
  import { adminClinicsApi } from "#lib/api/admin/clinics.ts";
  import { apiMessage } from "#lib/admin/scheduling.ts";
  import type { FacilityGallery, FacilityPhoto } from "#lib/types/clinic.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Skeleton } from "#lib/components/ui/skeleton/index.ts";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";
  import Feedback from "./Feedback.svelte";

  let { clinicId, busy = $bindable(false) }: { clinicId: string; busy?: boolean } = $props();
  const fieldId = $props.id();
  let gallery = $state<FacilityGallery | null>(null), loading = $state(true), error = $state(""), message = $state("");
  let captions = $state<Record<string, string>>({}), removeOpen = $state(false), removing = $state<FacilityPhoto | null>(null);
  let alive = true;
  const dirty = $derived(gallery?.photos.some((photo) => captions[photo.id] !== photo.caption) ?? false);
  function apply(value: FacilityGallery, preserve = true) {
    if (!alive) return;
    captions = Object.fromEntries(value.photos.map((photo) => [photo.id, preserve ? captions[photo.id] ?? photo.caption : photo.caption]));
    gallery = value;
  }
  async function load() {
    loading = true; error = "";
    try { apply(await adminClinicsApi.photos.get(clinicId), false); }
    catch (e) { if (alive) error = apiMessage(e, "無法載入相簿，請重新載入"); }
    finally { if (alive) loading = false; }
  }
  onMount(() => { void load(); return () => { alive = false; }; });
  async function failed(e: unknown) {
    if (!alive) return;
    error = apiMessage(e, "相簿更新失敗，請稍後再試");
    if (e && typeof e === "object" && "status" in e && e.status === 409) {
      await load();
      if (alive) error = "相簿已更新或已達張數上限，已重新載入。請確認後再操作。";
    }
  }
  async function upload(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length || !gallery || busy) return;
    error = ""; message = "";
    if (files.length + gallery.photos.length > gallery.max_photos) { error = `相簿最多 ${gallery.max_photos} 張，請減少選取數量。`; input.value = ""; return; }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      error = "請選擇每張不超過 5 MB 的 JPG、PNG 或 WebP。"; input.value = ""; return;
    }
    busy = true;
    let completed = 0;
    try {
      for (const file of files) {
        apply(await adminClinicsApi.photos.upload(clinicId, file));
        completed++;
        if (!alive) break;
      }
      if (alive) message = `已上傳 ${completed} 張照片，會顯示於公開院所頁。`;
    } catch (e) {
      await failed(e);
      if (alive && completed) message = `已上傳 ${completed} 張，其餘未完成，請重新選取。`;
    } finally { if (alive) busy = false; input.value = ""; }
  }
  async function save(photos: FacilityPhoto[], saveCaptions = false) {
    if (!gallery || busy) return false;
    busy = true; error = ""; message = "";
    try {
      const updated = await adminClinicsApi.photos.update(clinicId, gallery.revision, photos.map((photo) => ({ id: photo.id, caption: saveCaptions ? captions[photo.id] ?? "" : photo.caption })));
      apply(updated, !saveCaptions);
      if (alive) message = saveCaptions ? "照片說明已儲存" : "照片順序已儲存，第一張為封面。";
      return true;
    } catch (e) { await failed(e); return false; }
    finally { if (alive) busy = false; }
  }
  export async function savePending(): Promise<boolean> {
    return gallery && dirty ? await save(gallery.photos, true) : true;
  }
  function move(index: number, target: number) {
    if (!gallery || target < 0 || target >= gallery.photos.length) return;
    const next = [...gallery.photos];
    next.splice(target, 0, next.splice(index, 1)[0]);
    void save(next);
  }
  async function remove() {
    if (!removing || busy) return;
    busy = true; error = ""; message = "";
    try {
      apply(await adminClinicsApi.photos.remove(clinicId, removing.id));
      if (alive) { message = "照片已移除"; removeOpen = false; removing = null; }
    } catch (e) { await failed(e); }
    finally { if (alive) busy = false; }
  }
</script>

<section aria-labelledby={`${fieldId}-title`} class="space-y-4 border-t border-border pt-5">
  <div><h3 id={`${fieldId}-title`} class="font-semibold">院所環境相簿</h3><p class="mt-2 text-sm leading-6 text-muted-foreground">放上接待空間、診間或設備照片。第一張作為封面，請使用有權公開的照片。</p><p class="mt-1 text-xs leading-6 text-muted-foreground">最多 12 張，每張 5 MB；支援 JPG、PNG、WebP。上傳、排序與移除會立即儲存。</p></div>
  <Feedback {error} {message} />
  {#if loading}<div role="status" aria-label="載入相簿" class="grid grid-cols-2 gap-3"><Skeleton class="aspect-[4/3] rounded-xl" /><Skeleton class="aspect-[4/3] rounded-xl" /></div>
  {:else if !gallery}<Button variant="outline" onclick={load}>重新載入相簿</Button>
  {:else}
    <fieldset disabled={busy} class="min-w-0 space-y-4">
      <legend class="sr-only">環境照片管理</legend>
      <div class="space-y-2"><label for={`${fieldId}-upload`} class="flex items-center gap-2 text-sm font-medium"><ImagePlus class="size-4" aria-hidden="true" />上傳環境照片（{gallery.photos.length}／{gallery.max_photos}）</label><Input id={`${fieldId}-upload`} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy || gallery.photos.length >= gallery.max_photos} onchange={upload} class="min-h-11" /></div>
      {#if !gallery.photos.length}<p class="rounded-xl border border-dashed p-5 text-sm leading-7 text-muted-foreground">尚未新增環境照片。先上傳一張能代表院所的照片作為封面。</p>{/if}
      <ol class="grid gap-4 sm:grid-cols-2">
        {#each gallery.photos as photo, index (photo.id)}
          <li class="min-w-0 overflow-hidden rounded-2xl border bg-card">
            <div class="relative"><img src={photo.url} alt={captions[photo.id] || `環境照片 ${index + 1}`} class="aspect-[4/3] w-full object-cover" loading="lazy" />{#if index === 0}<span class="absolute top-2 left-2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">封面</span>{/if}</div>
            <div class="space-y-3 p-3"><div><label for={`${fieldId}-${photo.id}`} class="text-xs font-medium">照片 {index + 1} 說明</label><Input id={`${fieldId}-${photo.id}`} bind:value={captions[photo.id]} maxlength={120} placeholder="例如：一樓接待空間" onkeydown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (gallery) void save(gallery.photos, true); } }} class="mt-2" /></div>
              <div class="flex flex-wrap items-center gap-1"><Button variant="ghost" size="icon-lg" disabled={busy || index === 0} aria-label={`照片 ${index + 1} 往前移動`} onclick={() => move(index, index - 1)}><ArrowUp aria-hidden="true" /></Button><Button variant="ghost" size="icon-lg" disabled={busy || index === gallery.photos.length - 1} aria-label={`照片 ${index + 1} 往後移動`} onclick={() => move(index, index + 1)}><ArrowDown aria-hidden="true" /></Button>{#if index > 0}<Button variant="outline" class="min-h-11" onclick={() => move(index, 0)}>設為封面</Button>{/if}<Button variant="ghost" size="icon-lg" class="ml-auto text-destructive" aria-label={`移除照片 ${index + 1}`} onclick={() => { removing = photo; removeOpen = true; }}><Trash2 aria-hidden="true" /></Button></div>
            </div>
          </li>
        {/each}
      </ol>
      {#if gallery.photos.length}<Button variant="outline" class="min-h-11" disabled={busy || !dirty} onclick={() => gallery && save(gallery.photos, true)}>儲存照片說明</Button>{/if}
    </fieldset>
  {/if}
  {#if busy}<p role="status" class="text-sm text-muted-foreground">正在更新相簿，請稍候…</p>{/if}
</section>

<Dialog.Root bind:open={removeOpen}><Dialog.Content onInteractOutside={(e) => { if (busy) e.preventDefault(); }} onEscapeKeydown={(e) => { if (busy) e.preventDefault(); }} showCloseButton={!busy}><Dialog.Header><Dialog.Title>移除這張環境照片？</Dialog.Title><Dialog.Description>移除後不再顯示於院所門面。如移除封面，下一張照片會自動成為封面。</Dialog.Description></Dialog.Header><Dialog.Footer><Button variant="outline" disabled={busy} onclick={() => (removeOpen = false)}>保留照片</Button><Button variant="destructive" disabled={busy} onclick={remove}>{busy ? "移除中…" : "確認移除照片"}</Button></Dialog.Footer></Dialog.Content></Dialog.Root>
