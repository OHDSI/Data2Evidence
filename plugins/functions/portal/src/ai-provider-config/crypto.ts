import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { env } from "../env.ts";

export const AI_PROVIDER_CONFIG_ENCRYPTION_KEY_ENV =
  "AI_PROVIDER_CONFIG_ENCRYPTION_KEY";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Parses a base64 AES-256 key. Returns null when it is missing, empty, not valid
 * base64, or does not decode to exactly 32 bytes. Never throws, never logs the key.
 */
export function parseEncryptionKey(raw: string | undefined | null): Buffer | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const trimmed = raw.trim();
  // Buffer.from silently ignores invalid characters, so check the alphabet and
  // canonical form first.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return null;
  const key = Buffer.from(trimmed, "base64");
  if (key.length !== KEY_BYTES) return null;
  if (key.toString("base64") !== trimmed) return null;
  return key;
}

/**
 * Reads and validates the key from the typed `env` object, which snapshots the
 * environment at module load (so a changed env var needs a restart).
 */
export function getEncryptionKeyFromEnv(): Buffer | null {
  return parseEncryptionKey(env.AI_PROVIDER_CONFIG_ENCRYPTION_KEY);
}

export function isEncryptionKeyConfigured(): boolean {
  return getEncryptionKeyFromEnv() !== null;
}

function assertKeyLength(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`AES-256 key must be exactly ${KEY_BYTES} bytes`);
  }
}

/** Returns base64(iv || ciphertext || tag). */
export function encryptApiKey(plaintext: string, key: Buffer): string {
  assertKeyLength(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString("base64");
}

/** Returns the plaintext, or null if the value is malformed or the key is wrong. */
export function decryptApiKey(stored: string, key: Buffer): string | null {
  // Caller misuse must not be swallowed as "unreadable", so check outside the try.
  assertKeyLength(key);
  try {
    const data = Buffer.from(stored, "base64");
    if (data.length < IV_BYTES + TAG_BYTES) return null;
    const iv = data.subarray(0, IV_BYTES);
    const tag = data.subarray(data.length - TAG_BYTES);
    const ciphertext = data.subarray(IV_BYTES, data.length - TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}
