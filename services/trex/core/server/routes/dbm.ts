import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import { Hono, Context } from "npm:hono";

import { DatabaseManager } from '../lib/dbm.ts';
import { isValidDbDto } from '../middleware/dbm.ts'
import { logger } from '../env.ts';
import { ensureAttached, type ExecFn, type SourceCredential } from "../lib/attach.ts";
import * as _ from "npm:lodash-es";

export function addRoutes(app: Hono) {
    
    app.post('/trex/db/pub/:name', authn, authz, async (c: Context) => {
        const name = c.req.param('name');
        const body = await c.req.json();

        Trex.addDB(body.publication, body.slot_name, name, body.db_host, Number(body.db_port), body.db_name, body.db_username, body.db_password);
        return c.json({"message": "ok"});
    });

    app.delete('/trex/db/:name', authn, authz, async (c: Context) => {
        try {
            const id = await (await DatabaseManager.get()).deleteCredentials(c.req.param('name'));
            return c.json({"id": c.req.param('name')});
        } catch (e) {
            logger.error(e);
            return c.text(e, 500);
        }
    })

    app.post('/trex/db/', authn, authz, isValidDbDto, async (c: Context) => {
        const body = await c.req.json();
        try {
            const id = await (await DatabaseManager.get()).setCredentials(body);
            return c.json({"id": id});
        } catch (e) {
            logger.error(e);
            return c.text(e, 500);
        }
    });

    app.get('/trex/db/', authn, authz, async (c: Context) => {
        const r = await (await DatabaseManager.get()).getCredentials();
        return c.json(r);
    });

    app.get('/trex/db/publications/', authn, authz, async (c: Context) => {
        const r = (await DatabaseManager.get()).getPublications();
        return c.json(r);
    });



    app.put('/trex/db/', authn, authz, async (c: Context) => {
        const body = await c.req.json();
        let r = await (await DatabaseManager.get()).getCredentialsEncrypted();
        let y = r.filter((x: any) => x.id === body.id)[0];
        let x = {
            ...y,
            ...body,
            authenticationMode: 'authenticationMode' in body ? (body.authenticationMode || null) : y.authentication_mode,
            vocabSchemas: 'vocabSchemas' in body ? (body.vocabSchemas || null) : y.vocab_schemas,
            extra: 'extra' in body ? body.extra : { Internal: y.db_extra }
        };
        //let w = r.filter((x: any) => x.id != body.id).push(x);

        try {
            const id = await (await DatabaseManager.get()).setCredentials(x);
            return c.json({"id": id});
        } catch (e) {
            logger.error(e);
            return c.text(e, 500);
        }
    });

    app.post('/trex/attach', authn, authz, async (c: Context) => {
      try {
        const body = await c.req.json().catch(() => ({}));
        const cacheIds: string[] = Array.isArray(body?.cacheIds) ? body.cacheIds.filter((s: unknown) => typeof s === "string") : [];
        const connectionIds: string[] = Array.isArray(body?.connectionIds) ? body.connectionIds.filter((s: unknown) => typeof s === "string") : [];

        const dbmInstance = await DatabaseManager.get();

        const connections: SourceCredential[] = [];
        if (connectionIds.length > 0) {
          const all = await dbmInstance.getCredentialsDecrypted();
          for (const id of connectionIds) {
            const row = all.find((r: any) => r.id === id);
            if (!row) {
              logger.log(`[trex/attach] unknown connectionId: ${id}`);
              continue;
            }
            const adminCred = (row.credentials ?? []).find((x: any) => x.userScope === "Admin");
            if (!adminCred) {
              logger.log(`[trex/attach] no Admin credential for ${id} — skipping`);
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
        }

        // One DuckDB session reused across every ATTACH in this request.
        const attachConn = new Trex.TrexDB("memory");
        const attachExec: ExecFn = (sql) => attachConn.execute(sql, []);

        for (const cid of connections) {
          try {
            await ensureAttached({ connections: [cid] }, { exec: attachExec });
          } catch (e) {
            logger.log(`[trex/attach] connection ${cid.id} attach failed: ${(e as Error).message}`);
          }
        }
        for (const cid of cacheIds) {
          try {
            await ensureAttached({ cacheIds: [cid] }, { exec: attachExec });
          } catch (e) {
            logger.log(`[trex/attach] cache ${cid} attach failed: ${(e as Error).message}`);
          }
        }

        return c.body(null, 204);
      } catch (e) {
        logger.error(e);
        return c.text(String(e), 500);
      }
    });

}