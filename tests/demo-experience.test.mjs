import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { startPreview, buildProblem, CHROME } from "./support/built-app.mjs";
import { demoDay } from "../src/lib/demo/data.ts";

let browser, preview;
const dir = process.env.DEMO_EVIDENCE_DIR ?? "/private/tmp/cross-demo-evidence-20261028";
before(async () => {
  assert.equal(buildProblem(), null);
  preview = process.env.DEMO_ORIGIN ? { origin: process.env.DEMO_ORIGIN, stop() {} } : await startPreview(4496);
  browser = await chromium.launch({ executablePath: CHROME }); await mkdir(dir, { recursive: true });
});
after(async () => { await browser?.close(); preview?.stop(); });
async function open(width = 1440, dark = false) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: dark ? "dark" : "light" }), errors = [], network = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ dark }) => { localStorage.setItem("access_token", "do-not-change-real-token"); localStorage.setItem("refresh_token", "do-not-change-real-refresh"); localStorage.setItem("theme", dark ? "dark" : "light"); }, { dark });
  await page.route("**/api/**", route => { network.push({ url: route.request().url(), method: route.request().method() }); return route.abort(); });
  return { page, errors, network };
}
async function intact(page, errors, network) {
  assert.deepEqual(errors, []); assert.deepEqual(network, [], "示範不應發送任何 API 請求");
  assert.equal(await page.evaluate(() => localStorage.getItem("access_token")), "do-not-change-real-token");
  assert.equal(await page.evaluate(() => localStorage.getItem("refresh_token")), "do-not-change-real-refresh");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.querySelector(".demo-scroll").scrollWidth > innerWidth), false);
}

test("示範門面與三視角在手機、平板、桌面亮暗色可操作，照片正常且清楚標註", async () => {
  for (const width of [320, 390, 768, 1440]) for (const dark of [false, true]) {
    const { page, errors, network } = await open(width, dark);
    try {
      const response = await page.goto(preview.origin + "/demo");
      assert.match(response.headers()["x-robots-tag"], /noindex/);
      await page.getByRole("heading", { name: "澄光美學診所｜示範", exact: true }).waitFor();
      await page.getByRole("img", { name: "澄光美學診所｜示範 logo", exact: true }).evaluate(image => image.decode());
      assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
      await page.locator('[aria-label="院所環境照片"] img').first().evaluate(image => image.decode());
      await page.getByRole("button", { name: "放大澄光美學診所｜示範環境照片", exact: true }).click();
      for (let photo = 0; photo < 3; photo++) {
        await page.getByRole("dialog").locator("figure img").evaluate(image => image.decode());
        if (photo < 2) await page.getByRole("button", { name: "下一張", exact: true }).click();
      }
      await page.getByRole("button", { name: "關閉相簿", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      const doctor = page.getByRole("button", { name: "查看 林醫師（示範） 詳細資料", exact: true });
      await doctor.scrollIntoViewIfNeeded();
      await doctor.locator("img").evaluate(image => image.decode());
      await doctor.click();
      await page.getByRole("dialog").getByRole("img", { name: "林醫師（示範）", exact: true }).evaluate(image => image.decode());
      await page.getByRole("dialog").getByText("照片為 AI 生成的虛構人像，非真實醫師", { exact: true }).waitFor();
      await page.screenshot({ path: `${dir}/doctor-${width}-${dark}.png`, animations: "disabled" });
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: `${dir}/clinic-${width}-${dark}.png`, animations: "disabled" });
      await intact(page, errors, network);
      await page.getByRole("navigation", { name: "切換示範視角" }).getByRole("link", { name: "院所後台", exact: true }).click();
      await page.locator(".cross-admin h1").getByText("今日工作台", { exact: true }).waitFor();
      await page.getByRole("region", { name: "院所上線準備", exact: true }).getByRole("status").getByText("已找到可線上預約的時段", { exact: true }).waitFor();
      await page.screenshot({ path: `${dir}/admin-${width}-${dark}.png`, animations: "disabled" });
      await intact(page, errors, network);
    } finally { await page.close(); }
  }
});

