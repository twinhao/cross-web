# CLAUDE.md

## 產品主軸

Cross 以「線上預約與院所營運管理」為核心，優先完成醫美院所的諮詢與療程預約導入及付費驗證。民眾找院所／預約與院所導入是主要入口；開發者文件、設備與 API 為次要擴充，不可將預約描述為參考應用或附加能力。

## 目前架構（2026-10-25）

Cross Web 使用 SvelteKit 3.1 / Svelte 5，UI 一律繁體中文。正式網址 https://cross.twinhao.com，發布紀錄位於上層 `docs/deployment-sveltekit-2026-10-23.md`。

- 路由：`src/routes/`；共用程式、型別、元件：`src/lib/`，匯入採用 `package.json` 的 `#lib/*` subpath imports（含副檔名）。
- 公開頁、預約、會員、開發者文件、看板使用 Svelte。UI 使用 Svelte 5 runes、Tailwind 4、shadcn-svelte / Bits UI，沿用既有設計 tokens。
- 院所工作區：`src/lib/components/admin/workspace/`，今日工作台、預約、叫號、排班（含批次）及客戶清單使用原生 Svelte 5。`AdminPage.svelte` 在掛載前檢查院所歸屬與角色。
- 完整原生後台：`src/lib/components/admin/manage/` 包含登入、平台管理、院所／Logo、人員／照片／服務對應／休假、服務、公告、客戶完整檔案、分析、訂閱與修改密碼。React／Radix React 依賴、JSX 設定及 `admin-compat/` 已移除。完整範圍見 `docs/admin-compatibility.md`。
- API 代理：`src/routes/api/v1/[...path]/+server.ts`；本機 Vite proxy 指向 `http://localhost:8001`。`BACKEND_URL` 為伺服器變數，`src/env.ts` 明確宣告允許公開的既有 `NEXT_PUBLIC_` 變數，私密後端網址不會進入瀏覽器。
- 登入與主題沿用 `access_token` / `refresh_token` / `theme` 儲存鍵；不要建立另一份 React token 狀態。
- 需登入頁面關閉 SSR。公開文件與公開頁保留 SSR 與 SEO；看板使用遮罩姓名並設 noindex。
- 框架設定：`vite.config.ts` 的 `sveltekit(...)`，SvelteKit 3 不使用 `svelte.config.js`；TypeScript extends `$app/tsconfig`。
- 正式網站為 Cloudflare Workers + Static Assets，Worker `cross-web`，唯一正式入口 `cross.twinhao.com`；設定在 `wrangler.jsonc` 的 `env.production`。Cloud Run API 與 Neon PostgreSQL 18 維持既有位置。
- 預覽 Worker `cross-web-preview` 預設禁止寫入正式 API；正式 Worker 關閉 workers.dev 及版本預覽網址。`BACKEND_URL` 必須明確設定，禁止缺值時自動回退正式後端。
- Cloudflare Builds 連接 `twinhao/cross-web` 的 `main`，建置命令 `pnpm check && pnpm lint && pnpm build`，部署命令 `pnpm exec wrangler deploy --env production`。不可省略環境旗標，否則會部署預覽 Worker。
- Vercel Git 自動部署已在 `vercel.json` 停用，既有部署保留為歷史回復產物。正式版回復優先使用 Cloudflare 既有版本。

## 開發與驗證

- Node 22.17 以上或 24；pnpm 10.34.5。
- `pnpm dev`，預設 http://localhost:5173。
- `pnpm check`、`pnpm lint`、`pnpm build`、`pnpm test`。瀏覽器測試前先建置，允許本機測試伺服器與無頭 Chrome；測試會拒絕過期產物。
- `pnpm preview`。唯讀正式 API 驗收需明確覆寫本機的 `BACKEND_URL`，不可拿 `.env.local` 的本機後端結果當正式資料。
- `pnpm check:worker` 檢查 Workers 產物；`pnpm deploy:preview` 發布唯讀預覽，`pnpm deploy:production` 發布正式環境。私密綁定使用 Wrangler secrets，不將憑證提交 Git。
- 所有寫入驗收使用虛構 API 或隔離測試環境，不對正式病人／預約資料做測試寫入。
- 原遷移設計：`docs/superpowers/plans/2026-10-19-sveltekit-migration.md`。歷史計畫保留原紀錄；目前全面原生化範圍與測試以 `docs/admin-compatibility.md` 為準。

