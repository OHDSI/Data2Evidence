import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {env, logger} from "./env.ts"
import {Plugins} from "./plugin/plugin.ts"
import { KnexMigration } from './plugin/db.ts';
import { DatabaseManager } from './lib/dbm.ts';
import { addRoutes as addBaseRoutes } from "./routes/base.ts"
import { addRoutes as addDBMRoutes } from "./routes/dbm.ts"
import { addRoutes as addPluginRoutes } from "./routes/plugin.ts"
import { addRoutes as addPortalRoutes } from "./routes/portal.ts"
import { addRoutes as addLogRoutes } from "./routes/log.ts"
import { authn } from "./auth/authn.ts"
import { ensureAttached, type ExecFn, type SourceCredential } from "./lib/attach.ts";

export async function initTrex() {
    logger.log('🦖 TREX initializing 🦖');
    const app: Hono = new Hono({
        getPath: (req) => {
            const url = new URL(req.url);
            if (url.pathname.startsWith('/d2e/')) {
                url.pathname = url.pathname.replace(/^\/d2e\//, '/');
            }
            return url.pathname;
        }
            
    });
    app.use(hlogger())
    await DatabaseManager.get();

    // Load ICU extension for DuckDB functions like current_date
    const icuConn = new Trex.TrexDB("memory");
    await icuConn.execute("LOAD icu", []);
    const icuTest = await icuConn.execute("SELECT current_date AS today", []);
    logger.log(`Loaded ICU extension (current_date = ${icuTest[0]?.today})`);

    // Load FTS (Full-Text Search) extension for DuckDB
    const ftsConn = new Trex.TrexDB("memory");
    await ftsConn.execute("LOAD fts", []);
    logger.log(`Loaded FTS extension`);

    // Attach the built-in cdw_config_svc validation schema so cdw-svc
    // queries against datasetId="DEFAULT" can resolve `cdw_config_svc`.
    // The old runtime did this lazily inside TrexDB's constructor; with
    // @trex/pool worker connections share the catalog, so a one-shot
    // ATTACH on the memory connection at startup is enough.
    try {
      const cdwConn = new Trex.TrexDB("memory");
      await cdwConn.execute(
        "ATTACH IF NOT EXISTS '/usr/src/cdw_data/built_in/cdw_config_svc_validation_schema' AS cdw_config_svc (READ_ONLY)",
        [],
      );
      logger.log('Attached cdw_config_svc validation schema');
    } catch (e) {
      logger.error('Failed to attach cdw_config_svc validation schema:', e);
    }

    try {
      const dbmInstance = await DatabaseManager.get();
      const credentials = await dbmInstance.getCredentialsDecrypted();
      const connections: SourceCredential[] = [];
      for (const row of credentials) {
        const adminCred = (row.credentials ?? []).find((c: any) => c.userScope === "Admin");
        if (!adminCred) {
          logger.log(`[attach-startup] no Admin credential for ${row.id} — skipping __srcdb attach`);
          continue;
        }
        connections.push({
          id: row.id,
          dialect: row.dialect,
          host: row.host,
          port: row.port,
          name: row.name,
          adminUsername: adminCred.username,
          adminPassword: adminCred.password,
        });
      }

      const cacheIds = await dbmInstance.getCacheIdsFromPortal();

      // One DuckDB session shared across every ATTACH issued in this phase.
      const attachConn = new Trex.TrexDB("memory");
      const attachExec: ExecFn = (sql) => attachConn.execute(sql, []);

      // Per-item try/catch so a single bad credential or cache_id can't crash startup.
      for (const c of connections) {
        try {
          await ensureAttached({ connections: [c] }, { exec: attachExec });
        } catch (e) {
          logger.log(`[attach-startup] connection ${c.id} attach failed: ${(e as Error).message}`);
        }
      }
      for (const cid of cacheIds) {
        try {
          await ensureAttached({ cacheIds: [cid] }, { exec: attachExec });
        } catch (e) {
          logger.log(`[attach-startup] cache ${cid} attach failed: ${(e as Error).message}`);
        }
      }
      logger.log(`[attach-startup] ensureAttached over ${connections.length} connection(s) and ${cacheIds.length} cache_id(s)`);
      try {
        await ensureAttached({ cacheIds: [env.TREX__STRATEGUS_RESULTS_DB_NAME] }, { exec: attachExec, createDbFileIfMissing: true });
        logger.log(`[attach-startup] strategus_results attach successful`);
      } catch (error) {
        logger.log(`[attach-startup] cache strategus_results attach failed: ${(error as Error).message}`);
      }
    } catch (e) {
      logger.log(`[attach-startup] failed: ${(e as Error).message}`);
    }

    /*for await (const r of Deno.readDir("./core/server/routes")) {
        logger.log(`Add Routes ${r.name}`)
        const module = await import(`./routes/${r.name}`);
        module.addRoutes(app);

    }*/
    addBaseRoutes(app);
    addDBMRoutes(app);
    addPluginRoutes(app);
    addPortalRoutes(app);
    addLogRoutes(app);

    // Proxy WebAPI requests with Logto token exchange
    app.all('/WebAPI/*', authn, async (c) => {
        const url = new URL(c.req.url);
        const targetUrl = `http://localhost:8080${url.pathname}${url.search}`;

        const headers = new Headers(c.req.raw.headers);
        headers.delete('host');

        const webApiToken = c.get("webApiToken");
        if (webApiToken) {
            headers.set("Authorization", `Bearer ${webApiToken}`);
        }

        try {
            const response = await fetch(targetUrl, {
                method: c.req.method,
                headers: headers,
                body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
                // @ts-ignore - duplex is needed for streaming request bodies
                duplex: 'half',
                redirect: 'manual',
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
        } catch (e) {
            logger.error(`WebAPI proxy error: ${e}`);
            return new Response(JSON.stringify({ error: 'WebAPI proxy error' }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    });

    await Plugins.initPlugins(app);
    logger.log("Added plugins");

    // /logto route - spawns user worker with sloppy imports code
    app.all('/logto', async (c) => {
        const req = c.req.raw;
        const servicePath = './logto';

        const createWorker = async () => {
            const memoryLimitMb = 150;
            const workerTimeoutMs = 5 * 60 * 1000;
            const noModuleCache = false;

            const envVarsObj = Deno.env.toObject();
            const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]);
            const forceCreate = false;

            const cpuTimeSoftLimitMs = 10000;
            const cpuTimeHardLimitMs = 20000;
            const staticPatterns = [
                "./logto/**/*.html",
            ];

            return await EdgeRuntime.userWorkers.create({
                servicePath,
                memoryLimitMb,
                workerTimeoutMs,
                noModuleCache,
                envVars,
                forceCreate,
                cpuTimeSoftLimitMs,
                cpuTimeHardLimitMs,
                staticPatterns,
                context: {
                    useReadSyncFileAPI: true,
                    unstableSloppyImports: true,
                },
                otelConfig: {
                    tracing_enabled: false,
                    propagators: [],
                },
            });
        };

        const callWorker = async (): Promise<Response> => {
            try {
                const worker = await createWorker();
                const controller = new AbortController();
                const signal = controller.signal;
                return await worker.fetch(req, { signal });
            } catch (e) {
                if (e instanceof Deno.errors.WorkerAlreadyRetired) {
                    return await callWorker();
                }
                const error = { msg: e.toString() };
                return new Response(
                    JSON.stringify(error),
                    {
                        status: 500,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }
        };

        return callWorker();
    });

    logger.log('🦖 TREX started 🦖');
    Deno.serve(app.fetch);
    await new Promise(() => {});
}

logger.log('🦖 TREX DB initializing 🦖');
await new KnexMigration('trex', "./db/migrations/", null).initalizeDataSource();
await initTrex();
