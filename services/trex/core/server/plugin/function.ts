import {env, global, logger} from "../env.ts"
import {waitfor} from "./utils.ts"
import * as LogtoAPI from '../api/LogtoAPI.ts'
import { authn } from "../auth/authn.ts"
import { authz } from "../auth/authz.ts";
import { Hono, Context } from "npm:hono";
import { proxy } from 'npm:hono/proxy'

import { STATUS_CODE } from 'https://deno.land/std/http/status.ts';

function substituteEnvVars(input: string): string {
	let result = input;
	let maxIterations = 10;
	let iteration = 0;
	while (iteration < maxIterations) {
		const beforeSubstitution = result;
		result = processVariables(result);
		if (result === beforeSubstitution) {
			break;
		}
		iteration++;
	}
	if (iteration >= maxIterations) {
		console.warn(`Warning: Maximum iterations (${maxIterations}) reached for variable substitution. Possible circular reference in: ${input}`);
	}
	return result;
}

function processVariables(input: string): string {
	let result = "";
	let i = 0;
	
	while (i < input.length) {
		if (input[i] === '$' && input[i + 1] === '{') {
			const varStart = i;
			const varContentStart = i + 2;
			let braceCount = 1;
			let j = varContentStart;
			
			while (j < input.length && braceCount > 0) {
				if (input[j] === '{') {
					braceCount++;
				} else if (input[j] === '}') {
					braceCount--;
				}
				j++;
			}
			
			if (braceCount === 0) {
				const varExpression = input.substring(varContentStart, j - 1);
				const substituted = substituteVariable(varExpression);
				result += substituted;
				i = j;
			} else {
				result += input[i];
				i++;
			}
		} else {
			result += input[i];
			i++;
		}
	}
	return result;
}

function substituteVariable(varExpression: string): string {
	const operatorMatch = varExpression.match(/^([^:?+-]+)([:+-]?[?+-])(.*)$/);
	
	if (operatorMatch) {
		const [, varName, operator, operand] = operatorMatch;
		const envValue = Deno.env.get(varName);
		const isSet = envValue !== undefined;
		const isNonEmpty = isSet && envValue !== "";
		
		switch (operator) {
			case ":-":
				return isNonEmpty ? envValue : operand;
			case "-":
				return isSet ? envValue : operand;
			case ":?":
				if (!isNonEmpty) {
					throw new Error(operand || `${varName}: parameter null or not set`);
				}
				return envValue;
			case "?":
				if (!isSet) {
					throw new Error(operand || `${varName}: parameter not set`);
				}
				return envValue;
			case ":+":
				return isNonEmpty ? operand : "";
			case "+":
				return isSet ? operand : "";
			default:
				return "${" + varExpression + "}";
		}
	} else {
		const envValue = Deno.env.get(varExpression);
		if(envValue == undefined ) console.log(`### ENV UNDEFINED ${varExpression}`);
		return envValue !== undefined ? envValue : "";
	}
}

function substituteEnvVarsInObject(obj: any): any {
	if (typeof obj === 'string') {
		return substituteEnvVars(obj);
	} else if (Array.isArray(obj)) {
		return obj.map(item => substituteEnvVarsInObject(item));
	} else if (obj !== null && typeof obj === 'object') {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = substituteEnvVarsInObject(value);
		}
		return result;
	}
	return obj;
}

const fnmap = {}

Trex.createRequestListener(async (message, respond) => {
	try {

		if (!message || !message.request) {
			respond({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				headers: { 'Content-Type': 'application/json' },
				body: { error: 'Invalid message structure' }
			});
			return;
		}
		
		const httpRequest = message.request;
		
		const httpResponse = await fnmap[message.service]?.(httpRequest);
		if (httpResponse instanceof Response) {		
			const responseBody = await httpResponse.text();
			const responseData = {
				body: responseBody,
				status: httpResponse.status,
				statusText: httpResponse.statusText,
				ok: httpResponse.ok,
				headers: Object.fromEntries(httpResponse.headers.entries()),
				url: httpResponse.url
			};
			respond(responseData);
		} else {
			respond(httpResponse);
		}
	} catch (error) {
		respond({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			headers: { 'Content-Type': 'application/json' },
			body: { error: error.message }
		});
	}
});

const headers = new Headers({
	'Content-Type': 'application/json',
});

const getFullyQualifiedUserFunctionName = (function_name: string) => {
	return (function_name.toUpperCase().startsWith(env.PROJECT_NAME.toUpperCase()) ? function_name : `${env.PROJECT_NAME}-${function_name}`) // Add Project prefix if not exists
}

