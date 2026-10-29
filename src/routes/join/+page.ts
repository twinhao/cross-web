import { STATIC_PAGE_CACHE } from "../../lib/cache-control.ts";
import type { SeoProps } from "../../lib/components/Seo.svelte";
import type { PageLoad } from "./$types";
import { CLINIC_SHARE_IMAGE } from "../../lib/seo/social.ts";

// 院所導入頁保留靜態頁快取。
export const load: PageLoad = ({ setHeaders }) => {
	setHeaders({ "cache-control": STATIC_PAGE_CACHE });
	return {
		seo: {
			title: "院所導入",
			description:
				"Cross 協助診所與醫美院所建立品牌門面，從 LINE 與社群承接預約，集中管理諮詢、療程、人員排班與候診流程。了解免費、標準與專業方案。",
			canonical: "/join",
			openGraph: {
				title: "預約有條理，服務更從容。｜Cross 院所導入",
				description: "從專屬院所頁承接社群預約，集中管理人員排班與服務流程。給診所與醫美團隊的 Cross。",
				url: "/join",
				type: "website",
				siteName: "Cross",
				locale: "zh_TW",
			},
			twitter: {
				card: "summary_large_image",
				title: "預約有條理，服務更從容。｜Cross 院所導入",
				description: "從專屬院所頁承接社群預約，集中管理人員排班與服務流程。",
			},
			image: {
				url: `https://cross.twinhao.com${CLINIC_SHARE_IMAGE}`,
				alt: "Cross 院所導入：預約有條理，服務更從容。",
				type: "image/png",
				width: 1200,
				height: 630,
			},
		} satisfies SeoProps,
	};
};
