/**
 * Example scenario skeleton — copy and rename for each new API flow.
 * Replace the placeholder request with the real endpoint.
 */
import { enableTracing } from "../lib/tracing.js";
import { get } from "../lib/client.js";
import { logtoAuth } from "../auth/logto.js";
import { handleSummary } from "../summary.js";
import { check } from "k6";

enableTracing();

export const options = {
  vus: 1,
  iterations: 10,
  insecureSkipTLSVerify: true,
};

export function setup() {
  return logtoAuth();
}

export default function (data) {
  const res = get("/analytics-svc/api/services/health", data.bearerToken);
  check(res, { "status 200": (r) => r.status === 200 });
}

export { handleSummary };
