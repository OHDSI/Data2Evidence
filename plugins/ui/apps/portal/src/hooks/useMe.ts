import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";

// WHY NOT THE ID TOKEN. The account name that matches saved work is usermgmt's
// `username` column, because that is what the services storing the work write:
// bookmark-svc sets a bookmark's `user_id` from its own GET /me, and
// white-rabbit, files-manager and perseus key their rows the same way.
//
// The portal used to read a token claim instead (`resolveIdTokenName`). Those
// were the same string under Logto, which emitted a `username` claim, and are
// not under trex's Better Auth provider: it emits no `username`, so the lookup
// fell through to `name`, which for a user whose upstream record carried no
// display name holds the synthesised address `<username>@d2e.local`. Comparing
// that to a `user_id` of `brandan` matches nothing, and the PA UI reports a
// user's own cohorts as "No saved cohort definitions" rather than as an error.
//
// Reading the owner key from the system that owns it is what stops the two
// drifting again, whichever provider is in front.
//
// Shared and fetched once, like useFeatures: the name is read on every plugin
// mount and does not change within a session.
let cache: string | null = null;
let inflight: Promise<string> | null = null;

/** Call after a mutation that renames the caller. */
export const invalidateMe = (): void => {
  cache = null;
  inflight = null;
};

/**
 * Attempts before giving up, and the gap between them.
 *
 * A transient failure must not end as a settled answer: the consumers of this
 * name compare it to a stored owner, so "the request failed" and "resolved to
 * nobody" render identically as an empty list of the user's own work. These
 * mounts are long-lived -- the plugin container stays up for the session -- so
 * retrying only on a future mount does not recover the page in front of the
 * user. `loading` stays true across the whole sequence, which is what keeps a
 * consumer from treating an intermediate failure as final.
 */
const ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Whether asking again could plausibly succeed.
 *
 * NEVER ON 429. trex rate-limits per client address and an e2e suite runs from
 * one, so the bucket is shared across the whole run; retrying a throttled
 * request spends more of it and makes the throttling worse for every other
 * call. Measured: this hook's own retries made /me the most-requested endpoint
 * on the page, three calls all answered 429, while
 * system-portal/dataset/list was throttled beside it and the portal rendered
 * "No dataset available".
 *
 * A 4xx generally will not answer differently on the next attempt either. What
 * this retry exists for is the transient the worker restart produces -- a 5xx
 * or a dropped connection -- so that is all it covers.
 */
const isWorthRetrying = (error: any): boolean => {
  // BOTH SHAPES, because axios/request.ts does not reject with the axios error:
  //
  //     return Promise.reject(error.response || error.message);
  //
  // so what arrives here is the RESPONSE (status at the top level), and only a
  // caller bypassing that wrapper would see `error.response.status`. Reading
  // just the nested one returned undefined for every throttled call, which this
  // function then treated as "no response, worth retrying" -- the exact
  // amplification it was added to stop.
  const status = error?.status ?? error?.response?.status;
  if (typeof status !== "number") return true; // network error or abort
  return status >= 500;
};

const loadUsername = (): Promise<string> => {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        if (attempt > 0) await wait(RETRY_BASE_MS * 2 ** (attempt - 1));
        try {
          const { username } = await api.userMgmt.getMe();
          cache = username;
          return username;
        } catch (e) {
          lastError = e;
          if (!isWorthRetrying(e)) break;
        }
      }
      throw lastError;
    })().finally(() => {
      // Cleared either way, so an exhausted sequence is retried by the next
      // mount rather than latched as a rejection every later mount re-throws.
      inflight = null;
    });
  }
  return inflight;
};

/**
 * The caller's account name, and whether it is still being fetched.
 *
 * THE FLAG IS NOT OPTIONAL FOR AN OWNERSHIP TEST. `undefined` here means "not
 * known yet", and a consumer that compares it to a stored owner reads that as
 * "owned by nobody" — which is the same silent empty list this hook exists to
 * remove, just for a few hundred milliseconds instead of forever. A consumer
 * matching saved work must wait for `loading` to clear.
 */
export const useMe = (): [string | undefined, boolean] => {
  const [username, setUsername] = useState<string | undefined>(cache ?? undefined);
  const [loading, setLoading] = useState(cache === null);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      setUsername(await loadUsername());
    } catch (e) {
      // Left undefined rather than substituted: a wrong name would show one
      // user another's saved work, which is worse than showing none.
      console.error("Could not resolve the current username", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return [username, loading];
};
