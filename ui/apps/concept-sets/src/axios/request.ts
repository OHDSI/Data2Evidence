import axios, { AxiosRequestConfig } from "axios";

let globalGetToken: (() => Promise<string>) | null = null;

export const setTokenGetter = (getToken: () => Promise<string>) => {
  globalGetToken = getToken;
};

const client = axios.create();

client.interceptors.request.use(
  async (config) => {
    if (globalGetToken) {
      const token = await globalGetToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Retry logic for ERR_NETWORK_CHANGED errors (Docker container restarts during e2e tests)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const isNetworkChanged =
      error.code === "ERR_NETWORK" ||
      error.message?.includes("ERR_NETWORK_CHANGED");

    if (isNetworkChanged) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(
          `[Concept Sets API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return client.request(config);
      }
    }

    return Promise.reject(error);
  },
);

// --- Request dedup + cache ---
// Deduplicates in-flight requests and caches results with a TTL.
// Applies to all GETs and read-like POSTs (e.g. vocabulary search).
// AbortSignal cancellation only rejects the caller's promise, not the shared request.

const CACHE_TTL_MS = 5000;

// POST endpoints that are read-only queries and safe to dedup/cache
const DEDUP_POST_PATTERNS = [
  /\/vocabulary\/[^/]+\/search/, // vocabulary search
  /\/cdmresults\/[^/]+\/conceptRecordCount/, // concept record counts
];

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const resultCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<any>>();

function getCacheKey(options: AxiosRequestConfig): string {
  const { method, baseURL, url, params, data } = options;
  return JSON.stringify({ method, baseURL, url, params, data });
}

function isDedupEligible(options: AxiosRequestConfig): boolean {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") return true;
  if (method === "POST") {
    const url = options.url || "";
    return DEDUP_POST_PATTERNS.some((pattern) => pattern.test(url));
  }
  return false;
}

// --- Core request function (no caching) ---

const requestNoCache = async <T = any>(
  options: AxiosRequestConfig,
): Promise<T> => {
  const onSuccess = function (response: any) {
    console.debug("Request Successful!", response);
    return response.data;
  };

  const onError = function (error: any) {
    // Skip canceled request errors
    if (axios.isCancel(error) || error?.message === "canceled") {
      return Promise.reject(error);
    }
    console.error("Request Failed:", error.config);

    if (error.response) {
      // Server response error
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else {
      // Request setup error
      console.error("Error Message:", error.message);
    }

    return Promise.reject(error.response || error.message);
  };

  try {
    const response = await client(options);
    return onSuccess(response);
  } catch (error) {
    return onError(error);
  }
};

function requestWithDedup<T = any>(options: AxiosRequestConfig): Promise<T> {
  const key = getCacheKey(options);

  // Check result cache (TTL-based)
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate: if an identical request is in-flight, piggyback on it
  const inflight = inflightRequests.get(key);
  if (inflight) {
    return wrapWithSignal(inflight, options.signal);
  }

  // Make the actual request (without the caller's signal — we manage cancellation separately)
  const { signal: _callerSignal, ...optionsWithoutSignal } = options;
  const shared = requestNoCache<T>(optionsWithoutSignal)
    .then((data) => {
      resultCache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, shared);
  return wrapWithSignal(shared, options.signal);
}

// Wraps a shared promise so that the caller's AbortSignal can reject it
// without cancelling the underlying request for other consumers.
function wrapWithSignal<T>(
  shared: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return shared;
  if (signal.aborted) return Promise.reject({ message: "canceled" });

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject({ message: "canceled" });
    signal.addEventListener("abort", onAbort, { once: true });
    shared.then(
      (data) => {
        signal.removeEventListener("abort", onAbort);
        resolve(data);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

export const request = <T = any>(options: AxiosRequestConfig): Promise<T> => {
  if (isDedupEligible(options)) {
    return requestWithDedup<T>(options);
  }
  return requestNoCache<T>(options);
};
