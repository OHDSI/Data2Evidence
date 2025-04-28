import {env, global, logger} from "../env.ts"
import {waitfor} from "./utils.ts"
import { authn } from "../auth/authn.ts"
import { authz } from "../auth/authz.ts";
import { Hono, Context } from "npm:hono";
import { proxy } from 'npm:hono/proxy'

import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';

const headers = new Headers({
	'Content-Type': 'application/json',
});


async function _callInit (servicePath: string, imports: any, fnEnv: any, eszip: string, dir: string) {
	const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[fnEnv])
	const _myenv =  Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fnEnv] || false; 
	const options: any = {servicePath: servicePath, memoryLimitMb: 150,
		workerTimeoutMs: 1 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" 
	}
	if(eszip) {
		logger.log(`ESZIP ${dir}${eszip} %%% ${options["importMapPath"]}`)
		options["maybeEszip"] = await Deno.readFile(`${dir}${eszip}`);
	}
	try { 
		const worker = await Trex.userWorkers.create(options);
	} catch (e) {
		logger.error(e);

		if (e instanceof Deno.errors.WorkerRequestCancelled) {
			headers.append('Connection', 'close');			
		}
		const error = { msg: e.toString() };
	}
	return;
}
    
async function _callWorker (req: any, servicePath: string, imports: any, fncfg: any, dir: string) {
	const myenv = Object.assign({}, env.SERVICE_ENV["_shared"], env.SERVICE_ENV[fncfg.env], {DB_CREDENTIALS__PRIVATE_KEY: env.DB_CREDENTIALS__PRIVATE_KEY})
	const _myenv = Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fncfg.env] || false; 

	const options: any = {servicePath: servicePath, memoryLimitMb: 1000,
		workerTimeoutMs: env.WATCH[fncfg.env] ? 1 * 60 * 1000 : 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 1000000, cpuTimeHardLimitMs: 2000000,
		decoratorType: "typescript_with_metadata" 
	}
	if(fncfg.eszip) {
		logger.log(`ESZIP ${dir}${fncfg.eszip} %%% ${options["importMapPath"]}`)
		options["maybeEszip"] = await Deno.readFile(`${dir}${fncfg.eszip}`);
	}
	try { 
		const worker = await Trex.userWorkers.create(options);

		const controller = new AbortController();

		const signal = controller.signal;
		return await worker.fetch(req, { signal });
	} catch (e: any) {
		logger.error(e);

		if (e instanceof Deno.errors.WorkerRequestCancelled) {
			headers.append('Connection', 'close');			
		}

		const error = { msg: e.toString() };
		return new Response(
			JSON.stringify(error),
			{
				status: STATUS_CODE.InternalServerError,
				headers,
			},
		);
	}
};

function _addFunction(app: Hono, url: string, path: string, imports: any, fncfg: any, dir: string) {
	app.all(url+"/*", authn, authz, (c: Context) =>  _callWorker(c.req.raw, `${path}`, imports, fncfg, dir));
}

function _addService(app: Hono, url: string, service: string, rmsrc: boolean) {
	const service_url = env.SERVICE_ROUTES[service];
	let postfix =""
	if(!url.endsWith("*")) {
		postfix = "/*";
	}
	app.all(url+postfix, authn, authz, async (c: Context) => {

		let newHeaders = new Headers(c.req.raw.headers)
		newHeaders.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
		const path = rmsrc? c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/').replace(url,'') : c.req.raw.url.replace(/^[^#]*?:\/\/.*?\//,'/');
		let req = {headers: newHeaders, method: c.req.method, body: c.req.raw.body};
		/*if(path.startsWith("/oidc/auth")) {
			req.redirect = 'manual';
		} else {
			req.redirect = 'follow';
		}
		return proxy(`${service_url}${path}`, req)*/

		const res = await fetch(`${service_url}${path}`,req )
		return res;
	});
}

async function _addInit(path: string, imports: any, env: any, eszip: string, dir: string, waitforurl: string) {
	if(waitforurl)
		await waitfor(waitforurl);
	_callInit(`${path}`, imports, env, eszip, dir);
}

export async function addPlugin(app: Hono, value: any, dir: string) {
    if(value.init) {
        for(const r of value.init) {
            if(r.function) {
                logger.log(`add init fn @ ${dir}${r.function}`)
                _addInit(`${dir}${r.function}`,
                    r.imports?  (r.imports.indexOf(":")<0 ? `${dir}${r.imports}` : r.imports) : null,
                    r.env,
					r.eszip ? r.eszip : null, dir,
                    r.waitfor); //Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])
                if (r.delay) await new Promise(resolve => setTimeout(resolve, r.delay));
                logger.log(`add init fn done @ ${dir}${r.function}`)

            }
        }
    }
    if(value.roles) {
        for(const [name, cfg] of Object.entries(value.roles)) {
			let _name;
			if(name === "IDP_ALP_SVC_CLIENT_ID")
				_name = env.IDP_ALP_SVC_CLIENT_ID;
			else if(name === "IDP_ALP_DATA_CLIENT_ID")
				_name = env.IDP_DATA_SVC_CLIENT_ID;
			else
				_name = name
			if(global.ROLE_SCOPES[_name]) 
				global.ROLE_SCOPES[_name]= global.ROLE_SCOPES[_name].concat(cfg).filter((v: any, i: any, self: any) => self.lastIndexOf(v) == i);
			else 
            	global.ROLE_SCOPES[_name] = cfg;
        }

    }
    if(value.scopes) {
        global.REQUIRED_URL_SCOPES = global.REQUIRED_URL_SCOPES.concat(value.scopes)
    }
    
    if(value.api)
        value.api.forEach(r => {
        if(r.function) {
            logger.log(`add fn ${r.source} @ ${dir}${r.function}`)
            _addFunction(app, r.source, `${dir}${r.function}`, 
            r.imports?  (r.imports.indexOf(":")<0 ? `${dir}${r.imports}` : r.imports) : null,
            r, dir);
        } else if (r.service) {  
            logger.log(`add svc ${r.source} @ ${r.service}`)
            _addService(app, r.source, r.service, r.rmsrc);
        } else {
            logger.error("unknown  route type");
        }
    }); 
}