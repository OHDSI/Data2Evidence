import { assertEquals, assertRejects } from "jsr:@std/assert";
import { TrexIdpAPI } from "../src/api/TrexIdpAPI.ts";

const stubFetch = (calls: Array<{ url: string; body: unknown }>, status = 204) =>
  ((url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return Promise.resolve(new Response(null, { status }));
  }) as unknown as typeof fetch;

Deno.test("assign posts one request per role name", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const api = new TrexIdpAPI("http://trex/admin/roles", "key", stubFetch(calls));
  await api.assignRolesToUser("user-1", ["RESEARCHER.Demo", "cohort reader"]);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].url, "http://trex/admin/roles/assign");
  assertEquals(calls[0].body, { userId: "user-1", role: "RESEARCHER.Demo" });
  assertEquals(calls[1].body, { userId: "user-1", role: "cohort reader" });
});

Deno.test("remove posts to the remove endpoint", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const api = new TrexIdpAPI("http://trex/admin/roles", "key", stubFetch(calls));
  await api.removeRolesFromUser("user-1", ["USER_ADMIN"]);
  assertEquals(calls[0].url, "http://trex/admin/roles/remove");
});

Deno.test("an empty list makes no request at all", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const api = new TrexIdpAPI("http://trex/admin/roles", "key", stubFetch(calls));
  await api.assignRolesToUser("user-1", []);
  assertEquals(calls.length, 0);
});

Deno.test("a failed call raises rather than reporting success", async () => {
  // The caller records a sync outcome; swallowing this would record a role as
  // stored when it is not.
  const api = new TrexIdpAPI("http://trex/admin/roles", "key", stubFetch([], 500));
  await assertRejects(() => api.assignRolesToUser("user-1", ["USER_ADMIN"]));
});
