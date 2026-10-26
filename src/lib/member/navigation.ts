// 預約紀錄與帳戶管理分開，姓名選單及帳戶頁使用同一組入口。
export const ACCOUNT_LINKS = [
  { href: "/member/profile", label: "帳戶設定" },
  { href: "/member/patients", label: "預約對象" },
  { href: "/member/favorites", label: "收藏店家" },
] as const;

export function isAccountPage(pathname: string): boolean {
  return ACCOUNT_LINKS.some((link) => link.href === pathname);
}

export function isAppointmentPage(pathname: string): boolean {
  return pathname === "/member" || pathname.startsWith("/member/appointments/");
}
