import axios, { AxiosRequestConfig } from "axios";
import https from "https";
import { env } from "../env";
export default class PsConfigServerAPI {
    private readonly baseUrl: string;
    private readonly oauthUrl: string;
    // private readonly httpsAgent: any;

    constructor() {
        if (env.SERVICE_ROUTES.psConfig) {
            this.baseUrl = env.SERVICE_ROUTES.psConfig;
            this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
            // this.httpsAgent = new https.Agent({
            //     rejectUnauthorized: true,
            //     ca: env.TLS__INTERNAL__CA_CRT?.replace(/\\n/g, "\n"),
            // });
        }
        if (!this.baseUrl) {
            throw new Error("PS Config Server URL is not configured!");
        }
    }

    private async getRequestConfig(token: string) {
        let options: AxiosRequestConfig = { 
            //httpsAgent: this.httpsAgent 
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

    async getClientCredentialsToken() {
        const params = {
            grant_type: "client_credentials",
            client_id: env.IDP__ALP_SVC__CLIENT_ID,
            client_secret: env.IDP__ALP_SVC__CLIENT_SECRET,
        };

        const options: AxiosRequestConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        };

        const data = Object.keys(params)
            .map(
                (key) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(
                        params[key]
                    )}`
            )
            .join("&");

        const result = await axios.post(this.oauthUrl, data, options);

        return `Bearer ${result.data.access_token}`;
    }

    async getCDWConfig({ action, configId, configVersion, lang }, token) {
        const options = await this.getRequestConfig(token);
        const body = {
            action,
            configId,
            configVersion,
            lang,
        };
        const result = await axios.post(
            `${this.baseUrl}/hc/hph/patient/app/services/config.xsjs`,
            body,
            options
        );
        return result.data;
    }
}
