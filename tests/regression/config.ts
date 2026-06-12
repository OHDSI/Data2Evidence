export const config = {
  repetitions: Number(process.env.PERF_REPETITIONS ?? 3),

  // Fraction above baseline p95 that triggers a warning (default 10%)
  warnThreshold: Number(process.env.PERF_WARN_THRESHOLD ?? 0.1),

  // Fraction above baseline p95 that fails the test (default 20%)
  failThreshold: Number(process.env.PERF_FAIL_THRESHOLD ?? 0.2),

  bearerToken: process.env.BEARER_TOKEN ?? "",
} as const;
