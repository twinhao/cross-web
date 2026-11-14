/** 登入過期後該回哪個登入頁：後台回院所登入；其餘回會員登入並帶回原頁。 */
export function sessionExpiredLoginPath(pathname: string, search = ""): string {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/auth")) return "/auth";
  return `/auth?next=${encodeURIComponent(pathname + search)}`;
}

/**
 * 取得目前使用者失敗時是否應清除登入憑證。
 * 只有後端明確拒絕（401）才清；網路中斷或 5xx 屬暫時性錯誤，憑證仍有效，不可把人登出。
 */
export function shouldClearSession(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 401;
}
