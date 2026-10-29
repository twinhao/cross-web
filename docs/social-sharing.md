# 社群分享縮圖

2026-10-29 更新。預設分享圖以中文標題、Cross 品牌色及虛構預約工作台示意，取代原本整面藍底的英文 Logo 圖。

## 圖片與頁面

- 預設：`static/social/cross-overview-20261029.png`，用於首頁及沿用全站分享資訊的頁面。
- 院所導入：`static/social/cross-clinics-20261029.png`，用於 `/join`，搭配專屬標題、描述與正確的 og:url。
- 圖片皆為 1200×630 PNG，另保留已轉字形路徑的 SVG；不需要載入字型或外部圖片即可顯示。
- `static/og.png` 同步預設新圖；舊 `/opengraph-image` 轉址仍可使用。
- 預設 Twitter 卡片為 summary_large_image。診所自己的動態分享卡與品牌資料維持原有規則。

圖片路徑集中在 `src/lib/seo/social.ts`。SEO 輸出使用固定正式網域的絕對網址，避免本機或預覽來源出現在分享卡。

## 重建圖片

設計來源為 `scripts/generate-social-cards.mjs`，以既有的 Resvg WASM 產生 PNG 與字形路徑 SVG，不新增網站執行依賴，也不在請求期間渲染。

字型使用 Google Fonts 官方 [Noto Sans TC](https://github.com/google/fonts/tree/main/ofl/notosanstc)，授權為 [SIL OFL](https://github.com/google/fonts/blob/main/ofl/notosanstc/OFL.txt)。產生時使用靜態 700 與 500 字重；500 的字型名稱為 Noto Sans TC Medium。若下載的是可變字型，先以 fontTools.varLib.instancer 轉為對應靜態字重，再作字元子集化。字型檔僅作本機製圖輸入，不放入網站公開目錄。

```sh
CROSS_SOCIAL_FONT=/path/to/NotoSansTC-Bold.ttf \
CROSS_SOCIAL_FONT_REGULAR=/path/to/NotoSansTC-Medium.ttf \
node scripts/generate-social-cards.mjs
```

變更公開設計後應更新圖片檔名版本及 `social.ts` 的路徑，再建置網站。只覆寫原圖片網址不能保證社群平台重新取得縮圖。

## 驗證

1. 檢查兩張圖的完整尺寸，以及約 400px 寬時主標是否可讀。
2. 執行 `pnpm check`、`pnpm lint`、`pnpm build`、`pnpm test` 與 `pnpm check:worker`。
3. 取得 `/`、`/join`、`/pricing` 的伺服器 HTML，確認只有一個 og:image、Twitter 使用同一張圖，並以實際圖片回應核對 MIME、1200×630 尺寸及檔案雜湊。
4. 發布後重做相同的正式網址核對，不將本機預覽視為正式分享已生效。

新圖片網址能讓重新抓取的頁面使用新圖；舊貼文、已快取的頁面資訊及縮圖是否刷新，仍由各社群平台管理。網站發布不會修改使用者已發表的貼文。