test("示範使用頁面捲動，篩選不跳回頂端；報到、搜尋與常用時段可完整操作", async () => {
  for (const width of [390, 1440]) {
    const { page, errors, network } = await open(width);
    try {
      await page.goto(preview.origin + "/demo?mode=admin&tab=appointments");
      const first = page.locator("button").filter({ hasText: "詳情／改期" }).filter({ visible: true }).first();
      await first.waitFor();
      const header = await page.getByLabel("示範體驗導覽", { exact: true }).boundingBox();
      assert.ok(header.height < (width < 640 ? 160 : 100), "示範導覽應保持精簡");
      assert.equal(await page.locator(".demo-scroll").evaluate(element => getComputedStyle(element).overflowY), "visible");
      if (width < 768) {
        const bottom = await page.getByRole("navigation", { name: "手機後台主要導覽", exact: true }).boundingBox();
        assert.ok(bottom.height < 100, "手機導覽不應撐滿內容區或遮住操作");
      }
      await page.getByRole("link", { name: "前往為陳小晴（示範）報到", exact: true }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: "為陳小晴（示範）報到", exact: true }).click();
      await page.getByText("陳小晴（示範） 已報到，請至「候診與服務」查看。", { exact: true }).waitFor();
      await page.getByRole("link", { name: "預約與紀錄", exact: true }).click();
      await page.getByRole("heading", { name: "預約管理", exact: true }).waitFor();
      await page.evaluate(() => window.scrollTo({ top: 100, behavior: "instant" }));
      assert.ok(await page.evaluate(() => scrollY) > 50);
      await page.getByRole("button", { name: "未來七天", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("view") === "week");
      assert.ok(await page.evaluate(() => scrollY) > 50, "切換預約篩選不應強制回頂端");
      await page.getByRole("button", { name: "示範說明", exact: true }).click();
      await page.getByRole("heading", { name: "關於這次示範", exact: true }).waitFor();
      await page.getByRole("button", { name: "繼續體驗", exact: true }).click();
      await page.goto(preview.origin + "/demo?mode=admin&tab=patients");
      await page.getByPlaceholder("搜尋既有客戶", { exact: true }).fill("陳小晴");
      await page.getByText("本頁 1 位", { exact: true }).waitFor();
      await page.goto(preview.origin + "/demo?mode=admin&tab=schedule");
      await page.getByRole("button", { name: "設定常用時段", exact: true }).click();
      await page.getByLabel("開始時間", { exact: true }).first().fill("09:30");
      await page.getByRole("button", { name: "儲存常用時段", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "設定常用時段", exact: true }).click();
      assert.equal(await page.getByLabel("開始時間", { exact: true }).first().inputValue(), "09:30");
      await page.keyboard.press("Escape");
      await page.getByRole("navigation", { name: "切換示範視角" }).getByRole("link", { name: "院所門面", exact: true }).click();
      await page.getByRole("navigation", { name: "店家內容", exact: true }).getByRole("link", { name: "服務項目", exact: true }).click();
      await page.waitForURL(url => url.hash === "#services");
      await page.waitForFunction(() => {
        const section = document.querySelector("#services").getBoundingClientRect();
        const header = document.querySelector('[aria-label="示範體驗導覽"]').getBoundingClientRect();
        return section.top >= header.bottom - 1 && section.top < innerHeight;
      });
      await page.screenshot({ path: `${dir}/smooth-clinic-${width}.png`, animations: "disabled" });
      await intact(page, errors, network);
    } finally { await page.close(); }
  }
});

