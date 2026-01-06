import { Logger, EnvVarUtils } from "@alp/alp-base-utils";
import { URL } from "url";
import { IMRIRequest, QuerySvcResultType } from "../types";
const log = Logger.CreateLogger("analytics-log");
const envVarUtils = new EnvVarUtils(Deno.env.toObject());
import { env } from "../env";

export async function generateQuery(
    req: IMRIRequest,
    payload,
    path: string = ""
): Promise<QuerySvcResultType> {
    const queryGenSvcApi = Trex.tokioChannel("d2e-functions/query-gen-svc");
    log.addRequestCorrelationID(req);
    let reqCorrelationId: string = "DUMMY_REQ_CORRELATION_ID";

    // Add datasetId to body as toplevel key for trex authz
    if (payload.queryParams?.datasetId) {
        payload["datasetId"] = payload.queryParams.datasetId;
    } else if (payload.configParams?.datasetId) {
        payload["datasetId"] = payload.configParams.datasetId;
    }
    const data = JSON.stringify(payload);

    const accessToken = req.headers.authorization;
    if (log.getRequestCorrelationID(req)) {
        reqCorrelationId = log.getRequestCorrelationID(req);
    }

    const defaultPath = `analytics-svc/api/services/query`;

    const pathName = path ? defaultPath + "/" + path : defaultPath;

    const sourceOrigin = req.headers["x-source-origin"];

    let urlParams;
    if (envVarUtils.isTestEnv() && !envVarUtils.isHttpTestRun()) {
        // this flow is only for integation test
        urlParams = new URL(pathName, `http://localhost:41008`);
    } else {
        urlParams = new URL(pathName, env.SERVICE_ROUTES.queryGen);
    }

    const options = {
        headers: {
            "Content-Type": "application/json",
            "auth-type": "azure-ad",
            "authorization": accessToken,
            "user-agent": "ALP Service",
            "x-source-origin": sourceOrigin,
            "x-req-correlation-id": reqCorrelationId,
        },
    };
    try {
        const response = await queryGenSvcApi.post(
            urlParams.toString(),
            data,
            options
        );
        if (response.status >= 200 && response.status <= 399) {
            return response.data as QuerySvcResultType;
        } else {
            log.error(JSON.stringify(response.data));
            throw response.data;
        }
    } catch (err) {
        log.enrichErrorWithRequestCorrelationID(err, req);
        log.error(`query generator error: ${err}`);
        throw err;
    }
}
