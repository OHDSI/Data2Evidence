import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import {Plugins} from "../plugin/plugin.ts"
import {env, logger} from "../env.ts"
import { HTTPException } from 'npm:hono/http-exception'
import * as semver from 'npm:semver'
import { Hono, Context } from "npm:hono";

const PLUGIN_NAME_RE = /^[a-zA-Z0-9._-]+$/;

function validatePluginName(name: string): string {
    if (!name || !PLUGIN_NAME_RE.test(name)) {
        throw new HTTPException(400, {
            message: `Invalid plugin name: must match ${PLUGIN_NAME_RE}`,
        });
    }
    return name;
}

function parseTpmResult<T = any>(result: string[]): T | null {
    if (!result || result.length === 0 || !result[0]) return null;
    try {
        return JSON.parse(result[0]) as T;
    } catch (e) {
        logger.error(`Failed to parse TPM result: ${e}. Raw: ${result[0]}`);
        throw new HTTPException(500, { message: "Unexpected response from TPM extension" });
    }
}

function _checkSemver(version: string, sver: string) {
    if(sver === 'compatible')
        sver = env.PLUGINS_API_VERSION
    if(sver && sver != "latest" && sver != 'all') {
        return semver.satisfies(version, sver)
    }
    return true
}

let _tpmConn: any = null;

async function getTpmConnection() {
    if (_tpmConn) {
        try {
            await _tpmConn.execute("SELECT 1", []);
            return _tpmConn;
        } catch (_e) {
            _tpmConn = null;
        }
    }
    const conn = new Trex.TrexDB("memory");
    await conn.execute(`LOAD '${env.TPM_EXT_PATH}'`, []);
    _tpmConn = conn;
    return conn;
}

async function scanDiskPlugins(): Promise<Map<string, {name: string, version: string}>> {
    const diskPlugins = new Map<string, {name: string, version: string}>();

    async function scanDir(dir: string) {
        for await (const entry of Deno.readDir(dir)) {
            if (!entry.isDirectory) continue;
            if (entry.name.startsWith('@')) {
                await scanDir(`${dir}/${entry.name}`);
                continue;
            }
            try {
                const pkgJsonPath = `${dir}/${entry.name}/package.json`;
                const pkg = JSON.parse(await Deno.readTextFile(pkgJsonPath));
                const shortName = pkg.name?.includes("/")
                    ? pkg.name.split("/").pop()
                    : pkg.name || entry.name;
                diskPlugins.set(shortName, {name: shortName, version: pkg.version});
            } catch (_e) {
                // Skip entries without valid package.json
            }
        }
    }

    try {
        await scanDir(env.PLUGINS_PATH);
    } catch (_e) {
        // Plugins directory not readable
    }
    return diskPlugins;
}

