import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { route } from "./router.ts";

Deno.test("route matches jobs collection and item", () => {
  assertEquals(route("GET", "/jobs"), { kind: "listJobs" });
  assertEquals(route("GET", "/jobs/abc"), { kind: "jobStatus", id: "abc" });
  assertEquals(route("DELETE", "/jobs/abc"), { kind: "cancelJob", id: "abc" });
  assertEquals(route("POST", "/jobs"), { kind: "execute" });
  assertEquals(route("GET", "/envs"), { kind: "listEnvs" });
  assertEquals(route("POST", "/envs"), { kind: "setupEnv" });
  assertEquals(route("GET", "/nope"), { kind: "notFound" });
  assertEquals(route("DELETE", "/envs/study1"), { kind: "deleteEnv", name: "study1" });
  assertEquals(route("DELETE", "/envs/o%27brien"), { kind: "deleteEnv", name: "o'brien" });
});
