import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

// 服務分類字彙（移植自 use-service-taxonomy.ts）：首次回 FALLBACK_TAXONOMY（避免閃爍），
// 整個 app 只打一次 /service-categories，抓到後所有元件共用、之後掛載的元件直接拿快取。
register("./support/svelte-hooks.mjs", import.meta.url);
const { mountServiceTaxonomy } = await import("./support/service-taxonomy-harness.svelte.js");
const { FALLBACK_TAXONOMY } = await import("../src/lib/api/service-categories.ts");
const { refreshServiceTaxonomy } = await import("../src/lib/hooks/service-taxonomy.svelte.ts");

const tick = () => new Promise((r) => setTimeout(r, 0));

test("分類共用快取，維護後保留內容重新取得，舊回應不覆蓋新分類", async (t) => {
  globalThis.window = new EventTarget();
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  t.after(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });
  const fetched = {
    facility_types: [{ value: "healthcare", label: "看診X", categories: [{ code: "x", label: "X 科" }] }],
    payment_types: [{ value: "nhi", label: "健保" }],
  };
  const calls = [];
  let release;
  globalThis.fetch = (url, init) => {
    calls.push(`${init.method} ${url}`);
    return new Promise((r) =>
      (release = () => r(new Response(JSON.stringify(fetched), { headers: { "content-type": "application/json" } }))),
    );
  };

  const first = mountServiceTaxonomy(3);
  t.after(first.destroy);
  for (const s of first.stores) assert.equal(s.current, FALLBACK_TAXONOMY);
  await tick();
  assert.deepEqual(calls, ["GET /api/v1/service-categories"]);

  release();
  await tick();
  await tick();
  for (const s of first.stores) assert.deepEqual(s.current, fetched);

  const later = mountServiceTaxonomy(1);
  t.after(later.destroy);
  assert.deepEqual(later.stores[0].current, fetched, "之後掛載的元件直接拿快取");
  await tick();
  assert.equal(calls.length, 1, "不再打 API");

  const pending = [];
  globalThis.fetch = () => new Promise((resolve) => pending.push((taxonomy) => resolve(new Response(JSON.stringify(taxonomy), { headers: { "content-type": "application/json" } }))));
  refreshServiceTaxonomy();
  refreshServiceTaxonomy();
  assert.equal(pending.length, 2);
  assert.deepEqual(first.stores[0].current, fetched, "重新取得期間保留原內容");
  const updated = { ...fetched, facility_types: [{ value: "healthcare", label: "看診", categories: [{ code: "x", label: "新分類名稱" }] }] };
  pending[1](updated);
  await tick(); await tick();
  assert.deepEqual(first.stores[0].current, updated);
  pending[0](fetched);
  await tick(); await tick();
  assert.deepEqual(first.stores[0].current, updated, "較慢的舊請求不能把名稱改回去");

  globalThis.fetch = async () => new Response("", { status: 503 });
  refreshServiceTaxonomy();
  await tick(); await tick();
  assert.deepEqual(first.stores[0].current, updated, "刷新失敗保留已取得的分類，不換成預設字彙");
});
