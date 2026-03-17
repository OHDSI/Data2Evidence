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
import { authn } from "./auth/authn.ts";
import { authz } from "./auth/authz.ts";

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

    // Load FHIR extension from @trex/fhir package
    try {
        logger.log(`Loading FHIR extension...`);
        const fhirConn = new Trex.TrexDB("memory");
        await fhirConn.execute("LOAD json", []);
        await fhirConn.execute("LOAD './node_modules/@trex/fhir/fhir.trex'", []);
        logger.log(`Loaded FHIR extension`);
        const fhirPort = 33003;
        await fhirConn.execute(`SELECT trex_fhir_start('0.0.0.0', ${fhirPort})`, []);
        logger.log(`Started FHIR server on port ${fhirPort}`);

        app.get('/fhir-server/healthcheck', async (c) => {
            const resp = await fetch(`http://localhost:${fhirPort}/health`);
            return new Response(resp.body, { status: resp.status, headers: resp.headers });
        });

        app.all('/fhir-server/*', authn, authz, async (c) => {
            const subpath = c.req.path.replace(/^\/fhir-server/, '');
            const url = new URL(c.req.url);
            const target = `http://localhost:${fhirPort}${subpath}${url.search}`;
            const headers = new Headers(c.req.raw.headers);
            headers.delete('host');
            const resp = await fetch(target, {
                method: c.req.method,
                headers,
                body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
            });
            return new Response(resp.body, { status: resp.status, headers: resp.headers });
        });
    } catch (e) {
        logger.error(`Failed to load FHIR extension: ${e.message}`);
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
