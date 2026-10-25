import { STATIC_PAGE_CACHE } from "../../lib/cache-control.ts";
import type { SeoProps } from "../../lib/components/Seo.svelte";
import type { PageLoad } from "./$types";

// 院所導入頁保留靜態頁快取。
export const load: PageLoad = ({ setHeaders }) => {
	setHeaders({ "cache-control": STATIC_PAGE_CACHE });
	return {
		seo: {
			title: "院所導入",
			description:
				"Cross 協助診所與醫美院所建立品牌門面，從 LINE 與社群承接預約，集中管理諮詢、療程、人員排班與候診流程。了解免費、標準與專業方案。",
			canonical: "/join",
		} satisfies SeoProps,
	};
};
