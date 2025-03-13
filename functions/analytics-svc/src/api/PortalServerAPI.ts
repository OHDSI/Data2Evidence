import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env";
import { Logger } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import http from "node:http";
let logger = CreateLogger("analytics-log");
export default class PortalServerAPI {
    private readonly baseUrl: string;
    private readonly oauthUrl: string;
    private agent: any;

    constructor() {
        this.baseUrl = env.SERVICE_ROUTES.portalServer;
        this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
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

        const result = await axios.post(this.oauthUrl, data, options);

        return `Bearer ${result.data.access_token}`;
    }

    async getPublicStudies() {
        const result = await axios.get(`${this.baseUrl}/dataset/public/list`, {httpAgent: this.agent});
        return result.data;
    }

    async getStudy(token: string, datasetId: string) {
        const options = await this.getRequestConfig(token);
        const result = await axios.get(
            `${this.baseUrl}/dataset?datasetId=${datasetId}`,
            options
        );
        return result.data;
    }

    async getStudies(token: string) {
        const options = await this.getRequestConfig(token);
        const result = await axios.get(`${this.baseUrl}/dataset/list`, options);
        return result.data;
    }

    async getBookmarkById(
        token: string,
        bookmarkId: string,
        datasetId: string
    ): Promise<any> {
        try {
            const options = await this.getRequestConfig(token);
            const url = `${this.baseUrl}/user-artifact/bookmarks/${bookmarkId}?datasetId=${datasetId}`;
            const result = await axios.get(url, options);
            return result.data;
        } catch (error) {
            console.error(error);
            logger.error(`Error while getting user artifacts for Bookmarks`);
            throw new Error(`Error while getting user artifacts for Bookmarks`);
        }
    }

    async updateBookmark(
        token: string,
        bookmark: any,
        datasetId: string
    ): Promise<any> {
        try {
            const options = await this.getRequestConfig(token);

            const updateBookmarkDto = {
                id: bookmark.id,
                serviceArtifact: bookmark,
            };
            const url = `${this.baseUrl}/user-artifact/bookmarks?datasetId=${datasetId}`;
            const result = await axios.put(url, updateBookmarkDto, options);
            return result.data;
        } catch (error) {
            console.error(error);
            logger.error(`Error while updating Bookmark`);
            throw new Error(`Error while updating Bookmark`);
        }
    }
}
