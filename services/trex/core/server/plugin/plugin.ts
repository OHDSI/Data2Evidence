import {addPlugin as addFlowPlugin} from "./flow.ts"
import {addPlugin as addCorePlugin} from "./core.ts"
import {env, logger} from "../env.ts"
import {addPlugin as addFunctionPlugin} from "./function.ts"
import {addPlugin as addUIPlugin} from "./ui.ts"
import {addPlugin as addDBPlugin} from "./db.ts"
import { Hono } from "npm:hono";

interface ActivePluginEntry {
	name: string;
	version: string;
	registeredAt: Date;
}

export class Plugins {

	static activeRegistry: Map<string, ActivePluginEntry> = new Map();

	private static addPlugin(app: Hono, dir: string, pkg: any, shortName: string) {
		try {
			if (!pkg.trex) {
				logger.log(`Plugin ${shortName} has no trex config — skipping registration`);
				return;
			}
			for (const [key, value] of Object.entries(pkg.trex)) {
				switch(key) {
					case "knex":
						addDBPlugin(app, value, dir);
						break;
					case "functions":
						addFunctionPlugin(app, value, dir, shortName);
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
			Plugins.activeRegistry.set(shortName, {
				name: shortName,
				version: pkg.version,
				registeredAt: new Date(),
			});
		} catch (e) {
			logger.error(e);
		}
	}

	private static async scanAndRegister(app: Hono, dir: string, versionSuffix?: string) {
		async function scanLevel(scanDir: string) {
			for await (const entry of Deno.readDir(scanDir)) {
				if (!entry.isDirectory) continue;
				if (entry.name.startsWith('@')) {
					await scanLevel(`${scanDir}/${entry.name}`);
					continue;
				}
				try {
					const pkgJsonPath = `${scanDir}/${entry.name}/package.json`;
					const pkg = JSON.parse(await Deno.readTextFile(pkgJsonPath));
					if (versionSuffix) {
						pkg.version = pkg.version + versionSuffix;
					}
					const shortName = pkg.name?.includes("/")
						? pkg.name.split("/").pop()
						: pkg.name || entry.name;
					logger.log(`Found plugin ${shortName} (v${pkg.version}) in ${scanDir}`);
					Plugins.addPlugin(app, `${scanDir}/${entry.name}`, pkg, shortName);
					logger.log(`Registered plugin ${shortName}`);
				} catch (_e) {
					logger.error(`${entry.name} does not have a valid package.json — skipped`);
				}
			}
		}

		try {
			await scanLevel(dir);
		} catch (_e) {
			logger.log(`Plugins directory ${dir} not found or not readable — skipping`);
		}
	}

	static async initPlugins(app: Hono) {
		logger.log("Scanning and registering plugins");

		// Scan production plugins directory
		await Plugins.scanAndRegister(app, env.PLUGINS_PATH);

		// Scan dev plugins directory in development mode
		if (env.NODE_ENV === 'development') {
			await Plugins.scanAndRegister(app, env.PLUGINS_DEV_PATH, "-dev");
		}

		logger.log(`Plugin registration complete: ${Plugins.activeRegistry.size} plugins active`);
	}

	static getActivePlugins(): Map<string, ActivePluginEntry> {
		return Plugins.activeRegistry;
	}
}
