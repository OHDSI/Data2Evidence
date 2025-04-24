import {env, logger} from "../env.ts"
import pg from "npm:pg"
import {Validator} from "npm:jsonschema"
import { dbSchema } from './schema.ts';
import { constants, privateDecrypt } from "node:crypto";
import * as base64 from "jsr:@std/encoding/base64";

export class DatabaseManager {

	private constructor() {
		const opt = {
			user: env.PG__USER,
			password: env.PG__PASSWORD,
			host: env.PG__HOST,
			port: parseInt(env.PG__PORT),
			database: env.PG__DB_NAME,
            ssl: (() => {
				let ssl: any = JSON.parse(env.PG__SSL.toLowerCase());
				if (env.PG__CA_ROOT_CERT) {
				  return {
					rejectUnauthorized: true,
					ca: env.PG__CA_ROOT_CERT,
				  };
				}
				return ssl;
			  })()
		  }
		this.pgclient = new pg.Client(opt);	
        this.trexdbm = Trex.DatabaseManager.getDatabaseManager();
    }

    private trexdbm;
	private pgclient;
    private insert_query = `INSERT INTO trex.db \
    (id, host, port, "name", dialect, credentials, vocab_schemas, publications, db_extra, authentication_mode ) \
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9, $10) ON CONFLICT (id) 
     DO UPDATE  SET host = EXCLUDED.host, \
    port = EXCLUDED.port, \
    "name" = EXCLUDED."name", \
    dialect = EXCLUDED.dialect, \
    credentials = EXCLUDED.credentials, \
    vocab_schemas = EXCLUDED.vocab_schemas, \
    publications = EXCLUDED.publications, \
    db_extra = EXCLUDED.db_extra, \
    authentication_mode = EXCLUDED.authentication_mode`;

    private static _dbm : DatabaseManager;

	public static async get() {
		if(!DatabaseManager._dbm) {
			DatabaseManager._dbm = new DatabaseManager();
            await DatabaseManager._dbm.pgclient.connect();
            const dbc = await DatabaseManager._dbm.getCredentialsDecrypted();
            DatabaseManager._dbm.trexdbm.setCredentials(dbc);

		}
		return DatabaseManager._dbm;
	}

    public async deleteCredentials(id: string) {
      const r = await this.pgclient.query("delete from trex.db where id = $1", [id]);
        this.trexdbm.setCredentials(await this.getCredentialsDecrypted());
        return r;
    }

    public async setCredentials(c: any) {
        const v = new Validator();
        v.validate(c, dbSchema);

        const params = [c.code || c.id, c.host, c.port, c.name, c.dialect, JSON.stringify(c.credentials), JSON.stringify(c.vocabSchemas) || null, JSON.stringify(c.publications) || null, JSON.stringify(c.extra?.Internal) || null, c.authenticationMode || null ];
        const r = await this.pgclient.query(this.insert_query, params);
        this.trexdbm.setCredentials(await this.getCredentialsDecrypted());
        return c.code;
    }

    public getPublications() {
        return this.trexdbm.getPublications();
    }



   private  credentialsPrivateKey: string =
  env.DB_CREDENTIALS__PRIVATE_KEY!.replace(/\\n/g, "\n");

  private decrypt (encryptedValue: string)  {
  if (!encryptedValue) {
    console.error("Missing encrypted value from database credentials");
    //process.exit(3);
  }
  const privateKey = this.credentialsPrivateKey.replace(/\\n/g, "\n");

  let ret = ""
  const decoder = new TextDecoder()
  try {
    ret= decoder.decode(privateDecrypt(
      {
        key: privateKey,
        padding: constants.TREX_RSA_PKCS1_OAEP_SHA256_PADDING,
        oaepHash: "sha256",
      },
      base64.decodeBase64(encryptedValue)
  ));
  } catch(e) {
    console.log(e);
    throw new Error("decrypt failed");
  }
  return ret
};



private async _getCredentials(fn:any) {
    const r = await this.pgclient.query(`SELECT id as code, * from trex.db`);
    const result = r.rows.map((x:any) => {
        x.credentials = x.credentials.map(fn);
        return x;
    });
    return JSON.parse(JSON.stringify(result));
}
public async getCredentials() {
    return await this._getCredentials((y:any) => { 
                return {
                    username: y.username,
                    userScope: y.userScope || y.user_scope,
                    serviceScope:y.serviceScope || y.service_scope
                };
            });
            
}

public async getCredentialsEncrypted() {
    return await this._getCredentials((y:any) => y);
}

    public async getCredentialsDecrypted() {
        return await this._getCredentials((y:any) => { 
 
                    return {
                        username: y.username,
                        userScope: y.userScope || y.user_scope,
                        serviceScope:y.serviceScope || y.service_scope,
                        password: this.decrypt(y.password).replace(y.salt, "")
                    };
                });
    }


}