import pako from "pako";

/**
 * Compress an object to a pako-deflated base64url string.
 * Compatible with vue-mri CohortUrlCodec.
 */
export function compress(obj: unknown): string {
  const jsonString = JSON.stringify(obj);
  const deflated = pako.deflate(new TextEncoder().encode(jsonString));
  const binaryString = Array.from(deflated, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binaryString);
  // Convert to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decompress a pako-deflated base64url string back to an object.
 * Compatible with vue-mri CohortUrlCodec.
 */
export function decompress<T = unknown>(str: string): T {
  // Convert from base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binaryString = atob(base64);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const inflated = pako.inflate(bytes);
  const jsonString = new TextDecoder().decode(inflated);
  return JSON.parse(jsonString) as T;
}
