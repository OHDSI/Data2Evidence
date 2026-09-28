import { useCallback, useEffect, useState } from "react";
import { api } from "../axios/api";
import { AppError, IFeature } from "../types";

// The feature list is read by seven components, several of which mount once per
// plugin and again on every route change, and each mount issued its own request.
// One e2e run made 2,136 calls to feature/list. That was survivable only while
// trex could not parse the forwarded client address; once that was fixed its
// per-IP rate limiting began keying correctly, and a suite running from a single
// address exhausted the shared 5000-req/15min bucket -- which then answered 429
// on unrelated endpoints, including the one Setup -> Feature flags needs.
//
// The flags change only when an admin edits them, so they are fetched once and
// shared. `inflight` collapses the concurrent first mounts into one request,
// which is where most of the volume came from.
let cache: IFeature[] | null = null;
let inflight: Promise<IFeature[]> | null = null;

/** Call after a mutation, so the next read sees the new values. */
export const invalidateFeatures = (): void => {
  cache = null;
  inflight = null;
};

const loadFeatures = (): Promise<IFeature[]> => {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.systemPortal
      .getFeatures()
      .then((features: IFeature[]) => {
        cache = features;
        return features;
      })
      .finally(() => {
        // Cleared either way. A failure must not be latched as a rejected
        // promise that every later mount re-throws without ever retrying.
        inflight = null;
      });
  }
  return inflight;
};

export const useFeatures = (): [IFeature[], boolean, AppError | undefined] => {
  const [features, setFeatures] = useState<IFeature[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<AppError>();

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setFeatures(await loadFeatures());
    } catch (error: any) {
      if ("message" in error) {
        setError({ message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return [features, loading, error];
};
