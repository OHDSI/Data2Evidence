import axios, { AxiosRequestConfig } from "axios";
import http from "node:http";

import { env } from "../env";
export default class TerminologySvcAPI {
    private readonly baseUrl: string;
    private readonly httpAgent: any;

    constructor() {
        if (env.SERVICE_ROUTES.terminology) {
            this.baseUrl = env.SERVICE_ROUTES.terminology;
            this.httpAgent = new http.Agent({ keepAlive: true })
        }
        if (!this.baseUrl) {
            throw new Error("Terminology Svc URL is not configured!");
        }
    }

    private async getRequestConfig(token: string) {
        let options: AxiosRequestConfig = { 
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
        const timestamp = (new Date()).valueOf();
        console.time(`time-terminology-svc-getConceptIds-${timestamp}`)
    
        const options = await this.getRequestConfig(token);

        const data = { conceptSetIds, datasetId };
        const result = await axios.post(
            `${this.baseUrl}/concept-set/included-concepts`,
            data,
            options
        );
        console.timeEnd(`time-terminology-svc-getConceptIds-${timestamp}`)
        return result.data as number[];
    }
}
