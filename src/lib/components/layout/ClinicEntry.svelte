<script lang="ts">
  import { getAuth } from "#lib/auth/auth.svelte.ts";
  const auth = getAuth();
  import { afterNavigate } from "$app/navigation";
  import { Building2, ChevronDown, Menu } from "@lucide/svelte";
  import * as Popover from "#lib/components/ui/popover/index.ts";
  import ThemeToggle from "#lib/components/ThemeToggle.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  let open = $state(false);
  afterNavigate(() => {
    open = false;
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} disabled={auth.isLoading} variant="ghost" size="sm" class="size-11 gap-1 p-0 md:w-auto md:px-3">
        <Menu class="size-5 md:hidden" aria-hidden="true" /><span class="sr-only md:hidden">更多選單</span><span class="hidden md:inline">院所專區</span><ChevronDown class="hidden size-3.5 md:block" aria-hidden="true" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" class="w-64 max-w-[calc(100vw-2rem)] p-3">
    <div class="mb-2 flex items-center justify-between gap-2 border-b pb-3 md:hidden"><Button href="/auth" variant="outline" class="min-h-11 flex-1" onclick={() => (open = false)}>會員登入</Button><ThemeToggle class="size-11" /></div>
    <p class="flex items-center gap-2 px-2 py-2 text-sm font-semibold">
      <Building2 class="size-4 text-primary" />給院所與服務團隊
    </p>
    <nav aria-label="院所專區導覽" class="grid gap-1">
      <Button
        href="/join"
        variant="ghost"
        class="min-h-11 justify-start"
        onclick={() => (open = false)}
      >
        了解院所導入
      </Button>
      <Button
        href="/join#product-preview"
        variant="ghost"
        class="min-h-11 justify-start"
        onclick={() => (open = false)}
      >
        看看門面與管理方式
      </Button>
      <Button
        href="/pricing"
        variant="ghost"
        class="min-h-11 justify-start"
        onclick={() => (open = false)}
      >
        方案與費用
      </Button>
      <Button
        href="/admin/login"
        class="mt-2 min-h-11"
        onclick={() => (open = false)}
      >
        院所登入
      </Button>
    </nav>
  </Popover.Content>
</Popover.Root>
