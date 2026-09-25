import { assertRejects } from "jsr:@std/assert";

// WHY THIS EXISTS. getBackendConfig and getConfig both guard a missing configId,
// and both used to raise it with `throw` from inside a `new Promise(async ...)`
// executor. That does not reject the promise the caller awaits -- it rejects the
// executor's own, which nobody holds -- so ConfigFacade's
//
//     try { await this.config.getBackendConfig(...) } catch (err) { callback(err, null) }
//
// never caught anything, the await never settled, and the escaped rejection
// reached the runtime instead:
//
//     event_type: "UncaughtException"
//     exception: "event loop error: Error: CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED"
//
// One request without a configId took the deno worker down with it, and the
// requests in flight beside it died as 500s. In CI that surfaced as
// analytics-svc answering 500 for /values and /population/json/barchart in the
// same second, which the PA UI renders as "No suggestions available" and an
// empty patient count -- nothing that names a config at all.

// src/configs.ts validates the service environment at module load, so the
// import is dynamic and comes after these are set. The values are never
// connected to: the guard under test returns before any I/O.
for (
  const [k, v] of Object.entries({
    LOCAL_DEBUG: "false",
    PG__HOST: "localhost",
    PG__DB_NAME: "unused",
    PG_USER: "unused",
    PG_PASSWORD: "unused",
    PG__DIALECT: "postgres",
    PG__SSL: "false",
    PG__PORT: "5432",
    PG__MIN_POOL: "0",
    PG__MAX_POOL: "1",
    PG__IDLE_TIMEOUT_IN_MS: "1000",
  })
) {
  if (!Deno.env.get(k)) Deno.env.set(k, v);
}

const { MRIConfig } = await import("../../src/config/config.ts");

// The guard runs before anything touches these, so they stay inert: a change
// that reached them would fail loudly rather than quietly pass.
const inert = null as never;
const newConfig = () => new MRIConfig(inert, inert, inert, inert);

for (const missing of [undefined, null, ""]) {
  const shown = JSON.stringify(missing) ?? "undefined";

  Deno.test(`getBackendConfig rejects rather than escaping when configId is ${shown}`, async () => {
    await assertRejects(
      () => newConfig().getBackendConfig({ configId: missing as never, configVersion: "A", lang: "en" }),
      Error,
      "CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED",
    );
  });

  Deno.test(`getConfig rejects rather than escaping when configId is ${shown}`, async () => {
    await assertRejects(
      () => newConfig().getConfig({ configId: missing as never, configVersion: "A", lang: "en" }),
      Error,
      "CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED",
    );
  });
}