async function _callInit (servicePath: string, imports: any, fnEnv: any, xenv: any, eszip: string, dir: string) {
	const TREX_CURRENT_USER_FUNCTION_NAME = getFullyQualifiedUserFunctionName(fnEnv)
	const myenv = Object.assign({ TREX_CURRENT_USER_FUNCTION_NAME }, xenv["_shared"], fnEnv in xenv ? xenv[fnEnv] : {}, {SERVICE_ROUTES: env.SERVICE_ROUTES, TREX_FUNCTION_PATH: `/usr/src/${dir}`})
	const _myenv =  Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fnEnv] || false; 
	const options: any = {servicePath: servicePath, memoryLimitMb: 1000,
		workerTimeoutMs: 1 * 60 * 3000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 100000, cpuTimeHardLimitMs: 200000,
		decoratorType: "typescript_with_metadata" ,
		allowHostFsAccess: true,
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
    
async function _callWorker (req: any, servicePath: string, imports: any, fncfg: any, dir: string, xenv: any) {
	const TREX_CURRENT_USER_FUNCTION_NAME = getFullyQualifiedUserFunctionName(fncfg.env);
	const myenv = Object.assign({ TREX_CURRENT_USER_FUNCTION_NAME }, xenv["_shared"], fncfg.env in xenv ? xenv[fncfg.env] : {}, {SERVICE_ROUTES: env.SERVICE_ROUTES, DB_CREDENTIALS__PRIVATE_KEY: env.DB_CREDENTIALS__PRIVATE_KEY, TREX_FUNCTION_PATH: `/usr/src/${dir}`})
	const _myenv = Object.keys(myenv).map((k) => [k, typeof(myenv[k])==="string"? myenv[k]:JSON.stringify(myenv[k])]);
	const watch = env.WATCH[fncfg.env] || false; 

	const options: any = {servicePath: servicePath, memoryLimitMb: 1000,
		workerTimeoutMs: env.WATCH[fncfg.env] ? 1 * 60 * 1000 : 30 * 60 * 1000, noModuleCache: false,
		importMapPath: imports, envVars: _myenv,
		forceCreate: env._FORCE_CREATE || watch, netAccessDisabled: false, 
		cpuTimeSoftLimitMs: 1000000, cpuTimeHardLimitMs: 2000000,
		decoratorType: "typescript_with_metadata",
		allowHostFsAccess: true,
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

function _addFunction(app: Hono, url: string, path: string, imports: any, fncfg: any, dir: string, name: string, xenv: any) {
	fnmap[`${name}${fncfg.function}`] = (req) => _callWorker(req, `${path}`, imports, fncfg, dir, xenv);
	app.all(url+"/*", authn, authz, (c: Context) =>  {
		const isWs = c.req.header("upgrade")?.toLowerCase() === "websocket";
		const urlObj = new URL(c.req.raw.url);
		const match = urlObj.pathname.match(
        /^\/strategus-results\/([^/]+)\/websocket\/?$/
      );
		if (isWs && match) {
			const req = c.req.raw;
			const studyId = match[1];
			const { socket, response } = Deno.upgradeWebSocket(req);
			const serviceUrl = `ws://${encodeURIComponent(studyId)}:3838/websocket`;
			const serviceWebSocketConnection = new WebSocket(serviceUrl);

			socket.onmessage = (event) => {
				if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
				serviceWebSocketConnection.send(event.data);
				}
			};

			socket.onclose = () => {
				if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
				serviceWebSocketConnection.close();
				}
			};

			socket.onerror = (event) => {
				logger.error(`WebSocket connection request failed: ${event}`);
				if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
				serviceWebSocketConnection.close(1011, "Client socket error");
				}
				if (socket.readyState === WebSocket.OPEN) {
				socket.close();
				}
			};

			serviceWebSocketConnection.onclose = () => {
				if (socket.readyState === WebSocket.OPEN) {
				socket.close();
				}
			};

			serviceWebSocketConnection.onmessage = (event) => {
				if (socket.readyState === WebSocket.OPEN) {
				socket.send(event.data);
				}
			};

			serviceWebSocketConnection.onerror = (event) => {
				logger.error(`WebSocket connection to service failed: ${event}`);
				if (
				socket.readyState === WebSocket.OPEN ||
				socket.readyState === WebSocket.CONNECTING
				) {
				socket.close(1011, "Service WebSocket connection error");
				}
			};

      		return response;
		}
		return _callWorker(c.req.raw, `${path}`, imports, fncfg, dir, xenv)
	});
}

