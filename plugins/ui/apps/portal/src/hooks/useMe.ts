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

const loadUsername = (): Promise<string> => {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.userMgmt
      .getMe()
      .then(({ username }) => {
        cache = username;
        return username;
      })
      .finally(() => {
        // Cleared either way, so a failed call is retried by the next mount
        // rather than latched as a rejection every later mount re-throws.
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
