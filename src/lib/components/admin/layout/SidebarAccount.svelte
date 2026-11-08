<script lang="ts">
  import { Popover } from "bits-ui";
  import { KeyRound, LogOut } from "@lucide/svelte";
  import * as Avatar from "#lib/components/ui/avatar/index.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  let { open = $bindable(false), name, role, onPassword, onLogout }: {
    open?: boolean; name: string; role: string;
    onPassword: () => void; onLogout: () => void;
  } = $props();
  let changingPassword = $state(false);
  let trigger = $state<HTMLButtonElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);
</script>

<Popover.Root bind:open onOpenChange={value => { if (value) changingPassword = false; }}>
  <Popover.Trigger>
    {#snippet child({props})}
      <Button {...props} bind:ref={trigger} variant="ghost" size="icon" class="mx-auto flex size-11 rounded-2xl" aria-label="開啟帳戶選單" title={name + " · " + role}>
        <Avatar.Root class="size-8">
          <Avatar.Fallback class="bg-muted text-xs font-medium text-foreground ring-1 ring-border">{name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar.Root>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content bind:ref={content} role="dialog" aria-label="帳戶選單" side="right" align="end" sideOffset={12} collisionPadding={12} class="z-[70] w-60 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg outline-none"
      onOpenAutoFocus={event => { event.preventDefault(); content?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll: true}); }}
      onCloseAutoFocus={event => { event.preventDefault(); if (!changingPassword) trigger?.focus({preventScroll: true}); }}>
      <div class="min-w-0 px-3 py-3">
        <p class="truncate text-sm font-semibold" title={name}>{name}</p>
        <p class="mt-1 text-xs text-muted-foreground">{role}</p>
      </div>
      <div class="border-t pt-1">
        <Button variant="ghost" class="min-h-11 w-full justify-start gap-3 rounded-xl" onclick={() => { changingPassword = true; open = false; onPassword(); }}><KeyRound class="size-4" />修改密碼</Button>
        <Button variant="ghost" class="min-h-11 w-full justify-start gap-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onclick={() => { open = false; onLogout(); }}><LogOut class="size-4" />登出</Button>
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
