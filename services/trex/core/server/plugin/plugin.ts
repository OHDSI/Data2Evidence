
import {addPlugin as addFlowPlugin} from "./flow.ts"
import {env, logger} from "../env.ts"
import {addPlugin as addFunctionPlugin} from "./function.ts"
import {addPlugin as addUIPlugin} from "./ui.ts"
import {addPlugin as addDBPlugin} from "./db.ts"
import pg from "npm:pg"
import { Hono } from "npm:hono";

export class Plugins {

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
	}

	private pgclient;
	private static _plugin : Plugins;

	public static async get() {
		if(!Plugins._plugin) {
			Plugins._plugin = new Plugins();
			await Plugins._plugin.pgclient.connect();
		}
		return Plugins._plugin;
	}

	async getPlugins() {
		const res = await this.pgclient.query("SELECT name, url, version FROM trex.plugins")
		return res;
	}

	private static async initPluginsDev(app: Hono) {
		for await (const plugin of Deno.readDir(`${env.PLUGINS_DEV_PATH}`)) {
			if(plugin.isDirectory)
				logger.log(`Add Plugin ${plugin.name} from ${env.PLUGINS_DEV_PATH}`)
				try {
					const pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_DEV_PATH}/${plugin.name}/package.json`));
					pkg.version = pkg.version+"-dev"
					await (await Plugins.get()).addPlugin(app, `${env.PLUGINS_DEV_PATH}/${plugin.name}`, pkg, 'dev');
				} catch(e) {
					logger.error(`${plugin.name} does not have a package.json`)
				}
		}
	}

	private static async initPluginsEnv(app: Hono) {
		const plugin = await Plugins.get();
		for(const name of env.PLUGINS_INIT) {
			try { 
				await plugin.addPluginPackage(app, name, env.PLUGINS_SEED_UPDATE || false)
			} catch(e) {
				logger.error(`${name} failed to install plugin`)
				throw e
			}
		}
	}

	async isInstalled(name: string) {
		const q = `SELECT name, version, payload::JSON FROM trex.plugins where name = $1`
		const r = await this.pgclient.query(q, [name]);
		if(r.rows.length > 0)
			return r.rows[0]
		return null
	}

	async delete(name: string) {
		const q = `DELETE from trex.plugins where name = $1`
		const r = await this.pgclient.query(q, [name]);
		initTrex();
		return r
	}

	async addPluginPackage(app: Hono, name: string, force = false) {
		let pkgname = "";
		let pkgurl = "";
		if(name.indexOf(":")<0) {
			pkgname = name;
			if(name.indexOf("@")<0 && env.PLUGINS_API_VERSION)
				pkgname = `${name}@${env.PLUGINS_API_VERSION}`;
			else 
				name = name.split("@")[0];

			pkgurl = `@${env.GH_ORG}/${pkgname}`;
		} else {
			pkgurl = name;
			name = pkgurl.split("/").pop()?.split(".")[0] || "";
			pkgname = name;
		}

		const _plugin = await this.isInstalled(name);
		let pkg = {};
		if(_plugin && !force) {
			logger.log(`skipping plugin install ${name} - already installed`)
			pkg = {name: _plugin.name, version: _plugin.version, trex: _plugin.payload}
		} else {
			const pm = new Trex.PluginManager(`${env.PLUGINS_PATH}`);
			await pm.install(pkgurl);
			pkg = JSON.parse(await Deno.readTextFile(`${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/package.json`));
		}
		await this.addPlugin(app, `${env.PLUGINS_PATH}/node_modules/@${env.GH_ORG}/${name}/`, pkg, name);
	}
	
	async addPlugin(app: Hono, dir: string, pkg:any, url:string) {
		try {
			for (const [key, value] of Object.entries(pkg.trex)) {
				switch(key) {
					case "knex":
						addDBPlugin(app, value, dir);
						break;
					case "functions":
						addFunctionPlugin(app, value, dir);
						break;
					case "ui":
						addUIPlugin(app, value, dir);
						break;
					case "flow":
						addFlowPlugin(value);
						break;		  
					default:
						logger.log(`Unknown type: ${key}`);
				}
			}
			const q = `INSERT INTO trex.plugins (name, url, version, payload) VALUES  ($1, $2, $3, $4) ON CONFLICT(name) DO UPDATE SET url = EXCLUDED.url, version = EXCLUDED.version, payload = EXCLUDED.payload`
			const r = await this.pgclient.query(q, [pkg.name.replace(new RegExp(`@${env.GH_ORG}/`),''), url, pkg.version, JSON.stringify(pkg.trex)]);
		} catch (e) { 
			logger.error(e);
		}
	}

	static async initPlugins(app: Hono) {
		logger.log("Add plugins");
		await Plugins.initPluginsEnv(app);
		if(env.NODE_ENV === 'development') {
			try {
				await Plugins.initPluginsDev(app);
			} catch (e) {
				logger.error(e)
			}
		}
	}
}



