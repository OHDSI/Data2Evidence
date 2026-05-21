
import {addPlugin as addFlowPlugin} from "./flow.ts"
import {addPlugin as addCorePlugin} from "./core.ts"
import {env, logger} from "../env.ts"
import {addPlugin as addFunctionPlugin} from "./function.ts"
import {addPlugin as addUIPlugin} from "./ui.ts"
import {addPlugin as addDBPlugin} from "./db.ts"
import pg from "npm:pg"
import { Hono } from "npm:hono";

export type DiscoveredPlugin = {
	dir: string;
	pkg: any;
};

export async function discoverPlugins(paths: string[]): Promise<DiscoveredPlugin[]> {
	const byName = new Map<string, DiscoveredPlugin>();
	for (const root of paths) {
		try {
			for await (const child of Deno.readDir(root)) {
				if (!child.isDirectory) continue;
				const pkgPath = `${root}/${child.name}/package.json`;
				try {
					const pkg = JSON.parse(await Deno.readTextFile(pkgPath));
					if (!pkg.name) {
						logger.error(`${pkgPath}: package.json missing "name"`);
						continue;
					}
					if (!pkg.trex) {
						logger.error(`${pkgPath}: package.json missing "trex" key, skipping`);
						continue;
					}
					byName.set(pkg.name, { dir: `${root}/${child.name}`, pkg });
				} catch (e) {
					logger.error(`${pkgPath}: ${e instanceof Error ? e.message : e}`);
				}
			}
		} catch (e) {
			logger.log(`Plugins path ${root} not readable, skipping: ${e instanceof Error ? e.message : e}`);
		}
	}
	return [...byName.values()];
}

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

	private static async initPluginsDiscovered(app: Hono) {
		const paths = env.PLUGINS_DEV_PATH.split(":").map(s => s.trim()).filter(Boolean);
		const discovered = await discoverPlugins(paths);
		logger.log(`Discovered ${discovered.length} plugin(s) across ${paths.length} path(s): ${paths.join(", ")}`);
		const plugin = await Plugins.get();
		for (const { dir, pkg } of discovered) {
			const shortName = pkg.name.split("/").pop();
			try {
				await plugin.addPlugin(app, `${dir}/`, pkg, shortName);
			} catch (e) {
				logger.error(`Failed to register plugin ${pkg.name}: ${e instanceof Error ? e.message : e}`);
			}
		}
	}

	private static async initPluginsEnv(app: Hono) {
		if (!env.PLUGINS_INIT || env.PLUGINS_INIT.length === 0) {
			return;
		}
		logger.log(`PLUGINS_SEED set: installing ${env.PLUGINS_INIT.length} plugin(s) from registry: ${env.PLUGINS_INIT.join(", ")}`);
		const plugin = await Plugins.get();
		const failed: string[] = [];
		for(const name of env.PLUGINS_INIT) {
			try {
				await plugin.addPluginPackage(app, name, env.PLUGINS_SEED_UPDATE || false)
			} catch(e) {
				logger.error(`${name} failed to install plugin: ${e instanceof Error ? e.message : e}`)
				failed.push(name)
			}
		}
		if(failed.length > 0) {
			logger.error(`plugin seed completed with failures: ${failed.join(", ")}`)
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
			const pkgJsonPath = `${env.PLUGINS_PATH}/@${env.GH_ORG}/${name}/package.json`;
			const maxAttempts = 3;
			let lastErr: unknown;
			for(let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					await pm.install(pkgurl);
					await Deno.stat(pkgJsonPath);
					lastErr = undefined;
					break;
				} catch(e) {
					lastErr = e;
					const msg = e instanceof Error ? e.message : String(e);
					logger.error(`install attempt ${attempt}/${maxAttempts} failed for ${pkgurl}: ${msg}`);
					if(attempt < maxAttempts) {
						const backoffMs = 1000 * Math.pow(2, attempt - 1);
						await new Promise(r => setTimeout(r, backoffMs));
					}
				}
			}
			if(lastErr !== undefined) {
				throw new Error(`failed to install plugin ${pkgurl} after ${maxAttempts} attempts: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
			}
			pkg = JSON.parse(await Deno.readTextFile(pkgJsonPath));
		}
		await this.addPlugin(app, `${env.PLUGINS_PATH}/@${env.GH_ORG}/${name}/`, pkg, name);
	}
	
	async addPlugin(app: Hono, dir: string, pkg:any, url:string) {
		try {
			for (const [key, value] of Object.entries(pkg.trex)) {
				switch(key) {
					case "knex":
						addDBPlugin(app, value, dir);
						break;
					case "functions":
						addFunctionPlugin(app, value, dir, url);
						break;
					case "ui":
						addUIPlugin(app, value, dir);
						break;
					case "flow":
						addFlowPlugin(value);
						break;
					case "core":
						addCorePlugin(value, dir);
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
		logger.log("Initialising plugins");
		await Plugins.initPluginsDiscovered(app);
		await Plugins.initPluginsEnv(app);
	}
}



