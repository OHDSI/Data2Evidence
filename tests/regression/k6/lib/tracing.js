import { instrumentHTTP } from "k6/experimental/tracing";

/**
 * Call once at the top of a scenario file to enable automatic traceparent
 * header injection on every k6 HTTP request. Traces will be correlated in
 * Jaeger under the analytics-svc service.
 *
 * The sampler is set to always-on so every request during the regression run
 * produces a trace.
 */
export function enableTracing() {
  instrumentHTTP({
    propagator: "w3c",
    sampler: { type: "const", param: 1 },
  });
}
