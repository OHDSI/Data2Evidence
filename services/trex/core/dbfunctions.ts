import { pgconnection }  from 'https://raw.githubusercontent.com/kagis/pgwire/a82f84a714c2f97ffd32487a84c527a41ab29c0f/mod.js'

export async function pgevents(rpub, rslot, rconnstring) {
    const pg = pgconnection({ replication: 'database' }, rconnstring);
    try {
    const replicationStream = pg.logicalReplication({
        slot: rslot,
        options: {
        'proto_version': 1,
        'publication_names': rpub,
        }, 
    });
    for await (const { lastLsn, messages } of replicationStream.pgoutputDecode()) {
        for (const pgomsg of messages) {
            switch (pgomsg.tag) {
                case "insert":
                    console.log(`🗄️ INSERT ${pgomsg.relation.schema}.${pgomsg.relation.name} ${JSON.stringify(pgomsg.afterRaw)}`)
                    break;
                case "update":
                    console.log(`🗄️ UPDATE ${pgomsg.relation.schema}.${pgomsg.relation.name} ${JSON.stringify(pgomsg.afterRaw)}`)
                    break;
                case "delete":
                    console.log(`🗄️ DELETE ${pgomsg.relation.schema}.${pgomsg.relation.name} ${JSON.stringify(pgomsg.beforeRaw)}`)
                    break;
            }
        }
        replicationStream.ack(lastLsn);
    }
    } finally {
    await pg.end();
    }
}