import { env } from "../env";
import { Logger } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
let logger = CreateLogger("analytics-log");
export default class PortalServerAPI {
    private readonly baseUrl: string;
    private readonly oauthUrl: string;
    private portalapi;

    constructor() {
        this.baseUrl = env.SERVICE_ROUTES.portalServer;
        this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
        if (!this.baseUrl) {
            throw new Error("Portal Server URL is not configured!");
        }
        this.portalapi = Trex.tokioChannel("d2e-functions/portal");
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

    async getPublicStudies() {
        const result = await this.portalapi.get(`${this.baseUrl}/dataset/public/list`);
        return result.data;
    }

    async getStudy(datasetId: string) {
        const result = await this.portalapi.get(
            `${this.baseUrl}/dataset?datasetId=${datasetId}`,
            
        );
        return result.data;
    }

    async getStudies() {
        const result = await this.portalapi.get(`${this.baseUrl}/dataset/list/systemadmin`);
        return result.data;
    }

    async getBookmarkById(
        bookmarkId: string,
        datasetId: string
    ): Promise<any> {
        try {
            const url = `${this.baseUrl}/user-artifact/bookmarks/${encodeURIComponent(bookmarkId)}?datasetId=${encodeURIComponent(datasetId)}`;
            const result = await this.portalapi.get(url);
            return result.data;
        } catch (error) {
            console.error(error);
            logger.error(`Error while getting user artifacts for Bookmarks`);
            throw new Error(`Error while getting user artifacts for Bookmarks`);
        }
    }

    async updateBookmark(
        bookmark: any,
        datasetId: string
    ): Promise<any> {
        try {
            const updateBookmarkDto = {
                id: bookmark.id,
                serviceArtifact: bookmark,
            };
            const url = `${this.baseUrl}/user-artifact/bookmarks?datasetId=${datasetId}`;
            const result = await this.portalapi.put(url, updateBookmarkDto);
            return result.data;
        } catch (error) {
            console.error(error);
            logger.error(`Error while updating Bookmark`);
            throw new Error(`Error while updating Bookmark`);
        }
    }
}
