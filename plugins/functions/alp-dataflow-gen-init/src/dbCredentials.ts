// Condition-based wait for the trex database registry.
//
// This init function seeds Prefect's `database-credentials` secret block from
// `Trex.databaseManager().getDatabaseCredentials()` — the trex core's in-memory
// credential store (op_get_dbc). That store starts EMPTY on every trex process
// start and is populated by trex's d2e-compat boot sequence, which reads the
// trexdb registry and pushes it in via `setCredentials()`. That boot step runs
// concurrently with (and, behind the per-dataset cache attach loop, often after)
// the plugin init functions, so a plain read here is a race:
//
//   - lose the race  -> getDatabaseCredentials() returns [] and we used to write
//                       an EMPTY block, clobbering a previously good one. Every
//                       flow run then failed in _shared_flow_utils/dao/daobase.py
//                       with ValueError("'DATABASE_CREDENTIALS' secret is empty").
//   - win the race   -> the block is correct, which is why local starts (few or
//                       no dataset caches, so the sync lands early) looked fine
//                       while a deployed restart with many caches did not.
//
// So we poll the store until it reports at least one database instead of reading
// it once. The store is read live through the op on every call, so a sync that
// lands mid-wait is observed. Callers must still treat an empty result as
// "unknown, don't write" — see seed.ts.

export interface WaitForDatabaseCredentialsOptions {
  /** Total budget for the wait. Must stay well below the init worker's
   *  workerTimeoutMs (3 min in trex's core/server/plugin/function.ts). */
  timeoutMs?: number;
  /** Delay between reads of the registry. */
  intervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_INTERVAL_MS = 2_000;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Read `get()` until it yields a non-empty list or the timeout elapses.
 * Returns the first non-empty list, or `[]` when the budget runs out — never
 * throws, so a registry read that blows up degrades to "empty" rather than
 * killing the whole seed.
 */
export async function waitForDatabaseCredentials<T>(
  get: () => T[] | Promise<T[]>,
  options: WaitForDatabaseCredentialsOptions = {},
): Promise<T[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const log = options.log ?? (() => {});

  const started = now();
  let attempt = 0;

  while (true) {
    attempt++;
    let credentials: T[] = [];
    try {
      credentials = (await get()) ?? [];
    } catch (e) {
      log(`database registry read failed (attempt ${attempt}): ${e}`);
      credentials = [];
    }

    if (credentials.length > 0) {
      if (attempt > 1) {
        log(
          `database registry ready after ${now() - started}ms: ${credentials.length} database(s)`,
        );
      }
      return credentials;
    }

    // Only sleep when another read still fits in the budget.
    if (now() - started + intervalMs > timeoutMs) {
      log(
        `database registry still empty after ${now() - started}ms (${attempt} attempt(s)); giving up`,
      );
      return [];
    }
    await sleep(intervalMs);
  }
}
