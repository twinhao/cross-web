// 伺服器 load 會等後端（冷啟動可達十多秒）的頁面，換頁時顯示對應的骨架樣式。
// tests/navigation-skeleton.test.mjs 會核對每個 +page.server.ts 都在這裡。
export const SLOW_ROUTE_VARIANTS: Record<string, "clinic" | "landing"> = {
  "/clinic/[id]": "clinic",
  "/c/[code]": "clinic",
  "/area": "landing",
  "/area/[city]": "landing",
  "/specialty": "landing",
  "/specialty/[code]": "landing",
};

/** 換頁時要顯示的骨架；同路徑（只改查詢參數或 hash）不顯示，未列出的頁面用一般清單骨架 */
export function navigationSkeletonVariant(
  to: { route: { id: string | null }; url: URL } | null | undefined,
  from: { url: URL } | null | undefined,
): "clinic" | "landing" | "list" | undefined {
  if (!to || to.url.pathname === from?.url.pathname) return undefined;
  return (to.route.id && SLOW_ROUTE_VARIANTS[to.route.id]) || "list";
}
