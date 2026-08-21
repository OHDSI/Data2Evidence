export interface TrexChannel {
  get(url: string, options?: unknown): Promise<unknown>;
  post(url: string, data?: unknown, options?: unknown): Promise<unknown>;
  put(url: string, data?: unknown, options?: unknown): Promise<unknown>;
  delete(url: string, options?: unknown): Promise<unknown>;
}

declare global {
  // The trex runtime injects this; production sources reference it untyped.
  // Declaring it here keeps `deno check` on a test graph from failing with
  // "Cannot find name 'Trex'".
  // deno-lint-ignore no-var
  var Trex: { tokioChannel: (name: string) => TrexChannel };
}

/**
 * The trex runtime injects a `Trex` global. It does not exist under `deno test`,
 * so every API-client constructor (which calls `Trex.tokioChannel(...)`) throws
 * ReferenceError without this shim.
 *
 * The channel returned here rejects on use: tests are expected to stub the API
 * client method they exercise, so an actual channel call means the test escaped
 * its double.
 */
export function installTrexGlobal(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.Trex) return;

  const unstubbed = (method: string) => (url: string) =>
    Promise.reject(
      new Error(
        `Trex test channel: unstubbed ${method.toUpperCase()} ${url} — stub the API client method instead`,
      ),
    );

  g.Trex = {
    tokioChannel: (_name: string): TrexChannel => ({
      get: unstubbed("get"),
      post: unstubbed("post"),
      put: unstubbed("put"),
      delete: unstubbed("delete"),
    }),
  };
}
