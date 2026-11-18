import assert from "node:assert/strict";
import test from "node:test";
import { edgeCached, FRESH_MS, isEdgeCacheable } from "../src/lib/edge-cache.ts";

const get = (headers = {}) => new Request("https://x.test/a", { headers });

test("只快取未登入的公開唯讀端點", () => {
  for (const p of ["/api/v1/booking/clinics", "/api/v1/booking/clinics/popular", "/api/v1/booking/clinics/abc", "/api/v1/booking/clinics/abc/photos", "/api/v1/service-categories"]) {
    assert.equal(isEdgeCacheable(get(), p), true, p);
  }
  for (const p of ["/api/v1/booking/clinics/abc/slots", "/api/v1/booking/clinics/abc/config", "/api/v1/booking/clinics/abc/appointments", "/api/v1/member/me"]) {
    assert.equal(isEdgeCacheable(get(), p), false, p);
  }
  assert.equal(isEdgeCacheable(get({ authorization: "Bearer t" }), "/api/v1/booking/clinics"), false);
  assert.equal(isEdgeCacheable(new Request("https://x.test/a", { method: "POST" }), "/api/v1/booking/clinics"), false);
});

test("未命中存入、新鮮命中不打後端、過期先回舊資料並背景更新、非 200 不存", async () => {
  const store = new Map();
  const cache = { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => void store.set(k.url, r) };
  const pending = [];
  const wait = (p) => pending.push(p);
  let calls = 0;
  const backend = (body, status = 200) => async () => (calls++, new Response(body, { status, headers: { "cache-control": "no-cache" } }));
  const url = "https://cross.test/api/v1/booking/clinics";

  let res = await edgeCached(url, cache, wait, backend("v1"), 0);
  await Promise.all(pending);
  assert.equal(res.headers.get("x-edge-cache"), "MISS");
  assert.equal(await res.text(), "v1");

  res = await edgeCached(url, cache, wait, backend("v2"), FRESH_MS);
  assert.equal(res.headers.get("x-edge-cache"), "HIT");
  assert.equal(res.headers.get("cache-control"), "no-cache");
  assert.equal(await res.text(), "v1");
  assert.equal(calls, 1);

  res = await edgeCached(url, cache, wait, backend("v2"), FRESH_MS + 1);
  assert.equal(res.headers.get("x-edge-cache"), "STALE");
  assert.equal(await res.text(), "v1");
  await Promise.all(pending);
  await Promise.all(pending);
  assert.equal(await (await edgeCached(url, cache, wait, backend("v3"), FRESH_MS + 2)).text(), "v2");

  const other = "https://cross.test/api/v1/booking/clinics/x";
  await edgeCached(other, cache, wait, backend("err", 503), 0);
  await Promise.all(pending);
  assert.equal(store.has(other), false);
});
