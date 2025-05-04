

import {env, logger} from "../env.ts"
import {waitfor} from "./utils.ts"

export async function addPlugin(value: any) {
	try {
		if(!env.PREFECT_API_URL) {
			logger.error("Prefect URL not defined: skipping flow plugins");
		}
		await waitfor(env.PREFECT_HEALTH_CHECK);
		while(!await hasWorkerPool()) {
			logger.log(`waiting for creation of worker pool ...`)
			await new Promise(resolve => setTimeout(resolve, 3000));
		}
		if(value.flows)
			value.flows.forEach(async (f: any) => {
				const res = await fetch(`${env.PREFECT_API_URL}/flows/`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						name: f.name
					})
				});
				if(res.status <200 || res.status > 202){
					logger.error(`Error creating flow ${f.name} - ${res.status} ${res.statusText}`);
					logger.error(JSON.stringify(await res.json()));

				} else {
					const jres = await res.json();
					const body: any = {
						name: f.name,
						flow_id: jres.id,
						work_pool_name: env.PREFECT_POOL,
						work_queue_name: "default",
						entrypoint: f.entrypoint,
						enforce_parameter_schema: false,
						job_variables: {
							image: value.image ? `${value.image}:${env.PLUGINS_IMAGE_TAG}` : f.image,
							image_pull_policy: env.PLUGINS_PULL_POLICY,
							volumes: env.PREFECT_DOCKER_VOLUMES,
							networks: [env.PREFECT_DOCKER_NETWORK]
						},
						tags: f.tags,
					};
					if(f.parameter_openapi_schema) body["parameter_openapi_schema"] = f.parameter_openapi_schema
					const res2 = await fetch(`${env.PREFECT_API_URL}/deployments/`, {
					method: "POST",
					headers: { 
						"Content-Type": "application/json"
					},
					body: JSON.stringify(body)
					});
					if(res2.status <200 || res2.status > 202) {
						logger.error(`Error creating deployment ${f.name} - ${res2.status} ${res2.statusText}`);
						logger.error(JSON.stringify(await res2.json()));
					}
					else
						logger.log(`>FLOW< Successfully deployed ${f.name}`);
				}
		});
	} catch (e) {
		logger.log(e);
	}
}

async function hasWorkerPool() {
	logger.debug(`GET: ${env.PREFECT_POOL} from prefect`)
	const resp = await fetch(
		`${env.PREFECT_API_URL}/work_pools/${env.PREFECT_POOL}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		}
	)
	if(resp.status < 200 || resp.status > 202) {
		logger.info(`${env.PREFECT_POOL} pool is not found`)
		return false
	}
	return true
}