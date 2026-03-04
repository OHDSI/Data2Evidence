

import {env, logger} from "../env.ts"
import { DatabaseManager } from '../lib/dbm.ts';
import { authn } from "../auth/authn.ts";
import { authz } from "../auth/authz.ts";
import { Hono } from "npm:hono";

const FHIR_PORT = parseInt(process.env.FHIR__INTERNAL_PORT || '8080');

function _addFhirForwarding(app: Hono) {
    app.get('/fhir-server/healthcheck', async (c) => {
        const resp = await fetch(`http://localhost:${FHIR_PORT}/health`);
        return new Response(resp.body, { status: resp.status, headers: resp.headers });
    });

    app.all('/fhir-server/*', authn, authz, async (c) => {
        const subpath = c.req.path.replace(/^\/fhir-server/, '');
        const url = new URL(c.req.url);
        const target = `http://localhost:${FHIR_PORT}${subpath}${url.search}`;
        const headers = new Headers(c.req.raw.headers);
        headers.delete('host');
        const resp = await fetch(target, {
            method: c.req.method,
            headers,
            body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
        });
        return new Response(resp.body, { status: resp.status, headers: resp.headers });
    });
}

export async function addPlugin(app: Hono, value: any, dir: any) {
    try {

        if(value.name) {
            const conn = new Trex.TrexDB("memory");
            let ext = `${dir}/${value.name}.trex`;
            try {
                await Deno.stat(ext);
            } catch {
                ext = `${dir}/${value.name}.duckdb_extension`;
            }
            let r = await conn.execute(`LOAD '${ext}'`, []);
            logger.info(`Loaded plugin ${value.name}: ${r}`);
            const cred = await (await DatabaseManager.get()).getCredentialsDecrypted();
            if(value.name == 'pgwire') {
                r = await conn.execute(`SELECT start_pgwire_server('0.0.0.0', 5433, '${process.env.TREX__SQL__PASSWORD}', '${btoa(JSON.stringify(cred))}')`, []);
                logger.info(`Started pgwire server: ${r}`);
            }
            if(value.name == 'fhir') {
                r = await conn.execute(`SELECT trex_fhir_start('0.0.0.0', ${FHIR_PORT})`, []);
                logger.info(`Started FHIR server on port ${FHIR_PORT}: ${r}`);
                _addFhirForwarding(app);
            }
        } else {
            throw new Error("Plugin missing name");
        }
    } catch (error) {
        logger.error(`Failed to add plugin: ${error.message}`)
    }
}
