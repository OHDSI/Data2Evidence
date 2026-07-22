// AES-256-GCM. METADATA_ENC_KEY is base64(32 bytes). Stored ciphertext is
// base64(iv[12] ++ ciphertext++tag), so it round-trips through a text column too.
function keyBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function importKey(b64: string): Promise<CryptoKey> {
  // The `as BufferSource` cast sidesteps a lib-typing mismatch in newer TS libs
  // (Uint8Array<ArrayBufferLike> vs BufferSource); runtime behaviour is unchanged.
  return crypto.subtle.importKey("raw", keyBytes(b64) as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
export async function encryptSecret(plain: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(keyB64);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0); out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}
export async function decryptSecret(b64: string, keyB64: string): Promise<string> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12), ct = raw.slice(12);
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
