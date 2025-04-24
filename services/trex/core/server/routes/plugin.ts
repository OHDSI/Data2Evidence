import {authn} from "../auth/authn.ts"
import {authz} from "../auth/authz.ts"
import {Plugins} from "../plugin/plugin.ts"
import {env, logger} from "../env.ts"
import { HTTPException } from 'npm:hono/http-exception'
import * as semver from 'npm:semver'
import { Hono, Context } from "npm:hono";

function _checkSemver(version: string, sver: string) {
    if(sver === 'compatible')
        sver = env.PLUGINS_API_VERSION
    if(sver && sver != "latest" && sver != 'all') {
        return semver.satisfies(version, sver)
    }
    return true
}

export function addRoutes(app: Hono) {
    app.get('/trex/plugins', authn, authz, async (c: Context) => {
        const p = await Plugins.get();
        const q = c.req.query('version') || 'compatible'

        const instplugins = (await p.getPlugins())["rows"];
        if(q === 'none')
            return  c.json(instplugins);

        const pkgs =  await fetch(`https://feeds.dev.azure.com/data2evidence/d2e/_apis/packaging/Feeds/d2e/packages?api-version=7.1&includeDescription=true`)
        const pkgs_json = await pkgs.json();
        const tmp = pkgs_json.value.map((pkg:any) => {
            const pkgname = pkg.name.replace(`@${env.GH_ORG}/`, ""); 
            const version = pkg.versions.reduce((m: any, c: any) => { return c["version"] > m["version"] && _checkSemver(c["version"], q) ? c : m }, {version:"", packageDescription:""});
            const installed_plugin = instplugins.filter((p: any) => p.name === pkgname)
            const r = {name: pkgname, description: version.packageDescription, registry_version: version.version, version: installed_plugin[0]?.version, url: installed_plugin[0]?.url, installed: installed_plugin[0] ? true: false}
            return r;

        });
        const not_listed_plugins = instplugins.filter((e: any) =>  tmp.filter((p :any) => p.name === e.name).length<1).map((p: any) => {p["installed"]= true; return p})
        return c.json(tmp.concat(not_listed_plugins))
    });

    app.patch('/trex/plugins', authn, authz, async (c: Context) => {
        Plugins.initPlugins(app);
    })

    app.post('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const p = await Plugins.get();
        let name = c.req.param('name');
        if(await p.isInstalled(name))
            throw new HTTPException(500, { message: `${name} is already installed` })
        try {
            await p.addPluginPackage(app, name)
        } catch(e) {
            logger.error(`${name} failed to install plugin ${JSON.stringify(e)}`)
            throw new HTTPException(500, { message: `${name} failed to install plugin` })
        }
        const gp = (await p.getPlugins())["rows"]
        return c.json(gp);
    });

    app.put('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const p = await Plugins.get();
        const name = c.req.param('name');
        try {
            await p.addPluginPackage(app, name, true)
        } catch(e) {
            logger.error(`${name} failed to install plugin ${JSON.stringify(e)}`)
            throw new HTTPException(500, { message: `${name} failed to update plugin` })
        }
        const gp = (await p.getPlugins())["rows"]
        return c.json(gp);
    });

    app.delete('/trex/plugins/:name', authn, authz, async (c: Context) => {
        const p = await Plugins.get();
        const name = c.req.param('name');
        try {
            p.delete(name);
        } catch(e) {
            logger.error(`${name} failed to delete plugin ${JSON.stringify(e)}`)
            throw new HTTPException(500, { message: `${name} failed to delete plugin` })
        }
        return c.json({"message": "ok"});
    })

}
