import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import { Hono, Context } from "npm:hono";

import { DatabaseManager } from '../lib/dbm.ts';
import { logger } from '../env.ts';
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

    app.post('/trex/db/', authn, authz, async (c: Context) => {
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
        let x = _.merge({}, y, {authenticationMode:y.authentication_mode, extra:{Internal:y.db_extra}, vocabSchemas:y.vocab_schemas}, body);
        //let w = r.filter((x: any) => x.id != body.id).push(x);
        try {
            const id = await (await DatabaseManager.get()).setCredentials(x);
            return c.json({"id": id});
        } catch (e) {
            logger.error(e);
            return c.text(e, 500);
        }
    });



}