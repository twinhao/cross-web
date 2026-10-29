# 網站與 iOS 共用圖示

2026-10-29 起，網站使用 iOS App 的「光環十字」圖示。原稿為相鄰專案的 `Cross-Patient/Cross-Patient/CrossIcon.icon`，Xcode 的 App Icon 設定亦指向 CrossIcon。

## 匯出與尺寸

在安裝 Xcode 的 macOS 執行：

```sh
node scripts/export-ios-icons.mjs
```

腳本直接使用 Icon Composer 內的 ictool，依 iOS／Default 外觀匯出；不是從舊 PNG 放大或重新繪製。再以 Xcode 隨附的 pngcrush 轉為標準 8-bit PNG，保留圖案與色彩描述，避免 16-bit PNG 在 ICO 讀取器中的相容問題。

- 512×512：瀏覽器 PNG 圖示與頁首、頁尾、登入、後台品牌標誌。
- 180×180：apple-touch-icon。
- 16／32／48／64：ICO 內嵌的四個原生匯出尺寸。

圖示路徑集中於 `src/lib/brand.ts`，使用有版本的 `/icons/` 網址；舊 favicon.ico、icon.png、apple-icon.png、cross-icon.png 同步新圖以保留相容性。未加入 PWA 或 Service Worker。

輸出檔已提交，網站建置與正式伺服器不需要 Xcode，也不讀取 iOS 專案。日後更新圖示時應一併調整輸出檔名版本與 `brand.ts`。

## 驗證

執行專案既有檢查、建置及測試後，核對公開頁伺服器 HTML 的圖示宣告與品牌圖片。會員與後台登入的品牌內容在瀏覽器載入後確認；後台登入停用 SSR，不要求其初始 HTML 已有圖示宣告。另核對每個新舊資源網址的 MIME、檔案雜湊、PNG 尺寸與色深、ICO 四個尺寸。

iOS 原稿只讀取、不修改；iOS App 本身沒有重新發布。既有桌面書籤或加入主畫面的圖示，可能仍由瀏覽器或作業系統保留快取。
