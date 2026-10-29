// 靜態分享卡：不依賴請求、外部圖片或正式資料；SVG 輸出轉為字形路徑，PNG 無需字型即可顯示。
// 重建：CROSS_SOCIAL_FONT=/path/to/NotoSansTC-Bold.ttf CROSS_SOCIAL_FONT_REGULAR=/path/to/NotoSansTC-Medium.ttf node scripts/generate-social-cards.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.resolve("cf-workers-og"));
const { Resvg, initWasm } = require("@resvg/resvg-wasm");
const rendererDir = dirname(require.resolve("@resvg/resvg-wasm"));
await initWasm(await readFile(join(rendererDir, "index_bg.wasm")));
if (!process.env.CROSS_SOCIAL_FONT) throw new Error("請以 CROSS_SOCIAL_FONT 指定 Noto Sans TC 字型檔。");
const fonts = [await readFile(process.env.CROSS_SOCIAL_FONT)];
if (process.env.CROSS_SOCIAL_FONT_REGULAR) fonts.push(await readFile(process.env.CROSS_SOCIAL_FONT_REGULAR));

const out = new URL("../static/social/", import.meta.url);
await mkdir(out, { recursive: true });
const text = (x, y, value, size = 24, color = "#14233d", weight = 500, extra = "") =>
  `<text x="${x}" y="${y}" font-family="${weight < 700 ? "Noto Sans TC Medium" : "Noto Sans TC"}" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${value}</text>`;
const rect = (x, y, w, h, r, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const cross = (x, y, size, color) =>
  `<path d="M${x + size * .39} ${y}h${size * .22}v${size * .39}h${size * .39}v${size * .22}h-${size * .39}v${size * .39}h-${size * .22}v-${size * .39}h-${size * .39}v-${size * .22}h${size * .39}Z" fill="${color}"/>`;

function appointmentCard() {
  const days = ["一", "二", "三", "四", "五"];
  const rows = [
    { time: "09:30", title: "肌膚諮詢", subtitle: "諮詢服務 · 30 分鐘", color: "#1d4ed8", bg: "#eef3ff" },
    { time: "10:30", title: "療程預約", subtitle: "療程服務 · 60 分鐘", color: "#167a6e", bg: "#edf8f4" },
  ];
  return `<g filter="url(#shadow)">${rect(726, 144, 408, 376, 26, "#fff")}</g>
    ${rect(726, 144, 408, 376, 26, "none", 'stroke="#dbe4f1"')}
    ${text(754, 190, "預約工作台", 25, "#14233d", 700)}
    ${rect(1026, 166, 80, 32, 16, "#eef3ff")}${text(1066, 189, "本週", 18, "#1d4ed8", 600, 'text-anchor="middle"')}
    ${days.map((day, i) => {
      const x = 754 + i * 72;
      return `${i === 2 ? rect(x - 6, 216, 64, 80, 15, "#1d4ed8") : ""}
        ${text(x + 26, 243, day, 17, i === 2 ? "#dbeafe" : "#718096", 500, 'text-anchor="middle"')}
        ${text(x + 26, 278, String(19 + i), 27, i === 2 ? "#fff" : "#14233d", 700, 'text-anchor="middle"')}`;
    }).join("")}
    ${rows.map((row, i) => {
      const y = 320 + i * 87;
      return `${text(754, y + 29, row.time, 20, "#5b6a80", 600)}
        ${rect(824, y, 282, 72, 13, row.bg)}${rect(824, y + 13, 4, 46, 2, row.color)}
        ${text(842, y + 29, row.title, 22, row.color, 700)}
        ${text(842, y + 54, row.subtitle, 15, "#65758a", 500)}`;
    }).join("")}
    ${rect(902, 494, 214, 49, 24, "#142d58")}
    <circle cx="929" cy="519" r="9" fill="#a2ead6"/>
    <path d="m925 519 3 3 5-6" stroke="#125b4c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${text(947, 526, "安排，一目了然", 18, "#fff", 600)}`;
}

function card({ eyebrow, first, second, subtitle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><filter id="shadow" x="-25%" y="-25%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="20" flood-color="#18356a" flood-opacity=".10"/></filter></defs>
    ${rect(0, 0, 1200, 630, 0, "#f8fafc")}
    ${rect(704, 0, 496, 630, 0, "#eaf0fb")}
    <path d="M1008-70h106v176h176v106h-176v176h-106V212H832V106h176Z" fill="#dce6f8" opacity=".7"/>
    <g font-family="Noto Sans TC">
      ${rect(64, 55, 49, 49, 13, "#1d4ed8")}${cross(76, 67, 25, "#fff")}
      ${text(129, 94, "Cross", 43, "#14233d", 700)}
      ${text(64, 185, eyebrow, 21, "#1d4ed8", 600)}
      ${text(60, 285, first, 65, "#14233d", 700, 'letter-spacing="-2"')}
      ${text(60, 376, second, 65, "#1d4ed8", 700, 'letter-spacing="-2"')}
      ${text(64, 443, subtitle, 24, "#5b6a80", 500)}
      <path d="M64 523H638" stroke="#dce3ee"/>
      ${text(64, 569, "線上預約  /  人員排班  /  院所管理", 19, "#5b6a80", 500)}
      ${text(1134, 586, "cross.twinhao.com", 17, "#65758a", 500, 'text-anchor="end"')}
      ${appointmentCard()}
    </g>
  </svg>`;
}

for (const config of [
  { name: "cross-overview-20261029", eyebrow: "線上預約與院所管理平台", first: "讓每一次預約，", second: "都安排得剛剛好。", subtitle: "找到服務、選好時間，從 Cross 開始。" },
  { name: "cross-clinics-20261029", eyebrow: "給診所與醫美團隊", first: "預約有條理，", second: "服務更從容。", subtitle: "從專屬院所頁，接上每一次預約。" },
]) {
  const renderer = new Resvg(card(config), { font: { fontBuffers: fonts, defaultFontFamily: "Noto Sans TC" } });
  const rendered = renderer.render();
  try {
    await writeFile(new URL(`${config.name}.png`, out), rendered.asPng());
    await writeFile(new URL(`${config.name}.svg`, out), renderer.toString());
  } finally { rendered.free(); renderer.free(); }
  console.log(`已產生 ${config.name}（1200 × 630）`);
}
// 保留舊圖片入口相容性；新 metadata 使用有版本的網址。
await writeFile(new URL("../static/og.png", import.meta.url), await readFile(new URL("cross-overview-20261029.png", out)));
