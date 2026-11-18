// 公開唯讀 API 的 Cloudflare 邊緣快取：院所頁、地區／科別頁與首頁列表都經代理取這些資料，
// 命中時不必等後端（Cloud Run 冷啟動可達十多秒）。超過 FRESH_MS 先回舊資料、背景向後端更新。
// 只快取未帶 Authorization 的 GET 200；預約時段、設定、預約與會員資料不在名單內，維持即時。
// ponytail: 快取依 Cloudflare 機房各自保存，院所改資料後最多約 FRESH_MS 加一次請求才更新；需即時再加清除快取。

export const FRESH_MS = 60_000;
const KEEP_SECONDS = 86_400;
const PUBLIC_GET =
	/^\/api\/v1\/(service-categories|booking\/clinics(\/popular|\/[^/]+(\/(doctors|services|announcements|photos|schedule))?)?)$/;

export function isEdgeCacheable(request: Request, pathname: string): boolean {
	return request.method === "GET" && !request.headers.has("authorization") && PUBLIC_GET.test(pathname);
}

type CacheLike = Pick<Cache, "match" | "put">;

/** 回給瀏覽器的回應：還原後端原本的 cache-control，避免瀏覽器把邊緣用的長效期也存起來 */
function forBrowser(res: Response, state: string): Response {
	const out = new Response(res.body, res);
	const origin = out.headers.get("x-origin-cache-control");
	if (origin) out.headers.set("cache-control", origin);
	else out.headers.delete("cache-control");
	out.headers.delete("x-origin-cache-control");
	out.headers.delete("x-edge-cached-at");
	out.headers.set("x-edge-cache", state);
	return out;
}

export async function edgeCached(
	url: string,
	cache: CacheLike,
	waitUntil: (p: Promise<unknown>) => void,
	fetchFresh: () => Promise<Response>,
	now = Date.now(),
): Promise<Response> {
	const key = new Request(url);
	const refresh = async () => {
		const res = await fetchFresh();
		if (res.status === 200 && !res.headers.has("set-cookie")) {
			const copy = new Response(res.clone().body, res);
			const origin = res.headers.get("cache-control");
			if (origin) copy.headers.set("x-origin-cache-control", origin);
			copy.headers.set("cache-control", `public, max-age=${KEEP_SECONDS}`);
			copy.headers.set("x-edge-cached-at", String(now));
			waitUntil(cache.put(key, copy));
		}
		return res;
	};

	const hit = await cache.match(key);
	if (!hit) return forBrowser(await refresh(), "MISS");
	const stale = now - Number(hit.headers.get("x-edge-cached-at") ?? 0) > FRESH_MS;
	if (stale) waitUntil(refresh().catch(() => undefined));
	return forBrowser(hit, stale ? "STALE" : "HIT");
}
