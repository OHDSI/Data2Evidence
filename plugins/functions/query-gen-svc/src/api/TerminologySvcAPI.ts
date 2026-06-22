import http from "node:http";

import { env } from "../env";
import { parseConceptSetRef } from "../utils/conceptSetRef";
export default class TerminologySvcAPI {
    private readonly baseUrl: string;
    private readonly httpAgent: any;
    private terminologysvcapi;

    constructor() {
        if (env.SERVICE_ROUTES.terminology) {
            this.baseUrl = env.SERVICE_ROUTES.terminology;
            this.httpAgent = new http.Agent({ keepAlive: true });
        }
        if (!this.baseUrl) {
            throw new Error("Terminology Svc URL is not configured!");
        }
        this.terminologysvcapi = Trex.tokioChannel(
            "d2e-functions/terminology-svc"
        );
    }

    private async getRequestConfig(token: string) {
        let options: any = {
            httpAgent: this.httpAgent,
        };
        if (token) {
            options = {
                ...options,
                headers: {
                    Authorization: token,
                },
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
        console.time(`time-terminology-svc-getConceptIds-${timestamp}`);

        // Split incoming refs by source. terminology-svc only understands
        // bare-numeric (legacy) ids. WebAPI-sourced ids need a different
        // resolution path that isn't wired up yet — warn and skip.
        const refs = conceptSetIds.map((id) => parseConceptSetRef(id));
        const legacyExternalIds = refs
            .filter((r) => r.source === "legacy")
            .map((r) => r.externalId);
        const webapiExternalIds = refs
            .filter((r) => r.source === "webapi")
            .map((r) => r.externalId);

        if (webapiExternalIds.length > 0) {
            console.warn(
                `[query-gen-svc] Skipping ${webapiExternalIds.length} WebAPI-sourced concept set id(s) — terminology-svc resolution not yet implemented for that source. ids: ${webapiExternalIds.join(",")}`
            );
        }

        if (legacyExternalIds.length === 0) {
            console.timeEnd(`time-terminology-svc-getConceptIds-${timestamp}`);
            return [];
        }

        const options = await this.getRequestConfig(token);

        const data = { conceptSetIds: legacyExternalIds, datasetId };
        const result = await this.terminologysvcapi.post(
            `${this.baseUrl}/concept-set/included-concepts`,
            data,
            options
        );
        console.timeEnd(`time-terminology-svc-getConceptIds-${timestamp}`);
        return result.data as number[];
    }
}
