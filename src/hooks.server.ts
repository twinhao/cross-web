import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (!/^\/demo\/?$/.test(event.url.pathname)) return response;
  // 示範使用 SPA，伺服器的空殼 HTML 也必須明確禁止索引與快取。
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("cache-control", "private, no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
