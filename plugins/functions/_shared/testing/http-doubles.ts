export interface MockRequestInit {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export function createMockRequest(init: MockRequestInit = {}) {
  return {
    params: init.params ?? {},
    query: init.query ?? {},
    body: init.body ?? {},
    headers: init.headers ?? {},
  } as never;
}

export interface CapturedResponse {
  statusCode: number | null;
  body: unknown;
  jsonCalled: boolean;
  sendCalled: boolean;
}

/**
 * Minimal Express response double. Supports the `res.status(n).json(x)` and
 * `res.status(n).send(x)` chains used throughout these plugins.
 *
 * `statusCode` stays null when a handler replies without calling `.status()`,
 * which lets a test distinguish "explicitly 200" from "never answered".
 */
export function createMockResponse() {
  const captured: CapturedResponse = {
    statusCode: null,
    body: undefined,
    jsonCalled: false,
    sendCalled: false,
  };

  const res = {
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      captured.body = payload;
      captured.jsonCalled = true;
      return res;
    },
    send(payload: unknown) {
      captured.body = payload;
      captured.sendCalled = true;
      return res;
    },
  };

  return { res: res as never, captured };
}
