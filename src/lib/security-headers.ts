/**
 * 每個回應都帶的安全標頭（由 hooks.server.ts 套用）。
 * 站內沒有任何頁面需要被框架嵌入，所以一律禁止，避免後台被點擊劫持。
 * 頁面的完整 Content-Security-Policy 由 vite.config.ts 的 csp 設定產生（含 nonce）；
 * 這裡的 frame-ancestors 只在 SvelteKit 沒產生 CSP 的回應（API、靜態檔）補上，不覆蓋頁面的完整版。
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "referrer-policy": "strict-origin-when-cross-origin",
  // 站內未使用這些裝置能力
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};
