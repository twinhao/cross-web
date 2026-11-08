<script lang="ts">
  import ContentSkeleton from "#lib/components/loading/ContentSkeleton.svelte";
  import ClinicListSkeleton from "#lib/components/clinics/ClinicListSkeleton.svelte";
  import { Skeleton } from "#lib/components/ui/skeleton/index.ts";
  let { title, variant = "list" }: {
    title: string;
    variant?: "list" | "form" | "appointment" | "clinics";
  } = $props();
</script>

<div class="mx-auto min-h-[60vh] w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6" data-member-loading>
  <div aria-hidden="true"><Skeleton class="h-7 w-36" /></div>
  {#if variant === "clinics"}<div role="status" aria-label="正在載入收藏店家…" aria-busy="true"><span class="sr-only">正在載入收藏店家…</span><ClinicListSkeleton count={3} /></div>
  {:else}<ContentSkeleton label={`正在載入${title}…`} {variant} />{/if}
</div>
