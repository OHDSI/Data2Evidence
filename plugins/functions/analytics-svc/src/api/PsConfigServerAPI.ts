import axios, { AxiosRequestConfig } from "axios";
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

        const data = Object.keys(params)
            .map(
                (key) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(
                        params[key]
                    )}`
            )
            .join("&");

        // External-capable IdP/OAuth endpoint — native fetch, not axios.
        // See trex/plans/2026-07-27-axios-to-fetch-minimal-v3.md
        const res = await fetch(this.oauthUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: data,
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            throw new Error(
                `OAuth token request failed with status ${res.status}: ${await res.text()}`
            );
        }
        const result = { data: await res.json() };

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
        // Internal service (SERVICE_ROUTES.psConfig). Intentionally still axios:
        // not on the external-HTTPS failure path.
        const result = await axios.post(
            `${this.baseUrl}/hc/hph/patient/app/services/config.xsjs`,
            body,
            options
        );
        return result.data;
    }
}
