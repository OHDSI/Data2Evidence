import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { stripPrefix } from "./index.ts";

Deno.test("stripPrefix strips the doubled mount prefix", () => {
  assertEquals(stripPrefix("/plugins/network-api/network-api/studies"), "/studies");
  assertEquals(stripPrefix("/plugins/network-api/network-api/signup/state"), "/signup/state");
});

Deno.test("stripPrefix strips a bare prefix", () => {
  assertEquals(stripPrefix("/network-api/studies"), "/studies");
});
