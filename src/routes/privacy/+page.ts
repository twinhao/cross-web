import { STATIC_PAGE_CACHE } from "#lib/cache-control.ts";
import type { SeoProps } from "#lib/components/Seo.svelte";
import type { PageLoad } from "./$types";

const DESCRIPTION =
	"Cross 隱私權政策：說明網站與 App 蒐集的個人資料、使用目的、提供對象與受託廠商、保護措施，以及刪除帳號與個資法權利的行使方式。";

// 靜態頁：CDN 長期快取（setHeaders 只在 server 端生效，瀏覽器端換頁時是 no-op）
export const load: PageLoad = ({ setHeaders }) => {
	setHeaders({ "cache-control": STATIC_PAGE_CACHE });
	return { seo: { title: "隱私權政策", description: DESCRIPTION, canonical: "/privacy" } satisfies SeoProps };
};
