import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { buildProblem, startPreview, CHROME } from "./support/built-app.mjs";
import { setupComplete, facilityId } from "./support/admin-complete.mjs";
let preview, browser;
const dir = "/private/tmp/cross-gallery-admin-qa-20261025";
before(async () => { assert.equal(buildProblem(), null); preview = process.env.FACILITY_GALLERY_ORIGIN ? { origin: process.env.FACILITY_GALLERY_ORIGIN, stop() {} } : await startPreview(4430); browser = await chromium.launch({ executablePath: CHROME }); await mkdir(dir, { recursive: true }); });
after(async () => { await browser?.close(); preview?.stop(); });
async function fixture(width = 390, dark = false, role = "facility_admin") {
  const data = await setupComplete(browser, preview.origin, { width, role });
  const { page } = data;
  if (dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const state = { fail: false, conflict: false, revision: 1, writes: [], photos: ["接待空間", "診間"].map((caption, i) => ({ id: `photo-${i}`, url: "/cross-icon.png", caption })) };
  await page.route("**/api/v1/medical-facilities/*/photos**", async (route) => {
    const req = route.request(), method = req.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (state.fail) return json({ detail: "虛構相簿讀取失敗" }, 500);
    if (method !== "GET") state.writes.push({ method, type: req.headers()["content-type"], body: method === "PATCH" ? req.postDataJSON() : null });
    if (method === "PATCH") {
      if (state.conflict) { state.conflict = false; state.revision++; return json({ detail: "相簿已被更新" }, 409); }
      const body = req.postDataJSON();
      assert.equal(body.revision, String(state.revision).padStart(64, "0"));
      state.photos = body.photos.map((photo) => ({ ...state.photos.find((p) => p.id === photo.id), ...photo }));
    }
    if (method === "POST") state.photos.push({ id: `uploaded-${state.revision}`, url: "/cross-icon.png", caption: "" });
    if (method === "DELETE") state.photos = state.photos.filter((photo) => photo.id !== new URL(req.url()).pathname.split("/").at(-1));
    if (method !== "GET") state.revision++;
    return json({ photos: state.photos, revision: String(state.revision).padStart(64, "0"), max_photos: 12 });
  });
  return { ...data, gallery: state };
}
async function editor(page) {
  await page.goto(`${preview.origin}/admin/clinics/${facilityId}?tab=info`);
  await page.getByRole("button", { name: "編輯資訊", exact: true }).click();
  await page.getByRole("heading", { name: "院所環境相簿", exact: true }).waitFor();
  return page.getByRole("dialog");
}
test("後台可上傳、設封面、儲存說明與取消／確認移除，保留未儲存院所表單", async () => {
  const { page, gallery, errors, requests } = await fixture();
  try {
    const dialog = await editor(page);
    await dialog.getByLabel("院所名稱", { exact: true }).fill("尚未儲存的院所名稱");
    await dialog.getByRole("button", { name: "設為封面", exact: true }).click();
    await dialog.getByText("照片順序已儲存，第一張為封面。", { exact: true }).waitFor();
    assert.equal(gallery.photos[0].id, "photo-1");
    await dialog.getByLabel("照片 1 說明", { exact: true }).fill("明亮的診間");
    await dialog.getByLabel("照片 1 說明", { exact: true }).press("Enter");
    await dialog.getByText("照片說明已儲存", { exact: true }).waitFor();
    assert.equal(gallery.photos[0].caption, "明亮的診間");
    assert.equal(await dialog.getByLabel("院所名稱", { exact: true }).inputValue(), "尚未儲存的院所名稱");
    assert.equal(requests.filter((r) => r.method === "PATCH" && r.path === `/api/v1/medical-facilities/${facilityId}`).length, 0);
    await dialog.getByLabel(/上傳環境照片/).setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: await readFile("static/cross-icon.png") });
    await dialog.getByText("已上傳 1 張照片，會顯示於公開院所頁。", { exact: true }).waitFor();
    assert.equal(gallery.photos.length, 3);
    assert.match(gallery.writes.find((r) => r.method === "POST").type, /multipart\/form-data/);
    await dialog.getByRole("button", { name: "移除照片 1", exact: true }).click();
    await page.getByRole("button", { name: "保留照片", exact: true }).click();
    assert.equal(gallery.photos.length, 3);
    await dialog.getByRole("button", { name: "移除照片 1", exact: true }).click();
    await page.getByRole("button", { name: "確認移除照片", exact: true }).click();
    await dialog.getByText("照片已移除", { exact: true }).waitFor();
    assert.equal(gallery.photos[0].id, "photo-0");
    await dialog.getByLabel("照片 1 說明", { exact: true }).fill("與院所資訊一起儲存");
    await dialog.getByRole("button", { name: "儲存院所", exact: true }).click();
    await page.getByRole("heading", { name: "編輯院所", exact: true }).waitFor({ state: "hidden" });
    assert.equal(gallery.photos[0].caption, "與院所資訊一起儲存");
    assert.equal(requests.filter((r) => r.method === "PATCH" && r.path === `/api/v1/medical-facilities/${facilityId}`).length, 1);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test("相簿載入失敗能重試，409 重新載入且不假裝儲存成功，阻擋超大檔案", async () => {
  const { page, gallery, errors } = await fixture(); gallery.fail = true;
  try {
    const dialog = await editor(page);
    await dialog.getByRole("button", { name: "重新載入相簿", exact: true }).waitFor();
    gallery.fail = false;
    await dialog.getByRole("button", { name: "重新載入相簿", exact: true }).click();
    await dialog.getByRole("button", { name: "設為封面", exact: true }).waitFor();
    gallery.conflict = true;
    await dialog.getByRole("button", { name: "設為封面", exact: true }).click();
    await dialog.getByText("相簿已更新或已達張數上限，已重新載入。請確認後再操作。", { exact: true }).waitFor();
    assert.equal(gallery.photos[0].id, "photo-0");
    const count = gallery.writes.length;
    await dialog.locator('input[type="file"][multiple]:enabled').waitFor();
    await dialog.getByLabel(/上傳環境照片/).setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await dialog.getByText("請選擇每張不超過 5 MB 的 JPG、PNG 或 WebP。", { exact: true }).waitFor();
    assert.equal(gallery.writes.length, count);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test("相簿管理在最窄手機與桌面亮暗色無溢出，控制項可讀", async () => {
  for (const width of [320, 1440]) for (const dark of [false, true]) {
    const { page, errors } = await fixture(width, dark);
    try {
      await page.goto(`${preview.origin}/admin/clinics/${facilityId}?tab=info`);
      await page.getByRole("button", { name: "環境相簿", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("照片 1 說明", { exact: true }).waitFor();
      await dialog.getByRole("heading", { name: "院所環境相簿", exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      await page.screenshot({ path: `${dir}/editor-${width}-${dark ? "dark" : "light"}.png`, fullPage: false });
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
});

test("院所設定可直接開相簿，完成時一併儲存說明，一般員工不顯示管理入口", async () => {
  const { page, gallery } = await fixture();
  try {
    await page.goto(`${preview.origin}/admin/clinics/${facilityId}?tab=info`);
    await page.getByRole("button", { name: "環境相簿", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("照片 1 說明", { exact: true }).fill("入口接待空間");
    await dialog.getByRole("button", { name: "完成", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(gallery.photos[0].caption, "入口接待空間");
  } finally { await page.close(); }
  const staff = await fixture(390, false, "facility_staff");
  try {
    await staff.page.goto(`${preview.origin}/admin/clinics/${facilityId}?tab=info`);
    await staff.page.getByRole("heading", { name: "基本資訊", exact: true }).waitFor();
    assert.equal(await staff.page.getByRole("button", { name: "環境相簿", exact: true }).count(), 0);
    assert.equal(staff.gallery.writes.length, 0);
  } finally { await staff.page.close(); }
});
