<script lang="ts">
 import { getAuth, requireMember } from "#lib/auth/auth.svelte.ts";
 import { memberApi } from "#lib/api/member.ts";
 import EditProfileDialog from "#lib/components/member/EditProfileDialog.svelte";
 import ThemeToggle from "#lib/components/ThemeToggle.svelte";
 import { Button } from "#lib/components/ui/button/index.js";
 import { Card } from "#lib/components/ui/card/index.js";
 import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "#lib/components/ui/alert-dialog/index.js";
 import { memberDisplayName, formatMemberSince } from "#lib/member/appointments.ts";
 import LogOut from "@lucide/svelte/icons/log-out";
 import Pencil from "@lucide/svelte/icons/pencil";
 import Trash2 from "@lucide/svelte/icons/trash-2";
 const auth=getAuth();
 const guard=requireMember(()=>"/member/profile");
 let editProfileOpen=$state(false),deleteDialogOpen=$state(false),isDeletingAccount=$state(false),deleteAccountError=$state("");
 const displayName=$derived(memberDisplayName(auth.user));
	// 確認刪除帳號：成功後沿用登出邏輯清除登入狀態並導回首頁
	const handleDeleteAccount = async () => {
		isDeletingAccount = true;
		deleteAccountError = "";
		try {
			await memberApi.deleteAccount();
			deleteDialogOpen = false;
			auth.logout("/");
		} catch (err) {
			console.error("Failed to delete account:", err);
			deleteAccountError = "刪除失敗，請稍後再試";
		} finally {
			isDeletingAccount = false;
		}
	};

</script>
{#if guard.ready}<div class="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6"><div><h1 class="text-2xl font-semibold tracking-tight">帳戶設定</h1><p class="mt-2 text-sm text-muted-foreground">管理個人資料與帳號偏好。</p></div><Card class="gap-0 rounded-2xl py-0 shadow-none">
 <div class="flex flex-wrap items-center justify-between gap-3 border-b p-5"><h2 class="font-semibold">個人資料</h2><Button variant="outline" class="min-h-11 rounded-xl" onclick={()=>editProfileOpen=true}><Pencil/>編輯個人資料</Button></div>
 <dl class="grid gap-6 p-5 sm:grid-cols-2">
  <div><dt class="mb-1 text-xs text-muted-foreground">姓名</dt><dd class="font-medium break-words">{displayName}</dd></div>
  <div><dt class="mb-1 text-xs text-muted-foreground">電子郵件</dt><dd class="break-all text-sm">{auth.user?.email || "未提供"}</dd></div>
  <div><dt class="mb-1 text-xs text-muted-foreground">手機號碼</dt><dd class="text-sm">{auth.user?.phone_number || "未提供"}</dd></div>
  {#if auth.user?.created_at}<div><dt class="mb-1 text-xs text-muted-foreground">加入時間</dt><dd class="text-sm">{formatMemberSince(auth.user.created_at)}</dd></div>{/if}
 </dl>
</Card>
<Card class="flex-row items-center justify-between gap-3 rounded-2xl p-5 shadow-none"><div><h2 class="text-sm font-medium">外觀主題</h2><p class="mt-1 text-xs text-muted-foreground">選擇亮色、暗色或跟隨系統</p></div><ThemeToggle/></Card>
<Button variant="outline" class="min-h-11 rounded-xl" onclick={()=>auth.logout("/")}><LogOut/>登出帳號</Button>
			<!-- 帳號（危險操作） -->
			<Card class="flex flex-row items-center justify-between gap-3 p-4">
				<div class="min-w-0">
					<div class="font-medium text-foreground">刪除帳號</div>
					<div class="text-xs text-muted-foreground">永久刪除會員資料、看診人與預約紀錄</div>
				</div>
				<Button
					variant="destructive"
					size="sm"
					class="shrink-0"
					onclick={() => {
						deleteAccountError = "";
						deleteDialogOpen = true;
					}}
				>
					<Trash2 class="size-4" />
					刪除帳號
				</Button>
			</Card>		<!-- 編輯個人資料：成功後刷新 auth user，名稱 / 手機即時同步到畫面 -->
		<EditProfileDialog
			open={editProfileOpen}
			onOpenChange={(o) => (editProfileOpen = o)}
			user={auth.user}
			onSaved={auth.refreshUser}
		/>

		<!-- 刪除帳號確認（刪除中不允許關閉） -->
		<AlertDialog
			bind:open={
				() => deleteDialogOpen,
				(o) => {
					if (!isDeletingAccount) deleteDialogOpen = o;
				}
			}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>確定要刪除帳號嗎？</AlertDialogTitle>
					<AlertDialogDescription>
						將永久刪除您的會員資料、所有看診人與預約紀錄，此操作無法復原。
					</AlertDialogDescription>
				</AlertDialogHeader>
				{#if deleteAccountError}
					<p class="text-sm text-destructive">{deleteAccountError}</p>
				{/if}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeletingAccount}>取消</AlertDialogCancel>
					<Button variant="destructive" onclick={handleDeleteAccount} disabled={isDeletingAccount}>
						{isDeletingAccount ? "刪除中..." : "刪除帳號"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
</div>{/if}
