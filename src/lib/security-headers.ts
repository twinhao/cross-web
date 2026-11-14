/**
 * 每個回應都帶的安全標頭（由 hooks.server.ts 套用）。
 * 站內沒有任何頁面需要被框架嵌入，所以一律禁止，避免後台被點擊劫持。
 * 完整的 Content-Security-Policy（script-src 等）尚未設定：需先盤點 Google／Apple 登入與 SvelteKit 內嵌腳本。
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "referrer-policy": "strict-origin-when-cross-origin",
  // 站內未使用這些裝置能力
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};
