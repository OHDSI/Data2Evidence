import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import {
  AI_PROVIDER_CONFIG_ENCRYPTION_KEY_ENV,
  decryptApiKey,
  encryptApiKey,
  getEncryptionKeyFromEnv,
  isEncryptionKeyConfigured,
  parseEncryptionKey,
} from "./crypto.ts";

const newKeyB64 = () => randomBytes(32).toString("base64");

Deno.test("parseEncryptionKey accepts base64 of exactly 32 bytes", () => {
  const key = parseEncryptionKey(newKeyB64());
  assert(key);
  assertEquals(key.length, 32);
});

Deno.test("parseEncryptionKey rejects missing, empty, short, long and non-base64 keys", () => {
  const bad: Array<string | undefined | null> = [
    undefined,
    null,
    "",
    "   ",
    randomBytes(16).toString("base64"),
    randomBytes(31).toString("base64"),
    randomBytes(33).toString("base64"),
    "not base64 !!!",
    "a".repeat(32), // 32 chars, but decodes to 24 bytes
    newKeyB64().slice(0, -2), // truncated / non-canonical
  ];
  for (const raw of bad) assertEquals(parseEncryptionKey(raw), null, String(raw));
});

Deno.test("parseEncryptionKey trims surrounding whitespace", () => {
  const b64 = newKeyB64();
  const key = parseEncryptionKey(" " + b64 + "\n");
  assert(key);
  assertEquals(key.toString("base64"), b64);
});

Deno.test("parseEncryptionKey rejects a non-canonical encoding of 32 bytes", () => {
  const canonical = randomBytes(32).toString("base64"); // 43 data chars + "="
  assertEquals(canonical.endsWith("="), true);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  // The last data char carries 4 bits + 2 padding bits; set a padding bit.
  const last = canonical.slice(-2, -1);
  const bumped = alphabet[alphabet.indexOf(last) | 1 ? alphabet.indexOf(last) | 1 : 0];
  const nonCanonical = canonical.slice(0, -2) + bumped + "=";
  // Make sure we really changed the padding bits and still decode to 32 bytes.
  const flipped = alphabet[alphabet.indexOf(last) ^ 1];
  const candidate = canonical.slice(0, -2) + flipped + "=";
  assertEquals(Buffer.from(candidate, "base64").length, 32);
  assertNotEquals(Buffer.from(candidate, "base64").toString("base64"), candidate);
  assertEquals(parseEncryptionKey(candidate), null);
  void nonCanonical;
});

Deno.test("getEncryptionKeyFromEnv / isEncryptionKeyConfigured agree with the env snapshot", () => {
  // env is snapshotted at module load, so assert consistency rather than mutate it.
  assertEquals(
    isEncryptionKeyConfigured(),
    getEncryptionKeyFromEnv() !== null,
  );
  assertEquals(
    getEncryptionKeyFromEnv(),
    parseEncryptionKey(Deno.env.get(AI_PROVIDER_CONFIG_ENCRYPTION_KEY_ENV)),
  );
});

Deno.test("encrypt and decrypt throw on a wrong-length key", () => {
  const good = parseEncryptionKey(newKeyB64())!;
  const stored = encryptApiKey("secret", good);
  const bad = randomBytes(16);
  assertThrows(() => encryptApiKey("secret", bad), Error, "32 bytes");
  assertThrows(() => decryptApiKey(stored, bad), Error, "32 bytes");
});

Deno.test("encrypt/decrypt round trip; stored form is not plaintext", () => {
  const key = parseEncryptionKey(newKeyB64())!;
  const secret = "sk-ant-secret-123";
  const stored = encryptApiKey(secret, key);
  assertNotEquals(stored, secret);
  assert(!Buffer.from(stored, "base64").toString("utf8").includes(secret));
  assert(!stored.includes(secret));
  assertEquals(decryptApiKey(stored, key), secret);
  // 12-byte iv + ciphertext + 16-byte tag
  assertEquals(Buffer.from(stored, "base64").length, 12 + secret.length + 16);
});

Deno.test("each encryption uses a fresh iv", () => {
  const key = parseEncryptionKey(newKeyB64())!;
  assertNotEquals(encryptApiKey("same", key), encryptApiKey("same", key));
});

Deno.test("decrypt fails with the wrong key, tampering or garbage", () => {
  const key = parseEncryptionKey(newKeyB64())!;
  const other = parseEncryptionKey(newKeyB64())!;
  const stored = encryptApiKey("secret", key);
  assertEquals(decryptApiKey(stored, other), null);

  const raw = Buffer.from(stored, "base64");
  raw[raw.length - 1] ^= 1;
  assertEquals(decryptApiKey(raw.toString("base64"), key), null);

  assertEquals(decryptApiKey("", key), null);
  assertEquals(decryptApiKey("AAAA", key), null);
  assertEquals(decryptApiKey("%%%", key), null);
});
