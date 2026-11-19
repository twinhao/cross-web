import { STATIC_PAGE_CACHE } from "#lib/cache-control.ts";
import type { SeoProps } from "#lib/components/Seo.svelte";
import type { PageLoad } from "./$types";

const DESCRIPTION =
	"Cross 客服與支援：預約、取消、叫號進度、預約提醒、看診人資料與刪除帳號等常見問題，以及客服聯絡方式。";

// 靜態頁：CDN 長期快取（setHeaders 只在 server 端生效，瀏覽器端換頁時是 no-op）
export const load: PageLoad = ({ setHeaders }) => {
	setHeaders({ "cache-control": STATIC_PAGE_CACHE });
	return { seo: { title: "客服與支援", description: DESCRIPTION, canonical: "/support" } satisfies SeoProps };
};
