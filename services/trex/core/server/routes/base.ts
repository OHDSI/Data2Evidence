import {env, logger} from "../env.ts"
import { exchangeToken } from "../auth/token.ts"
import * as jwt  from "npm:jsonwebtoken"
import { Hono, Context } from "npm:hono";

const headers = new Headers({
	'Content-Type': 'application/json',
});
 
const getDecodedToken = (req: any) => {
	const authHeader = req.headers["authorization"]
	if (!authHeader) {
	  return null
	}
	const token = authHeader.replace(/bearer /i, '')
	const decodedToken = jwt.decode(token) as jwt.JwtPayload
  
	return decodedToken
  }

export function addRoutes(app: Hono) {
    app.get('/_internal/health', () => {
		return new Response(
		JSON.stringify({ 'message': 'ok' }),
		{
			status: 200,
			headers,
		}) 
	}
    );

    app.use("*", async (c: Context, next: any) => {
        c.req.raw.headers["host"] ? c.req.raw.headers['x-source-origin'] = env.GATEWAY_WO_PROTOCOL_FQDN : null;
        let x = new Headers(c.req.raw.headers)
        x.append('x-source-origin', env.GATEWAY_WO_PROTOCOL_FQDN)
        let y: any = {method: c.req.raw.method, headers: x, redirect: c.req.raw.redirect, body: c.req.raw.body};
        const token = getDecodedToken(c.req.raw);
        if(token && token[getDecodedToken(c.req.raw)] != null) {
            y["user"] = {sub: getDecodedToken(c.req.raw)[env.GATEWAY_IDP_SUBJECT_PROP]};
        }
        let r = new Request(c.req.raw.url, y);
        Trex.applySupabaseTag(c.req.raw, r);
        c.req.raw = r;
        await next(); 
    });

    app.post('/oauth/token', async (c: Context) => {
        logger.log('Exchange code with oauth token')
      
        const params = new URLSearchParams()
    
        const b = await c.req.formData();
        
    
        for (const [key, value] of b.entries()) {
            params.append(key, value)
        }
        try {
          const token = await exchangeToken(params)
          return c.json(token)
        } catch (error) {
          logger.error(`Error when exchanging code with token: ${error}`)
          return c.status(500)
        }
      })

      app.get('/_internal/metric', async () => { 
        const e = await Trex.getRuntimeMetrics();
        return Response.json(e);
    });

}
