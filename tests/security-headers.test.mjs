import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SECURITY_HEADERS } from "../src/lib/security-headers.ts";

test("安全標頭禁止被框架嵌入並限制 referrer 與裝置能力", () => {
  assert.equal(SECURITY_HEADERS["x-frame-options"], "DENY");
  assert.match(SECURITY_HEADERS["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(SECURITY_HEADERS["referrer-policy"], "strict-origin-when-cross-origin");
  assert.ok(SECURITY_HEADERS["permissions-policy"]);
});

test("hooks 對所有回應套用安全標頭，不只示範頁", () => {
  const source = readFileSync(new URL("../src/hooks.server.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("SECURITY_HEADERS)) headers.set") < source.indexOf("/demo"));
});
