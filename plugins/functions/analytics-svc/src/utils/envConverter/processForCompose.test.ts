import combinedJson from "./jsons/combinedJson.json";
import analyticsSvcForCompose from "./jsons/analyticsSvcForCompose.json";
import { CombinedEnv, HanaConfig, PostgresConfig } from "./types";
import {
    processForComposeAnalytics,
    filterServiceCredentials,
} from "./processForCompose.ts";
import { serviceNames } from "./processForCompose.ts";

const deepCopy = <T>(obj: any) => {
    return JSON.parse(JSON.stringify(obj)) as T;
};

describe("Analytics Config Selector", () => {
    it("should only pick those tagged with analytics", () => {
        const serviceCredentials = filterServiceCredentials(
            JSON.stringify(combinedJson),
            serviceNames.ANALYTICS_SVC
        );
        expect(
            processForComposeAnalytics(
                deepCopy<CombinedEnv>(serviceCredentials)
            )
        ).toEqual(
            analyticsSvcForCompose as unknown as (HanaConfig | PostgresConfig)[]
        );
    });
});
