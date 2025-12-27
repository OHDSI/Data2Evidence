import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {logger} from "./env.ts"
import {Plugins} from "./plugin/plugin.ts"
import { KnexMigration } from './plugin/db.ts';
import { DatabaseManager } from './lib/dbm.ts';
import { addRoutes as addBaseRoutes } from "./routes/base.ts"
import { addRoutes as addDBMRoutes } from "./routes/dbm.ts"
import { addRoutes as addPluginRoutes } from "./routes/plugin.ts"
import { addRoutes as addPortalRoutes } from "./routes/portal.ts"
import { addRoutes as addLogRoutes } from "./routes/log.ts"

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
