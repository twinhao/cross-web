<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowLeft, ArrowRight, Expand, X } from "@lucide/svelte";
  import type { FacilityPhoto } from "#lib/types/clinic.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import * as Dialog from "#lib/components/ui/dialog/index.ts";

  let { photos, clinicName }: { photos: FacilityPhoto[]; clinicName: string } = $props();
  let open = $state(false), selected = $state(0), ready = $state(false);
  let opener: HTMLButtonElement | null = null;
  const current = $derived(photos[selected] ?? photos[0]);
  onMount(() => { ready = true; });
  function show(event: MouseEvent, index: number) {
    opener = event.currentTarget as HTMLButtonElement;
    selected = index;
    open = true;
  }
  function next(delta: number) { selected = (selected + delta + photos.length) % photos.length; }
</script>

{#if photos.length}
  <div id="photos" class="min-w-0 scroll-mt-28 space-y-3" aria-label="院所環境照片">
    <button type="button" disabled={!ready} onclick={(event) => show(event, 0)} aria-label={`放大${clinicName}環境照片`} class="group relative block w-full cursor-pointer overflow-hidden rounded-3xl bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
      <img src={photos[0].url} alt={photos[0].caption || `${clinicName}院所環境`} fetchpriority="high" decoding="async" width="960" height="720" class="aspect-[4/3] w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]" />
      <span class="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-xs font-medium text-foreground shadow-sm"><Expand class="size-4" aria-hidden="true" />查看 {photos.length} 張照片</span>
    </button>
    {#if photos.length > 1}<div class="grid grid-cols-2 gap-3">{#each photos.slice(1, 3) as photo, i (photo.id)}<button type="button" disabled={!ready} onclick={(event) => show(event, i + 1)} aria-label={`放大環境照片 ${i + 2}`} class="overflow-hidden rounded-2xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><img src={photo.url} alt={photo.caption || `${clinicName}環境照片 ${i + 2}`} width="480" height="240" loading="lazy" class="aspect-[2/1] w-full object-cover" /></button>{/each}</div>{/if}
  </div>
  <Dialog.Root bind:open><Dialog.Content class="sm:max-w-4xl" showCloseButton={false} onCloseAutoFocus={(event) => { event.preventDefault(); opener?.focus(); }} onkeydown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); next(1); } else if (event.key === "ArrowLeft") { event.preventDefault(); next(-1); } }}>
    <Dialog.Header class="pr-12 text-left"><Dialog.Title>{clinicName}環境相簿</Dialog.Title><Dialog.Description>第 {selected + 1}／{photos.length} 張，可使用左右方向鍵切換。</Dialog.Description></Dialog.Header>
    <Dialog.Close>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon-lg" class="absolute top-3 right-3" aria-label="關閉相簿"><X aria-hidden="true" /></Button>{/snippet}</Dialog.Close>
    {#if current}<figure class="min-w-0"><img src={current.url} alt={current.caption || `${clinicName}環境照片 ${selected + 1}`} class="max-h-[55dvh] w-full rounded-2xl bg-muted object-contain" /><figcaption class="mt-3 min-h-6 break-words text-center text-sm leading-6 text-muted-foreground">{current.caption || `環境照片 ${selected + 1}`}</figcaption></figure>{/if}
    {#if photos.length > 1}<div class="flex items-center justify-between gap-3"><Button variant="outline" class="min-h-11" onclick={() => next(-1)}><ArrowLeft aria-hidden="true" />上一張</Button><span class="text-xs text-muted-foreground" aria-live="polite">{selected + 1}／{photos.length}</span><Button variant="outline" class="min-h-11" onclick={() => next(1)}>下一張<ArrowRight aria-hidden="true" /></Button></div>{/if}
  </Dialog.Content></Dialog.Root>
{/if}
