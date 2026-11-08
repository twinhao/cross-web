<script lang="ts">
  import { Tooltip } from "bits-ui";
  import type { HTMLAttributes } from "svelte/elements";
  import type { LayoutDashboard } from "@lucide/svelte";
  let {
    href, label, icon: Icon, active = false, highlighted = false,
    compact = false, nested = false, onNavigate,
  }: {
    href: string; label: string; icon?: typeof LayoutDashboard;
    active?: boolean; highlighted?: boolean; compact?: boolean; nested?: boolean;
    onNavigate: () => void;
  } = $props();
</script>

{#snippet link(props: HTMLAttributes<HTMLAnchorElement> = {})}
  <a
    {...props}
    {href}
    aria-label={label}
    aria-current={active ? "page" : undefined}
    onclick={(event) => { props.onclick?.(event); onNavigate(); }}
    class="relative flex min-h-11 min-w-0 items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring {nested ? 'text-[13px]' : 'text-sm'} {compact
      ? 'mx-auto w-11 justify-center rounded-2xl'
      : 'gap-3 rounded-xl px-3'} {active
      ? compact ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm' : 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
      : highlighted ? 'font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/60' : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}"
  >
    {#if active && !compact}<span class="absolute inset-y-3 left-0 w-[3px] rounded-full bg-sidebar-primary" aria-hidden="true"></span>{/if}
    {#if Icon}<Icon class={compact ? "size-5 shrink-0" : "size-[18px] shrink-0"} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />{/if}
    <span class={compact ? "sr-only" : "min-w-0 truncate"}>{label}</span>
  </a>
{/snippet}

{#if compact}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({props})}{@render link(props)}{/snippet}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content role="tooltip" side="right" sideOffset={20} class="z-[70] max-w-60 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
        {label}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
{:else}
  {@render link()}
{/if}
