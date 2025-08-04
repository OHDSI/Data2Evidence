import axios, { AxiosRequestConfig } from "axios";
import { env } from "../configs";
import { Logger } from "@alp/alp-base-utils";
import http from "node:http";
const log = Logger.CreateLogger("cdw-log");

export default class PortalServerAPI {
    private readonly baseUrl: string;
    private agent: any;

    constructor() {
        this.baseUrl = env.SERVICE_ROUTES.portalServer;
        this.agent = new http.Agent({ keepAlive: true });
        if (!this.baseUrl) {
            throw new Error("Portal Server URL is not configured!");
        }
    }

    private async getRequestConfig(token: string) {
        let options: AxiosRequestConfig = {};
        if (token) {
            options = {
                headers: {
                    Authorization: token,
                },
                httpAgent: this.agent,
            };
        }
        return options;
    }

    async getDataset(token: string, datasetId: string) {
        const options = await this.getRequestConfig(token);
        const result = await axios.get(
            `${this.baseUrl}/dataset?datasetId=${datasetId}`,
            options
        );
        return result.data;
    }
}
