import { env } from "../env";
import http from "node:http";

export default class PortalServerAPI {
    private readonly baseUrl: string;
    private readonly oauthUrl: string;
    private agent: any;
    private portalapi;

    constructor() {
        this.baseUrl = env.SERVICE_ROUTES.portalServer;
        this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
        this.agent = new http.Agent({ keepAlive: true });
        if (!this.baseUrl) {
            throw new Error("Portal Server URL is not configured!");
        }
        this.portalapi = Trex.tokioChannel("d2e-functions/portal");
    }

    private async getRequestConfig(token: string) {
        let options = {};
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

    async getClientCredentialsToken() {
        const params = {
            grant_type: "client_credentials",
            client_id: env.IDP__ALP_SVC__CLIENT_ID,
            client_secret: env.IDP__ALP_SVC__CLIENT_SECRET,
        };

        const options = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            httpAgent: this.agent,
        };

        const data = Object.keys(params)
            .map(
                (key) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(
                        params[key]
                    )}`
            )
            .join("&");

        const result = await this.portalapi.post(this.oauthUrl, data, options);
        return `Bearer ${result.data.access_token}`;
    }
}
