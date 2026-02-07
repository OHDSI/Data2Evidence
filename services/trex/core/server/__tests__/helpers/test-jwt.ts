/**
 * RSA key pair generation, JWKS endpoint mock, and test token factory.
 *
 * Usage:
 *   const { createTestToken, installJwksMock, cleanupJwksMock } = await setupTestJwt();
 *   // createTestToken({ sub: "user-1", ... }) => signed JWT string
 */

import { generateKeyPair, exportJWK, SignJWT } from "npm:jose";

export const TEST_ISSUER = "https://test-logto.example.com/oidc";
export const TEST_AUDIENCE = "https://test-api.example.com";

let _keys: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;
let _jwk: any = null;

async function getKeys() {
  if (!_keys) {
    _keys = await generateKeyPair("RS256");
    const pub = await exportJWK(_keys.publicKey);
    _jwk = { ...pub, alg: "RS256", use: "sig", kid: "test-kid-1" };
  }
  return { ..._keys, jwk: _jwk };
}

export async function setupTestJwt() {
  const { publicKey, privateKey, jwk } = await getKeys();

  const originalFetch = globalThis.fetch;

  function installJwksMock() {
    (globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/jwks")) {
        return new Response(JSON.stringify({ keys: [jwk] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };
  }

  function cleanupJwksMock() {
    globalThis.fetch = originalFetch;
  }

  async function createTestToken(
    claims: Record<string, any> = {},
    expiresIn = "1h"
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({
      sub: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-kid-1" })
      .setIssuer(TEST_ISSUER)
      .setAudience(TEST_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(expiresIn);

    return await jwt.sign(privateKey);
  }

  return { createTestToken, installJwksMock, cleanupJwksMock, publicKey, privateKey };
}
