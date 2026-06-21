// @ts-nocheck - Deno edge function (trex EdgeRuntime)
// Single-row (id=1) read/write of network.site_credential via the _config attach.
import { query, lit } from "./sql.ts";
import { encryptSecret, decryptSecret } from "./crypto.ts";

const ENC_KEY = (Deno.env.get("NETWORK_ENC_KEY") ?? "").trim();

export interface StoredCred {
  siteId: string | null;
  claimToken: string | null;
  cognitoClientId: string | null;
  status: string;            // 'pending' | 'active'
}

export async function readRow(): Promise<StoredCred | null> {
  const { rows } = await query(
    `SELECT site_id, claim_token, cognito_client_id, status FROM _config.network.site_credential WHERE id = 1`,
  );
  if (!rows.length) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    siteId: (r.site_id as string) ?? null,
    claimToken: (r.claim_token as string) ?? null,
    cognitoClientId: (r.cognito_client_id as string) ?? null,
    status: (r.status as string) ?? "pending",
  };
}

export async function savePending(siteId: string, claimToken: string): Promise<void> {
  await query(
    `INSERT INTO _config.network.site_credential (id, site_id, claim_token, status, updated_at)
     VALUES (1, ${lit(siteId)}, ${lit(claimToken)}, 'pending', now())
     ON CONFLICT (id) DO UPDATE SET site_id = EXCLUDED.site_id,
       claim_token = EXCLUDED.claim_token, status = 'pending', updated_at = now()`,
  );
}

export async function saveActive(cognitoClientId: string, clientSecret: string): Promise<void> {
  const enc = await encryptSecret(clientSecret, ENC_KEY);
  await query(
    `UPDATE _config.network.site_credential
     SET cognito_client_id = ${lit(cognitoClientId)}, client_secret_enc = ${lit(enc)},
         status = 'active', updated_at = now() WHERE id = 1`,
  );
}

// Returns decrypted machine creds if an active row exists, else null.
export async function readMachineCreds(): Promise<{ clientId: string; clientSecret: string } | null> {
  const { rows } = await query(
    `SELECT cognito_client_id, client_secret_enc, status FROM _config.network.site_credential WHERE id = 1`,
  );
  if (!rows.length) return null;
  const r = rows[0] as Record<string, unknown>;
  if (r.status !== "active" || !r.cognito_client_id || !r.client_secret_enc) return null;
  const clientSecret = await decryptSecret(String(r.client_secret_enc), ENC_KEY);
  return { clientId: String(r.cognito_client_id), clientSecret };
}
