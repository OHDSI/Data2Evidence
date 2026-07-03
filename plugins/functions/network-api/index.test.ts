import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { coordinatorActionAllowed, isCoordinatorAction, stripPrefix } from "./index.ts";

Deno.test("stripPrefix strips the doubled mount prefix", () => {
  assertEquals(stripPrefix("/plugins/network-api/network-api/studies"), "/studies");
  assertEquals(stripPrefix("/plugins/network-api/network-api/signup/state"), "/signup/state");
});

Deno.test("stripPrefix strips a bare prefix", () => {
  assertEquals(stripPrefix("/network-api/studies"), "/studies");
});

Deno.test("isCoordinatorAction matches the two requireCoordinator routes", () => {
  assertEquals(isCoordinatorAction("POST", "/studies"), true);
  assertEquals(isCoordinatorAction("POST", "/studies/abc/publish"), true);
});

Deno.test("isCoordinatorAction rejects non-coordinator paths and methods", () => {
  // Non-coordinator central routes.
  assertEquals(isCoordinatorAction("GET", "/signup/state"), false);
  assertEquals(isCoordinatorAction("GET", "/studies"), false);
  assertEquals(isCoordinatorAction("GET", "/studies/abc/package"), false);
  assertEquals(isCoordinatorAction("GET", "/studies/abc/publish"), false);
  // publish only matches with a study id segment.
  assertEquals(isCoordinatorAction("POST", "/studies//publish"), false);
  assertEquals(isCoordinatorAction("POST", "/studies/abc/def/publish"), false);
});

Deno.test("coordinatorActionAllowed requires BOTH support and creds (fail-closed)", () => {
  // The whole point of the fix: creds present but central unsupported => gated.
  assertEquals(coordinatorActionAllowed(false, true), false);
  assertEquals(coordinatorActionAllowed(false, false), false);
  assertEquals(coordinatorActionAllowed(true, false), false);
  // Only both true opens the gate.
  assertEquals(coordinatorActionAllowed(true, true), true);
});
