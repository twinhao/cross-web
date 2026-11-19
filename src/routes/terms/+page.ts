import { STATIC_PAGE_CACHE } from "#lib/cache-control.ts";
import type { SeoProps } from "#lib/components/Seo.svelte";
import type { PageLoad } from "./$types";

const DESCRIPTION =
	"Cross 服務條款：使用 Cross 網站與 App 線上預約的服務說明、預約規則、使用者責任、免責聲明、退款與訂閱取消等規定。";

// 靜態頁：CDN 長期快取（setHeaders 只在 server 端生效，瀏覽器端換頁時是 no-op）
export const load: PageLoad = ({ setHeaders }) => {
	setHeaders({ "cache-control": STATIC_PAGE_CACHE });
	return { seo: { title: "服務條款", description: DESCRIPTION, canonical: "/terms" } satisfies SeoProps };
};