## 領域模型

型別位於 `src/lib/types/clinic.ts`。`Clinic` 含院所、成員、服務與訂閱設定。

- `HospitalLevel`: medical_center / regional_hospital / district_hospital / clinic。
- `FacilityType`: healthcare（看診，含健保與自費）/ aesthetic（醫美）/ beauty（美容）/ other（其他）。
- `PaymentType`: nhi / self_pay / both，與服務分類分開。
- `MedicalDepartment`: 18 個台灣醫療科別，需與後端及行動端一致。

## UI 與輸出

新增畫面與視覺更新優先使用 Luma shadcn/ui registry 的 blocks / components，沿用專案設計 tokens；沒有對應元件才自建。Svelte 元件位於 `src/lib/components/`，後台元件集中於 `admin/workspace/` 與 `admin/manage/`，避免重新引入 React 相容層。

後台載入狀態使用 shadcn-svelte 的 Skeleton（`admin/layout/AdminSkeleton.svelte`），不是 Skeleton UI 元件庫；不引入 `@skeletonlabs/*`。共用版型與表單規範見 `docs/admin-luma-guide.md`。

對話、文件、註解與 commit message 一律繁體中文。

## Security

Run Snyk code scanning on new first-party code. Fix any issues found and rescan until clean.

## 預約工作區規則

- 完整示範院所入口 `/demo`，使用獨立身分與分頁記憶體 API，禁止回退到正式後端；`mode` 為示範視角，`view` 保留給後台日曆。切換視角不能重置資料，只有明確重置或重新整理才還原。詳見 `docs/demo-experience.md`。

- 民眾預約為三階段：選服務 → 選人員與日期時段 → 確認對象、備註與同意。`BookingFlow.svelte` 在第 2、3 步取得及重新核對名額，草稿還原至第 3 步後仍須核對可約時段，最終交易由後端驗證。
- `BookingSummary.svelte` 共用桌面側欄與手機確認摘要，費用一律通過 `getServicePriceBadge`，不得忽略 `show_price=false`。
- 姓名開啟帳戶選單；`/member` 專注預約，`/member/profile` 管理個人資料與帳號。新會員頁須沿用 `requireMember`，不讓院所／管理員帳號進入民眾帳戶頁。
- 院所可儲存上午／下午／晚間的常用時段，僅套用新建班表；修改常用時段不得覆寫既有排班、營業時間或預約。公開時刻表顯示完整起迄時間，保留連續跨時段及休息前後班段。
- 班表編輯／刪除需由後端確認未排除已確認、已報到或進行中的預約；409 衝突須在表單呈現，不能先更新介面假裝成功。
- 可用時段依已授權的班表、休假、院所營業時間與預約時長快照計算，改期需排除原預約；送出仍由後端鎖定並檢查衝突。不得將前端時段計算當作授權或交易邊界。
- 列表失敗不得顯示成無預約；保留舊資料時標示更新時間。取消、未到與完成服務必須核對客戶與時段，409 等錯誤應在介面顯示。
- 日期、人員、服務、狀態與頁籤以網址保留；客戶姓名／電話搜尋留在元件狀態，不新增到工作區網址。
- 瀏覽器寫入驗收均攔截 API 並使用虛構資料；`ADMIN_WORKSPACE_ORIGIN` 可驗收部署頁面，所有 API 仍被測試替身攔截。
