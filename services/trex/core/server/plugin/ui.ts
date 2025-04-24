
import { serveStatic } from "npm:hono/deno";
import {env, global, logger} from "../env.ts"
import { Hono, Context } from "npm:hono";

function _addStatic(app: Hono, url: string, path: string) {
	logger.log(url + "   " + path);
	app.use(url+"/*", serveStatic({root: path, 
		rewriteRequestPath: (path: string) => {if(path == "/portal/login-callback") return ""; else return path.replace(new RegExp(`^${url}`), '')}, 
		onNotFound: (path: string, c: Context) => {
			logger.log(`${path} is not found, you access ${c.req.path}`);
		}
	}));
}

export function addPlugin(app: Hono, value: any, dir: string) {
    if(value.routes)
        value.routes.forEach((r: any) => {
            _addStatic(app, `${r.source}`, `${dir}${r.target}/`);
    });
    app.get('/', (c) => { return c.redirect(`/portal/`) })
    app.use('/portal/login', serveStatic({path: `${dir}resources/portal/index.html`}));
    app.use('/portal/researcher/*', serveStatic({path: `${dir}resources/portal/index.html`}));
    app.use('/portal/systemadmin/*', serveStatic({path: `${dir}resources/portal/index.html`}));
    if(value.uiplugins) {
        const tmp = JSON.parse(global.PLUGINS_JSON);
        for(const [k,v] of Object.entries(value.uiplugins)) {
            if(tmp[k]) {
                tmp[k] = tmp[k].concat(v).filter((v: any, i: any, self: any) => self.map((x: any) => x["route"]).lastIndexOf(v["route"]) == i);
            } else {
                tmp[k] = v;
            }
        }
        global.PLUGINS_JSON = JSON.stringify(value.uiplugins).replace(/\$\$FQDN\$\$/g, env.CADDY__ALP__PUBLIC_FQDN);
        console.log(global.PLUGINS_JSON)
    }
}