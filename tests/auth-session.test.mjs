import assert from "node:assert/strict";
import test from "node:test";
import { api, ApiError } from "../src/lib/api/client.ts";
import { AUTH_EVENTS } from "../src/lib/auth/auth-events.ts";
import { sessionExpiredLoginPath, shouldClearSession } from "../src/lib/auth/session.ts";

test("登入過期：後台回院所登入，民眾頁回會員登入並帶回原頁", () => {
  assert.equal(sessionExpiredLoginPath("/admin/clinics/abc"), "/admin/login");
  assert.equal(sessionExpiredLoginPath("/member/appointments/1", "?a=1"), "/auth?next=%2Fmember%2Fappointments%2F1%3Fa%3D1");
  assert.equal(sessionExpiredLoginPath("/auth", "?next=%2Fmember"), "/auth");
});

test("只有 401 才清除登入憑證，斷線與 5xx 保留", () => {
  assert.equal(shouldClearSession(new ApiError(401, "Unauthorized")), true);
  assert.equal(shouldClearSession(new ApiError(0, "Network Error")), false);
  assert.equal(shouldClearSession(new ApiError(503, "Service Unavailable")), false);
  assert.equal(shouldClearSession(new TypeError("fetch failed")), false);
});

test("會員登入失敗的 401 不觸發登入過期事件", async (t) => {
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", { value: target, configurable: true, writable: true });
  Object.defineProperty(globalThis, "localStorage", { value: { getItem: () => null, setItem() {}, removeItem() {} }, configurable: true, writable: true });
  t.after(() => { delete globalThis.window; delete globalThis.localStorage; });
  let expired = 0;
  target.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, () => expired++);
  const unauthorized = async () => new Response(JSON.stringify({ detail: "bad token" }), { status: 401, headers: { "content-type": "application/json" } });

  await assert.rejects(api.post("/api/v1/member/google", { id_token: "x" }, { fetch: unauthorized }), (e) => e.status === 401);
  assert.equal(expired, 0);
  // 對照：一般端點的 401 仍會觸發
  await assert.rejects(api.get("/api/v1/member/appointments", { fetch: unauthorized }), (e) => e.status === 401);
  assert.equal(expired, 1);
});
