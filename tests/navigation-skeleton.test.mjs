import assert from "node:assert/strict";
import { globSync } from "node:fs";
import test from "node:test";
import { navigationSkeletonVariant, SLOW_ROUTE_VARIANTS } from "../src/lib/navigation/slow-routes.ts";

test("每個會等後端的伺服器 load 頁面都有換頁骨架樣式", () => {
  const routes = globSync("src/routes/**/+page.server.ts").map((f) => {
    const id = f.slice("src/routes".length).replace(/\/\+page\.server\.ts$/, "");
    return id || "/";
  });
  assert.ok(routes.length > 0);
  for (const id of routes) assert.ok(SLOW_ROUTE_VARIANTS[id], `${id} 缺少換頁骨架樣式`);
});

test("換到其他路徑才顯示，未列出的頁面用一般骨架", () => {
  const at = (path, id = null) => ({ url: new URL(`https://x.test${path}`), route: { id } });
  assert.equal(navigationSkeletonVariant(at("/clinic/a", "/clinic/[id]"), at("/")), "clinic");
  assert.equal(navigationSkeletonVariant(at("/area/臺北市", "/area/[city]"), at("/area")), "landing");
  assert.equal(navigationSkeletonVariant(at("/member", "/member"), at("/")), "list");
  assert.equal(navigationSkeletonVariant(at("/search?q=1", "/search"), at("/search")), undefined);
  assert.equal(navigationSkeletonVariant(null, at("/")), undefined);
});
