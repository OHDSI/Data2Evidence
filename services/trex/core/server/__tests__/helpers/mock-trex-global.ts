/**
 * Mock the native Trex and EdgeRuntime globals.
 * MUST be imported before any route/lib module that references them.
 */

(globalThis as any).Trex = {
  applySupabaseTag: (_orig: Request, _mod: Request) => {},
  getRuntimeMetrics: async () => ({ memory: 0, cpu: 0 }),
  addDB: (..._args: any[]) => {},
  DatabaseManager: {
    getDatabaseManager: () => ({
      setCredentials: () => {},
      getPublications: () => [],
    }),
  },
  PluginManager: class {
    constructor() {}
    async install() {}
  },
  userWorkers: {
    create: () => {},
  },
};

(globalThis as any).EdgeRuntime = {
  userWorkers: {
    create: () => {},
  },
};
