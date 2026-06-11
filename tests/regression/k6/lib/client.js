import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || __ENV.K6_BASE_URL || "";

/**
 * Returns shared request params that inject the auth Bearer token and
 * standard headers expected by the d2e backend.
 */
function defaultParams(bearerToken, extra) {
  return Object.assign(
    {
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${bearerToken}`,
        "content-type": "application/json",
        origin: BASE_URL,
      },
    },
    extra
  );
}

/**
 * Authenticated GET.
 * @param {string} path   - URL path, e.g. "/analytics-svc/api/..."
 * @param {string} token  - Bearer token from logtoAuth()
 * @param {object} extra  - additional k6 request params (optional)
 */
export function get(path, token, extra) {
  return http.get(`${BASE_URL}${path}`, defaultParams(token, extra));
}

/**
 * Authenticated POST with a JSON body.
 */
export function post(path, body, token, extra) {
  return http.post(
    `${BASE_URL}${path}`,
    JSON.stringify(body),
    defaultParams(token, extra)
  );
}