export function addRoutes(app: Hono) {
    // T015: GET — filesystem scan + activeRegistry merge
    app.get('/trex/plugins', authn, authz, async (c: Context) => {
        const q = c.req.query('version') || 'compatible';
        const diskPlugins = await scanDiskPlugins();
        const activePlugins = Plugins.getActivePlugins();

        // Build merged list
        const pluginList: any[] = [];
        const seen = new Set<string>();

        // Add all on-disk plugins
        for (const [name, diskInfo] of diskPlugins) {
            seen.add(name);
            const activeEntry = activePlugins.get(name);
            const active = !!activeEntry;
            const activeVersion = activeEntry?.version || null;
            const pendingRestart = !active || (activeVersion !== diskInfo.version);
            pluginList.push({
                name,
                version: diskInfo.version,
                activeVersion,
                active,
                installed: true,
                pendingRestart,
            });
        }

        // Add active plugins not on disk (deleted but still serving)
        for (const [name, activeEntry] of activePlugins) {
            if (seen.has(name)) continue;
            pluginList.push({
                name,
                version: null,
                activeVersion: activeEntry.version,
                active: true,
                installed: true,
                pendingRestart: true,
            });
        }

        if (q === 'none') {
            return c.json(pluginList);
        }

        // Enrich with registry info
        try {
            const pkgs = await fetch(env.PLUGINS_INFORMATION_URL);
            const pkgs_json = await pkgs.json();
            const registryMap = new Map<string, {description: string, registryVersion: string}>();

            for (const pkg of pkgs_json.value) {
                const pkgname = pkg.name.replace(`@${env.GH_ORG}/`, "");
                const version = pkg.versions.reduce((m: any, c: any) => {
                    return c["version"] > m["version"] && _checkSemver(c["version"], q) ? c : m;
                }, {version: "", packageDescription: ""});
                registryMap.set(pkgname, {
                    description: version.packageDescription,
                    registryVersion: version.version,
                });
            }

            // Merge registry info into plugin list
            for (const plugin of pluginList) {
                const regInfo = registryMap.get(plugin.name);
                if (regInfo) {
                    plugin.description = regInfo.description;
                    plugin.registryVersion = regInfo.registryVersion;
                }
            }

            // Add registry-only plugins not on disk and not active
            for (const [pkgname, regInfo] of registryMap) {
                if (!seen.has(pkgname) && !activePlugins.has(pkgname)) {
                    pluginList.push({
                        name: pkgname,
                        version: null,
                        activeVersion: null,
                        active: false,
                        installed: false,
                        pendingRestart: false,
                        description: regInfo.description,
                        registryVersion: regInfo.registryVersion,
                    });
                }
            }
        } catch (e) {
            logger.error(`Failed to fetch registry info: ${e}`);
        }

        return c.json(pluginList);
    });

    // PATCH removed (FR-010)

    // T014: POST — install via TPM
    app.post('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const name = validatePluginName(c.req.param('name'));
        const version = env.PLUGINS_API_VERSION || 'latest';
        const packageSpec = `@${env.GH_ORG}/${name}@${version}`;

        try {
            const conn = await getTpmConnection();
            const result = await conn.execute(
                `SELECT * FROM tpm_install('${packageSpec}', '${env.PLUGINS_PATH}')`, []
            );
            const installResult = parseTpmResult(result);

            if (installResult && !installResult.success) {
                throw new Error(installResult.error || "Install failed");
            }

            return c.json({
                name,
                version: installResult?.version || version,
                installed: true,
                active: false,
                message: "Plugin installed. Restart required to activate.",
            });
        } catch (e) {
            logger.error(`${name} failed to install plugin: ${e}`);
            throw new HTTPException(500, { message: `${name} failed to install plugin` });
        }
    });

    // T014: PUT — update via TPM (force overwrite)
    app.put('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const name = validatePluginName(c.req.param('name'));
        const version = env.PLUGINS_API_VERSION || 'latest';
        const packageSpec = `@${env.GH_ORG}/${name}@${version}`;
        const activePlugins = Plugins.getActivePlugins();
        const activeEntry = activePlugins.get(name);

        try {
            const conn = await getTpmConnection();

            // Delete existing package first for clean overwrite
            try {
                await conn.execute(`SELECT * FROM tpm_delete('${name}', '${env.PLUGINS_PATH}')`, []);
            } catch (_e) {
                // Ignore — package may not exist yet
            }

            const result = await conn.execute(
                `SELECT * FROM tpm_install('${packageSpec}', '${env.PLUGINS_PATH}')`, []
            );
            const installResult = parseTpmResult(result);

            if (installResult && !installResult.success) {
                throw new Error(installResult.error || "Update failed");
            }

            return c.json({
                name,
                version: installResult?.version || version,
                installed: true,
                active: !!activeEntry,
                activeVersion: activeEntry?.version || null,
                message: "Plugin updated on disk. Restart required to activate new version.",
            });
        } catch (e) {
            logger.error(`${name} failed to update plugin: ${e}`);
            throw new HTTPException(500, { message: `${name} failed to update plugin` });
        }
    });

    // T014: DELETE — remove via TPM
    app.delete('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const name = validatePluginName(c.req.param('name'));
        const activePlugins = Plugins.getActivePlugins();
        const isActive = activePlugins.has(name);

        try {
            const conn = await getTpmConnection();
            const result = await conn.execute(
                `SELECT * FROM tpm_delete('${name}', '${env.PLUGINS_PATH}')`, []
            );
            const deleteResult = parseTpmResult(result);

            if (deleteResult && !deleteResult.deleted) {
                throw new Error(deleteResult.error || "Delete failed");
            }

            return c.json({
                name,
                deleted: true,
                active: isActive,
                message: isActive
                    ? "Plugin removed from disk. Restart required to deactivate."
                    : "Plugin removed from disk.",
            });
        } catch (e) {
            logger.error(`${name} failed to delete plugin: ${e}`);
            throw new HTTPException(500, { message: `${name} failed to delete plugin` });
        }
    });
}
