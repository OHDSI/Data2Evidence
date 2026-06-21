import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encryptSecret, decryptSecret } from "./crypto.ts";

Deno.test("encrypt then decrypt round-trips", async () => {
  const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const ct = await encryptSecret("hunter2", key);
  assertEquals(typeof ct, "string");
  assertEquals(await decryptSecret(ct, key), "hunter2");
});
