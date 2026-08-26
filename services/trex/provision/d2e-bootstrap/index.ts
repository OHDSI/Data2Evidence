// d2e's boot-time database provisioning, run by trex's `trex.provision` plugin
// kind before any other plugin loads. Replaces the retired
// `alp-minerva-pg-mgmt-init` container: every statement is idempotent, so this
// re-runs harmlessly on every boot and against databases that container already
// provisioned.
//
// trex owns the superuser connection and treats a throw here as fatal; this
// module owns the policy — which roles, which schemas, which grants.

import { parseBootstrapConfigFromEnv, runBootstrapStatements } from "./bootstrap.ts";

interface ProvisionContext {
  exec: (sql: string) => Promise<unknown>;
  env: Record<string, string | undefined>;
}

export default async function provision({ exec, env }: ProvisionContext): Promise<number> {
  const cfg = parseBootstrapConfigFromEnv(env);
  if (!cfg) {
    console.log("[d2e-bootstrap] skipped — POSTGRES_MANAGE_CONFIG/USERS not set");
    return 0;
  }
  return await runBootstrapStatements(exec, cfg);
}