function _addService(app: Hono, url: string, service: string, rmsrc: boolean) {
	const service_url = env.SERVICE_ROUTES[service];
	let postfix =""
	if(!url.endsWith("*")) {
		postfix = "/*";
	}
	app.all(url+postfix, authn, authz, async (c: Context) => {

    const isWs = c.req.header("upgrade")?.toLowerCase() === "websocket";

    if (isWs) {
      const req = c.req.raw;
      const url = new URL(c.req.url);
      const { hostname, port } = new URL(service_url);
      const serviceUrl = `ws://${hostname}:${port}${url.pathname}${url.search}`;

      const { socket, response } = Deno.upgradeWebSocket(req);
      const serviceWebSocketConnection = new WebSocket(serviceUrl);

      socket.onmessage = (event) => {
        if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
          serviceWebSocketConnection.send(event.data);
        }
      };

      socket.onclose = () => {
        if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
          serviceWebSocketConnection.close();
        }
      };

      socket.onerror = (event) => {
        logger.error(`WebSocket connection request failed: ${event}`);
        if (serviceWebSocketConnection.readyState === WebSocket.OPEN) {
          serviceWebSocketConnection.close(1011, "Client socket error");
        }
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };

      serviceWebSocketConnection.onclose = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };

      serviceWebSocketConnection.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };

      serviceWebSocketConnection.onerror = (event) => {
        logger.error(`WebSocket connection to service failed: ${event}`);
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1011, "Service WebSocket connection error");
        }
      };

      return response;
    }

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

async function _addInit(path: string, imports: any, fnenv: any, xenv: any, eszip: string, dir: string, waitforurl: string) {
	if(waitforurl)
		await waitfor(waitforurl);
	_callInit(`${path}`, imports, fnenv, xenv, eszip, dir);
}

export async function addPlugin(app: Hono, value: any, dir: string, name: string) {
	const xenv = substituteEnvVarsInObject(value.env || {});
    if(value.init) {
        for(const r of value.init) {
            if(r.function) {
                logger.log(`add init fn @ ${dir}${r.function}`)
                _addInit(`${dir}${r.function}`,
                    r.imports?  (r.imports.indexOf(":")<0 ? `${dir}${r.imports}` : r.imports) : null,
                    r.env,
					xenv,
					r.eszip ? r.eszip : null, dir,
                    r.waitfor ?? (r.waitforEnvVar ? (env[r.waitforEnvVar] ?? Deno.env.get(r.waitforEnvVar)) : "")); //Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])
                if (r.delay) await new Promise(resolve => setTimeout(resolve, r.delay));
                logger.log(`add init fn done @ ${dir}${r.function}`)

            }
        }
    }
    if(value.roles) {
		Object.entries(value.roles).forEach(async ([name, cfg]) => {
			let _name;
			if(name === "IDP_ALP_SVC_CLIENT_ID")
				_name = env.IDP_ALP_SVC_CLIENT_ID;
			else if(name === "IDP_ALP_DATA_CLIENT_ID")
				_name = env.IDP_DATA_SVC_CLIENT_ID;
			else
				_name = name
			if(global.ROLE_SCOPES[_name]) 
				global.ROLE_SCOPES[_name]= global.ROLE_SCOPES[_name].concat(cfg).filter((v: any, i: any, self: any) => self.lastIndexOf(v) == i);
			else {
            	global.ROLE_SCOPES[_name] = cfg;
				const roleName = _name
				// Create the Logto role when the role doesn't exist
				try {
					const result = await LogtoAPI.createLogtoRole(roleName);
					if (result.status === 200) {
						logger.info(`Created Logto role: ${roleName}`);
					} else if (result.status === 422) {
						logger.info(`Logto role '${roleName}' exists`);
					} else {
						logger.info(`Logto role creation for '${roleName}' returned status ${result.status}: ${JSON.stringify(result.data)}`);
					}
				} catch (err) {
					logger.error(`Failed to create Logto role '${roleName}': ${err}`);
				}
			}
		});
    }
    if(value.scopes) {
        global.REQUIRED_URL_SCOPES = global.REQUIRED_URL_SCOPES.concat(value.scopes);
		try {
			await LogtoAPI.createLogtoApisAndScopes(value.scopes);
		} catch (error) {
			logger.error(`Failed to create Logto APIs and scopes: ${error}`);
		}
    }
    
    if(value.api)
        value.api.forEach(r => {
        if(r.function) {
            logger.log(`add fn ${r.source} @ ${dir}${r.function}`)
            _addFunction(app, r.source, `${dir}${r.function}`, 
            r.imports?  (r.imports.indexOf(":")<0 ? `${dir}${r.imports}` : r.imports) : null,
            r, dir, name, xenv);
        } else if (r.service) {  
            logger.log(`add svc ${r.source} @ ${r.service}`)
            _addService(app, r.source, r.service, r.rmsrc);
        } else {
            logger.error("unknown  route type");
        }
    });
}