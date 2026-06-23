export const config = {
  repetitions: Number(process.env.PERF_REPETITIONS ?? 10),

  // Fraction above baseline p95 that triggers a warning (default 10%)
  warnThreshold: Number(process.env.PERF_WARN_THRESHOLD ?? 0.1),

  // Fraction above baseline p95 that fails the test (default 20%)
  failThreshold: Number(process.env.PERF_FAIL_THRESHOLD ?? 0.2),

  bearerToken: process.env.BEARER_TOKEN ?? "",

  // Replaces the host+port of every scenario URL.
  // Set D2E_BASE_URL=localhost:41100 to point at a local instance.
  D2E_BASE_URL: process.env.D2E_BASE_URL ?? "localhost:41100",

  // Substituted into any query param or JSON body field named "datasetId".
  DATASET_ID: process.env.DATASET_ID ?? "",

  // PA_CONFIG_ID: process.env.PA_CONFIG_ID ?? "4321DCBAB",
  PA_CONFIG_ID: process.env.PA_CONFIG_ID ?? "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",

  warmupRequests: Number(process.env.PERF_WARMUP_REQUESTS ?? 2),
} as const;
