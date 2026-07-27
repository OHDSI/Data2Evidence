/**
 * The trex runtime injects a `Trex` global. It does not exist under `deno test`,
 * so every API-client constructor (which calls `Trex.tokioChannel(...)`) throws
 * ReferenceError without this shim.
 */
export function installTrexGlobal(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.Trex) return;
  g.Trex = {
    tokioChannel: (_name: string) => ({ _testChannel: true }),
  };
}
