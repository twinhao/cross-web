import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { before, after, test } from "node:test";
import { chromium } from "playwright-core";
import { FALLBACK_TAXONOMY } from "../src/lib/api/service-categories.ts";
import { buildProblem, CHROME, startPreview } from "./support/built-app.mjs";

// 獨立的虛構後端同時服務 SSR 與瀏覽器，不存取正式院所／病人資料。
const id = "11111111-3333-4444-5555-666666666666";
const dir = process.env.STOREFRONT_EVIDENCE_DIR ?? "/private/tmp/cross-storefront-qa-20261025";
let server, preview, browser;
const state = { online: true, phone: true, type: "aesthetic" };
const description = "先了解服務內容與預約安排。\n這是第二段完整說明，應能直接閱讀，不需要從截斷的一行猜測內容。";
function response(path) {
  const clinic = { id, name: "虛構品牌門面診所", facility_type: state.type, payment_type: "self_pay", logo: "/cross-icon.png", description: "虛構院所介紹，僅供版面與預約入口驗收。", phone: "0200000000", address: "臺北市信義區虛構路1號", online_booking_enabled: state.online, phone_booking_enabled: state.phone, show_schedule: true, members: [{ id: "staff-a", name: "虛構醫師", role: "doctor" }] };
  if (path === "/api/v1/service-categories") return FALLBACK_TAXONOMY;
  if (path === "/api/v1/booking/clinics") return [clinic];
  if (path.endsWith("/services")) return [{ id: "hidden", service_name: "虛構隱藏價格療程", description, duration_minutes: 30, price: 9876, show_price: false }];
  if (path.endsWith("/doctors")) return [{ id: "staff-a", name: "虛構醫師", avatar_url: "/cross-icon.png", main_specialties: ["虛構專長"], education: ["虛構學歷"], experience: [] }];
  if (path.endsWith("/schedule")) return { week_start: "2026-10-19", week_end: "2026-10-25", week_offset: 0, entries: [] };
  if (path.endsWith("/announcements")) return [];
  if (path === `/api/v1/booking/clinics/${id}`) return clinic;
  return [];
}
before(async () => {
  assert.equal(buildProblem(), null);
  server = createServer((req, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(response(new URL(req.url, "http://fixture.invalid").pathname))); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.BACKEND_URL = `http://127.0.0.1:${server.address().port}`;
  preview = await startPreview(4428);
  browser = await chromium.launch({ executablePath: CHROME });
  await mkdir(dir, { recursive: true });
});
after(async () => { await browser?.close(); preview?.stop(); server?.close(); });
async function open(width = 390, dark = false, path = `/clinic/${id}`) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((dark) => localStorage.setItem("theme", dark ? "dark" : "light"), dark);
  await page.route("**/api/**", (route) => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (!["GET", "HEAD"].includes(req.method())) return route.fulfill({ status: 204 });
    return route.fulfill({ status: path === "/api/v1/auth/me" ? 401 : 200, contentType: "application/json", body: JSON.stringify(response(path)) });
  });
  await page.goto(preview.origin + path);
  await page.getByRole("heading", { level: 1 }).waitFor();
  return { page, errors };
}
test("院所首屏依開通設定提供線上、電話或現場入口，不引導至不可用預約", async () => {
  for (const [online, phone, label, href] of [[true, true, "查看可約時段", `/booking/${id}`], [false, true, "電話預約", "tel:0200000000"], [false, false, "查看到訪方式", "#contact"]]) {
    Object.assign(state, { online, phone });
    const { page, errors } = await open();
    try {
      const hero = page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });
      assert.equal(await hero.getByRole("link", { name: label, exact: true }).getAttribute("href"), href);
      if (!online) assert.equal(await page.locator(`a[href="/booking/${id}"]`).count(), 0);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});
test("服務完整說明與團隊詳情可閱讀，隱藏價格不洩漏，醫美與看診的內容順序符合用途", async () => {
  Object.assign(state, { online: true, phone: true, type: "aesthetic" });
  for (const type of ["aesthetic", "healthcare"]) {
    state.type = type;
    const { page, errors } = await open(1440);
    try {
      const services = page.locator("#services");
      assert.match(await services.innerText(), /第二段完整說明/);
      assert.doesNotMatch(await services.innerText(), /9,876|9876|NT\$|免費|健保給付/);
      await page.locator("#team").getByRole("img", { name: "虛構醫師", exact: true }).waitFor();
      const ordering = await page.locator("main h2").allTextContents();
      const serviceIndex = ordering.findIndex((text) => text.includes("服務項目"));
      const scheduleIndex = ordering.findIndex((text) => text.includes("門診時刻表"));
      const teamIndex = ordering.findIndex((text) => text.includes("團隊成員"));
      assert.equal(type === "aesthetic" ? serviceIndex < teamIndex && teamIndex < scheduleIndex : scheduleIndex < teamIndex && teamIndex < serviceIndex, true);
      await page.getByRole("button", { name: "查看 虛構醫師 詳細資料", exact: true }).click();
      await page.getByRole("dialog").getByText("虛構學歷", { exact: true }).waitFor();
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});
test("院所與方案頁在最窄手機、平板、桌面亮暗色可操作，FAQ 可展開", async () => {
  Object.assign(state, { online: true, phone: true, type: "aesthetic" });
  for (const width of [320, 768, 1440]) for (const dark of [false, true]) {
    for (const path of [`/clinic/${id}`, "/pricing"]) {
      const { page, errors } = await open(width, dark, path);
      try {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} ${path}`);
        if (path === "/pricing") {
          await page.getByRole("button", { name: "醫美服務一定要公開價格嗎？", exact: true }).click();
          await page.getByText(/不需要。各項服務可獨立設定/).waitFor();
          await page.getByRole("link", { name: "申請院所導入 （標準版）" }).waitFor();
        }
        await page.screenshot({ path: `${dir}/${path === "/pricing" ? "pricing" : "clinic"}-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    }
  }
});
