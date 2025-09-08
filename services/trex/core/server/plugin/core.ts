

import {env, logger} from "../env.ts"
import { DatabaseManager } from '../lib/dbm.ts';

export async function addPlugin(value: any, dir: any) {
    try {

        if(value.name) {
            const conn = new Trex.TrexDB("memory");
            const ext = `${dir}/${value.name}.duckdb_extension`;
            let r = await conn.execute(`LOAD '${ext}'`, []);
            logger.info(`Loaded plugin ${value.name}: ${r}`);
            const cred = await (await DatabaseManager.get()).getCredentialsDecrypted();
            if(value.name == 'pgwire') {
                r = await conn.execute(`SELECT start_pgwire_server('0.0.0.0', 5433, '${process.env.TREX__SQL__PASSWORD}', '${JSON.stringify(cred)}')`, []);
                logger.info(`Started pgwire server: ${r}`);
            }
        } else {
            throw new Error("Plugin missing name");
        }
    } catch (error) {
        logger.error(`Failed to add plugin: ${error.message}`)
    }
}