test("完成示範預約後能在後台找到同一筆資料；重置需確認，不動真實登入", async () => {
  for (const width of [390, 1440]) {
    const { page, errors, network } = await open(width);
    try {
      await page.goto(preview.origin + "/demo?mode=booking");
      await page.getByRole("button", { name: /初次肌膚諮詢/ }).click();
      await page.getByRole("button", { name: "選擇預約時間", exact: true }).click();
      await page.getByRole("button", { name: /林醫師（示範）/ }).locator("img").evaluate(image => image.decode());
      await page.screenshot({ path: `${dir}/booking-doctor-${width}.png`, animations: "disabled" });
      await page.getByRole("button", { name: /不指定人員|不指定/ }).first().click();
      await page.locator(`[data-value="${demoDay(1)}"][role="button"]`).click();
      await page.getByRole("button", { name: "09:00", exact: true }).click();
      await page.getByRole("button", { name: "確認預約資料", exact: true }).click();
      await page.getByText("陳小晴（示範）", { exact: true }).waitFor();
      await page.locator("#privacy").click();
      await page.getByRole("button", { name: "完成示範預約", exact: true }).click();
      await page.getByRole("heading", { name: "示範預約完成", exact: true }).waitFor();
      await page.screenshot({ path: `${dir}/success-${width}.png` });
      await page.getByRole("link", { name: "到後台查看此預約", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("mode") === "admin" && url.searchParams.get("start") === demoDay(1));
      await page.locator(".cross-admin").getByText("陳小晴（示範）", { exact: false }).filter({ visible: true }).first().waitFor();
      assert.equal(new URL(page.url()).searchParams.get("start"), demoDay(1));
      await page.getByRole("tab", { name: width < 768 ? "七日清單" : "週行程", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("mode") === "admin" && url.searchParams.get("view") === "week");
      await intact(page, errors, network);
      await page.getByRole("button", { name: "重置", exact: true }).click();
      await page.getByRole("button", { name: "保留示範資料", exact: true }).click();
      assert.match(page.url(), /mode=admin/);
      await page.getByRole("button", { name: "重置", exact: true }).click();
      await page.getByRole("button", { name: "確認重置", exact: true }).click();
      await page.getByRole("heading", { name: "澄光美學診所｜示範", exact: true }).waitFor();
      await intact(page, errors, network);
    } finally { await page.close(); }
  }
});

test("院所後台各功能可載入，新增服務會反映到示範門面，重新整理還原", async () => {
  const { page, errors, network } = await open();
  try {
    for (const tab of ["appointments", "queue", "patients", "schedule", "analytics", "stats", "info", "personnel", "services", "announcements", "subscription"]) {
      await page.goto(preview.origin + `/demo?mode=admin&tab=${tab}`);
      await page.locator(".cross-admin h1").waitFor();
      await page.waitForFunction(() => !document.querySelector('.cross-admin [aria-label="載入後台中…"]'));
      if (tab === "analytics") await page.getByRole("heading", { name: "預約來源", exact: true }).waitFor();
      if (tab === "stats") await page.getByText("平均看診 30 分鐘", { exact: false }).first().waitFor();
      if (tab === "queue") await page.getByRole("heading", { name: "林醫師（示範）", exact: true }).waitFor();
      if (tab === "patients") await page.getByRole("button", { name: "查看陳小晴（示範）的客戶檔案", exact: true }).first().waitFor();
      if (tab === "services") await page.getByText("初次肌膚諮詢", { exact: true }).waitFor();
      if (tab === "personnel") await page.getByRole("img", { name: "林醫師（示範）", exact: true }).evaluate(image => image.decode());
      if (tab === "announcements") await page.getByText("歡迎體驗完整預約流程", { exact: false }).first().waitFor();
      if (tab === "subscription") await page.getByRole("heading", { name: "訂閱與付款狀態", exact: true }).waitFor();
      assert.doesNotMatch(await page.locator(".cross-admin").innerText(), /此操作不提供示範|無法載入|載入失敗|發生錯誤/);
      await intact(page, errors, network);
    }
    await page.goto(preview.origin + "/demo?mode=admin&tab=services");
    await page.getByRole("button", { name: "新增服務", exact: true }).click();
    await page.getByLabel("服務名稱", { exact: true }).fill("新增示範服務");
    await page.getByRole("button", { name: "儲存服務", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText("新增示範服務", { exact: true }).waitFor();
    await page.getByRole("navigation", { name: "切換示範視角" }).getByRole("link", { name: "院所門面", exact: true }).click();
    await page.waitForURL(preview.origin + "/demo");
    await page.getByText("新增示範服務", { exact: true }).waitFor();
    await page.reload(); await page.getByRole("heading", { name: "澄光美學診所｜示範", exact: true }).waitFor();
    assert.equal(await page.getByText("新增示範服務", { exact: true }).count(), 0);
    await intact(page, errors, network);
  } finally { await page.close(); }
});
