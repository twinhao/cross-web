<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
  import LogIn from "@lucide/svelte/icons/log-in";
  import LogOut from "@lucide/svelte/icons/log-out";
  import UserIcon from "@lucide/svelte/icons/user";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Popover from "#lib/components/ui/popover/index.ts";
  import { getAuth } from "#lib/auth/auth.svelte.ts";
  import { canAccessAdmin, getAdminHomePath } from "#lib/auth/roles.ts";
  let { next }: {next?:string}=$props();
  const auth=getAuth();
  const isAdmin=$derived(canAccessAdmin(auth.user));
  const displayName=$derived(auth.user?.display_name || auth.user?.email.split("@")[0] || "我的帳戶");
  let open=$state(false);
  afterNavigate(()=>open=false);
</script>
{#if auth.isLoading}
  <!-- 登入狀態載入中 -->
{:else if auth.isAuthenticated && auth.user}
  {#if isAdmin}
    <Button href={getAdminHomePath(auth.user)} variant="ghost" size="sm" class="min-h-11 gap-1.5"><LayoutDashboard class="size-4"/>管理後台</Button>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger>{#snippet child({props})}<Button {...props} variant="ghost" size="sm" aria-label="帳戶選單" class="min-h-11 min-w-11 gap-1.5 rounded-xl px-2"><UserIcon class="size-4"/><span class="hidden max-w-28 truncate sm:inline">{displayName}</span><ChevronDown class="hidden size-3 sm:block"/></Button>{/snippet}</Popover.Trigger>
      <Popover.Content align="end" class="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-2">
        <p class="truncate px-3 pt-3 pb-1 text-sm font-semibold">{auth.user.display_name || "我的帳戶"}</p>
        <p class="truncate px-3 pb-3 text-xs text-muted-foreground">{auth.user.email}</p>
        <nav aria-label="帳戶功能" class="grid border-t pt-1">
          {#each [{href:"/member/profile",label:"個人資料與設定"},{href:"/member/patients",label:"預約對象"},{href:"/member/favorites",label:"收藏店家"},{href:"/join",label:"院所導入"}] as link (link.href)}<Button href={link.href} variant="ghost" class="min-h-11 justify-start rounded-lg" onclick={()=>open=false}>{link.label}</Button>{/each}
          <Button variant="ghost" class="min-h-11 justify-start rounded-lg border-t" onclick={()=>{open=false;auth.logout("/");}}><LogOut/>登出</Button>
        </nav>
      </Popover.Content>
    </Popover.Root>
  {/if}
{:else}<Button href={next ? `/auth?next=${encodeURIComponent(next)}` : "/auth"} size="sm" class="gap-1.5"><LogIn class="size-4"/>登入</Button>{/if}
