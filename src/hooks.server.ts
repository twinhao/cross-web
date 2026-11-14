import type { Handle } from "@sveltejs/kit/hooks";
import { SECURITY_HEADERS } from "#lib/security-headers.ts";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (/^\/demo\/?$/.test(event.url.pathname)) {
    // 示範使用 SPA，伺服器的空殼 HTML 也必須明確禁止索引與快取。
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", "private, no-store");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
