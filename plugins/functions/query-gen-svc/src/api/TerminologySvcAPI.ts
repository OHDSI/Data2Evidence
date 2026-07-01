import http from "node:http";

import { env } from "../env";
export default class TerminologySvcAPI {
    private readonly baseUrl: string;
    private readonly d2eWebapiBaseUrl: string;
    private readonly httpAgent: any;
    private terminologysvcapi;
    private d2eWebapi;

    constructor() {
        if (env.SERVICE_ROUTES.terminology) {
            this.baseUrl = env.SERVICE_ROUTES.terminology;
            this.httpAgent = new http.Agent({ keepAlive: true });
        }
        if (env.SERVICE_ROUTES["d2e-webapi"]) {
            this.d2eWebapiBaseUrl = env.SERVICE_ROUTES["d2e-webapi"];
        }
        if (!this.baseUrl) {
            throw new Error("Terminology Svc URL is not configured!");
        }
        if (!this.d2eWebapiBaseUrl) {
            throw new Error("d2e-webapi Svc URL is not configured!");
        }
        this.terminologysvcapi = Trex.tokioChannel(
            "d2e-functions/terminology-svc"
        );
        this.d2eWebapi = Trex.tokioChannel("d2e-functions/d2e-webapi");
    }

    private async getRequestConfig(token: string, datasetId?: string) {
        let options: any = {
            httpAgent: this.httpAgent,
        };
        const headers: Record<string, string> = {};
        if (token) {
            headers.Authorization = token;
        }
        // d2e-webapi routes require the dataset via the `datasetid` header
        // (its datasetRoutes preHandler returns 400 without it).
        if (datasetId) {
            headers.datasetid = datasetId;
        }
        if (Object.keys(headers).length > 0) {
            options = {
                ...options,
                headers,
            };
        }
        return options;
    }

    async getConceptIds(
        conceptSetIds: string[],
        datasetId: string,
        token: string
    ): Promise<number[]> {
        const timestamp = new Date().valueOf();
        console.time(`time-d2e-webapi-getIncludedConcepts-${timestamp}`);

        if (conceptSetIds.length === 0) {
            console.timeEnd(`time-d2e-webapi-getIncludedConcepts-${timestamp}`);
            return [];
        }

        const options = await this.getRequestConfig(token, datasetId);
        const data = { conceptSetIds, datasetId };
        const result = await this.d2eWebapi.post(
            `${this.d2eWebapiBaseUrl}/conceptset/included-concepts`,
            data,
            options
        );
        console.timeEnd(`time-d2e-webapi-getIncludedConcepts-${timestamp}`);
        return (result.data as Array<{ CONCEPT_ID: number }>).map(
            (c) => c.CONCEPT_ID
        );
    }
}
