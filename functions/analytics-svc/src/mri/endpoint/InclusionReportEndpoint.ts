/**
 * Request processor for the aggregation endpoint (e.g. for the bar-chart).
 */
import { QueryObject as qo, Logger } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { QuerySvcResultType } from "../../types";
import { BaseQueryEngineEndpoint } from "./BaseQueryEngineEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import { PatientCountEndpoint } from "./PatientCountEndpoint";

const log = Logger.CreateLogger("analytics-log");

const TOTAL_PATIENt_COUNT_BOOKMARK_STR = JSON.stringify({
    filter: {
        configMetadata: {
            id: "CONFIG_ID",
            version: "CONFIG_VERSION",
        },
        cards: {
            type: "BooleanContainer",
            op: "AND",
            content: [
                {
                    type: "BooleanContainer",
                    op: "OR",
                    content: [],
                },
            ],
        },
    },
    axisSelection: [],
    metadata: {
        version: 3,
    },
    datasetId: "DATASET_ID",
});
interface BaseInclusionRuleStat {
    countSatisfying: number;
    countExcluded: number;
    name: string;
    id: number;
    isExclude: boolean;
}
interface InclusionRuleStat {
    countSatisfying: number;
    percentSatisfying: string;
    percentExcluded: string;
    name: string;
    id: number;
    isExclude: boolean;
}
interface AttritionStat {
    id: number;
    name: string;
    isExclude: boolean;
    cumulativeCountSatisfying: number;
}
interface TreemapData {
    name: string;
    children: TreemapDataChildren[];
}

interface TreemapDataChildren {
    name: string;
    children: TreemapNodeChildren[];
}

interface TreemapNodeChildren {
    name: string;
    size: number;
}

interface InterfaceReportResults {
    treemapData: TreemapData;
    inclusionRuleStats: InclusionRuleStat[];
    summary: {
        percentMatched: string;
        lostCount: number;
        finalCount: number;
        baseCount: number;
    };
}

interface SelectiveInclusiveReportResults {
    summary: {
        baseCount: number;
        finalCount: number;
        lostCount: number;
        percentMatched: string;
    };
    attritionStats: AttritionStat[];
}

export class InclusionReportEndpoint extends BaseQueryEngineEndpoint {
    constructor(connection: ConnectionInterface, unitTestMode?: boolean) {
        super(connection, unitTestMode ? unitTestMode : false);
    }

    public processRequest(
        req,
        configId,
        configVersion,
        datasetId,
        mriquery,
        language
    ): Promise<InterfaceReportResults> {
        log.addRequestCorrelationID(req);
        return new Promise(async (resolve, reject) => {
            try {
                const inclusionReportFiltercards =
                    this.getInclusionReportFiltercards(mriquery);

                // Construct base inclusionRuleStats based on filtercard names
                const baseInclusionRuleStats = this.getBaseInclusionRuleStats(
                    inclusionReportFiltercards
                );
                // Construct bitmask filters
                const bitmapMasks = this.getBitmapMasks(
                    inclusionReportFiltercards.length
                );

                const promises = bitmapMasks.map((bitmapMask) => {
                    const bitmapMriquery = structuredClone(mriquery);
                    bitmapMriquery.filter.cards.content = [];

                    for (const [idx, op] of bitmapMask.split("").entries()) {
                        const bitmaskContent = structuredClone(
                            inclusionReportFiltercards[idx]
                        );
                        // Set filter to an exclusion filtercard if op is 0
                        if (op === "0") {
                            // If filtercard is nested, split them up into individual exclusions
                            if (bitmaskContent.content.length > 1) {
                                bitmaskContent.content.forEach((e) => {
                                    bitmapMriquery.filter.cards.content.push({
                                        content: [
                                            {
                                                content: [e],
                                                type: "BooleanContainer",
                                                op: "NOT",
                                            },
                                        ],
                                        type: "BooleanContainer",
                                        op: "OR",
                                    });
                                });
                            } else {
                                // Else Push filtercard as an exclusion
                                bitmaskContent["op"] = "NOT";
                                bitmapMriquery.filter.cards.content.push({
                                    content: [bitmaskContent],
                                    type: "BooleanContainer",
                                    op: "OR",
                                });
                            }
                        } else {
                            bitmapMriquery.filter.cards.content.push(
                                bitmaskContent
                            );
                        }
                    }

                    // Strip all axis selection as is not needed by inclusionreport
                    bitmapMriquery["axisSelection"] = [];

                    return this.formulateQuery(req, {
                        queryParams: {
                            configId,
                            configVersion,
                            datasetId,
                            bookmarkInputStr: bitmapMriquery,
                            queryType: "irtotalpcount",
                            language,
                        },
                    });
                });

                const queryResults = await Promise.all(promises);
                const results = this.formulateInclusionReportResults(
                    bitmapMasks,
                    queryResults,
                    inclusionReportFiltercards,
                    baseInclusionRuleStats
                );
                resolve(results);
            } catch (err) {
                reject(err);
            }
        });
    }

    public processRequestForSelectiveInclusionReport(
        req,
        configId,
        configVersion,
        datasetId,
        mriquery,
        language
    ): Promise<SelectiveInclusiveReportResults> {
        log.addRequestCorrelationID(req);
        return new Promise(async (resolve, reject) => {
            try {
                let res = await new PatientCountEndpoint(
                    this.connection
                ).processRequest(
                    req,
                    configId,
                    configVersion,
                    datasetId,
                    TOTAL_PATIENt_COUNT_BOOKMARK_STR.replace(
                        "CONFIG_ID",
                        configId
                    )
                        .replace("CONFIG_VERSION", configVersion)
                        .replace("DATASET_ID", datasetId),
                    language
                );
                const totalPatientCount =
                    res["data"][0]["patient.attributes.pcount"];

                console.log(`totalPatientCount: ${totalPatientCount}`);

                const inclusionReportFiltercards =
                    this.getInclusionReportFiltercards(mriquery);

                // Construct base inclusionRuleStats based on filtercard names
                const baseInclusionRuleStats = this.getBaseInclusionRuleStats(
                    inclusionReportFiltercards
                );

                // Construct bitmask filters
                const bitmapMasks = this.getSelectiveBitmapMasks(
                    inclusionReportFiltercards
                );

                const promises = bitmapMasks.map((bitmapMask) => {
                    const bitmapMriquery = structuredClone(mriquery);
                    bitmapMriquery.filter.cards.content = [];

                    for (const [idx, op] of bitmapMask.split("").entries()) {
                        const bitmaskContent = structuredClone(
                            inclusionReportFiltercards[idx]
                        );
                        // Set filter to an exclusion filtercard if op is 0
                        if (op === "0") {
                            // If filtercard is nested, split them up into individual exclusions
                            if (bitmaskContent.content.length > 1) {
                                bitmaskContent.content.forEach((e) => {
                                    bitmapMriquery.filter.cards.content.push({
                                        content: [
                                            {
                                                content: [e],
                                                type: "BooleanContainer",
                                                op: "NOT",
                                            },
                                        ],
                                        type: "BooleanContainer",
                                        op: "OR",
                                    });
                                });
                            } else {
                                // Else Push filtercard as an exclusion
                                bitmaskContent["op"] = "NOT";
                                bitmapMriquery.filter.cards.content.push({
                                    content: [bitmaskContent],
                                    type: "BooleanContainer",
                                    op: "OR",
                                });
                            }
                        } else {
                            bitmapMriquery.filter.cards.content.push(
                                bitmaskContent
                            );
                        }
                    }
                    // Strip all axis selection as is not needed by inclusionreport
                    bitmapMriquery["axisSelection"] = [];

                    return this.formulateQuery(req, {
                        queryParams: {
                            configId,
                            configVersion,
                            datasetId,
                            bookmarkInputStr: bitmapMriquery,
                            queryType: "irtotalpcount",
                            language,
                        },
                    });
                });
                const queryResults = await Promise.all(promises);
                const results = this.formulateSelectiveInclusionReportResults(
                    totalPatientCount,
                    bitmapMasks,
                    queryResults,
                    inclusionReportFiltercards,
                    baseInclusionRuleStats
                );
                resolve(results);
            } catch (err) {
                reject(err);
            }
        });
    }

    private formulateInclusionReportResults(
        bitmapMasks: string[],
        queryResults,
        inclusionReportFiltercards,
        baseInclusionRuleStats: BaseInclusionRuleStat[]
    ): InterfaceReportResults {
        let baseCount = 0;
        let finalCount = 0;
        let lostCount = 0; // lostCount is determined by exit event

        // Initialize treemapData
        const treemapData: TreemapData = {
            name: "Everyone",
            children: [],
        };
        for (let i = 0; i < inclusionReportFiltercards.length + 1; i++) {
            treemapData.children.push({
                name: `Group ${i}`,
                children: [],
            });
        }

        bitmapMasks.forEach((bitmapMask, idx) => {
            const pcount =
                queryResults[idx]["data"][0]["patient.attributes.pcount"];

            // Normalize so '1' = rule satisfied for both inclusion and exclusion rules
            const normalizedMask = this.normalizeBitmask(
                bitmapMask,
                inclusionReportFiltercards
            );
            // Count number of ones occuring in the normalizedMask
            const countOfOnes = (normalizedMask.match(/1/g) || []).length;

            // summary
            baseCount += pcount;
            if (countOfOnes === inclusionReportFiltercards.length) {
                finalCount = pcount;
            }

            // baseInclusionRuleStats
            for (const [bmIdx, bmEle] of normalizedMask.split("").entries()) {
                if (bmEle === "1") {
                    baseInclusionRuleStats[bmIdx].countSatisfying += pcount;
                }

                // Get percentExcluded
                // If Current filter is excluded and all other filters are included
                if (
                    bmEle === "0" &&
                    countOfOnes === inclusionReportFiltercards.length - 1
                ) {
                    baseInclusionRuleStats[bmIdx].countExcluded = pcount;
                }
            }

            // Treemap
            // Push count accordingly into group's children based on countOfOnes
            treemapData.children[countOfOnes].children.push({
                name: normalizedMask,
                size: pcount,
            });
        });

        // Construct inclusionRuleStats
        const inclusionRuleStats: InclusionRuleStat[] =
            baseInclusionRuleStats.map((e) => {
                return {
                    id: e.id,
                    name: e.name,
                    isExclude: e.isExclude,
                    percentExcluded: this.calcPercentageString(
                        e.countExcluded,
                        baseCount
                    ),
                    percentSatisfying: this.calcPercentageString(
                        e.countSatisfying,
                        baseCount
                    ),
                    countSatisfying: e.countSatisfying,
                };
            });

        const inclusionReportData = {
            summary: {
                baseCount,
                finalCount,
                lostCount,
                percentMatched: this.calcPercentageString(
                    finalCount,
                    baseCount
                ),
            },
            inclusionRuleStats,
            treemapData: treemapData,
        };

        return inclusionReportData;
    }

    private formulateSelectiveInclusionReportResults(
        totalPatientCount,
        bitmapMasks: string[],
        queryResults,
        inclusionReportFiltercards,
        baseInclusionRuleStats: BaseInclusionRuleStat[]
    ): SelectiveInclusiveReportResults {
        let baseCount = totalPatientCount;
        let finalCount = 0;
        let lostCount = 0; // lostCount is determined by exit event
        bitmapMasks.forEach((bitmapMask, idx) => {
            const pcount =
                queryResults[idx]["data"][0]["patient.attributes.pcount"];
            baseInclusionRuleStats[idx].countSatisfying = pcount;
            finalCount = pcount;
        });

        // Construct attritionStats
        let cumulativeCountSatisfying = 0;
        const attritionStats: AttritionStat[] = baseInclusionRuleStats.map(
            (e) => {
                return {
                    id: e.id,
                    name: e.name,
                    isExclude: e.isExclude,
                    cumulativeCountSatisfying: e.countSatisfying,
                };
            }
        );

        const inclusionReportData = {
            summary: {
                baseCount,
                finalCount,
                lostCount,
                percentMatched: this.calcPercentageString(
                    finalCount,
                    baseCount
                ),
            },
            attritionStats,
        };

        return inclusionReportData;
    }

    private formulateQuery(req, querySvcParams) {
        return new Promise(async (resolve, reject) => {
            try {
                let queryResponse: QuerySvcResultType = await generateQuery(
                    req,
                    querySvcParams
                );
                let finalQueryObject = queryResponse.queryObject;
                let nql: QueryObject = new QueryObject(
                    finalQueryObject.queryString,
                    finalQueryObject.parameterPlaceholders,
                    finalQueryObject.sqlReturnOn
                );
                let fast: any = queryResponse.fast;

                nql.executeQuery(this.connection, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        // if nothing is returned set the result to 0
                        if (result.data.length !== 1) {
                            result.data = [{ "patient.attributes.pcount": 0 }];
                        }

                        this.responseDbgInfo(result, {
                            FAST: fast.statement,
                            nql,
                        });

                        resolve(result);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    private getInclusionReportFiltercards(mriquery) {
        // Get mriquery filtercards
        const filtercards = mriquery.filter.cards.content;

        const basicDataFilters =
            this.splitBasicDataIntoDistinctFiltercards(filtercards);
        const nonBasicDataFilters = this.parseNonBasicDataFilters(filtercards);

        const inclusionReportFiltercards = [
            ...basicDataFilters,
            ...nonBasicDataFilters,
        ];

        return inclusionReportFiltercards;
    }

    private splitBasicDataIntoDistinctFiltercards(filtercards) {
        const basicDataFiltercard = filtercards.find(
            (e) => e.content[0].name === "Basic Data"
        );
        if (!basicDataFiltercard) {
            return [];
        }

        // Get basic data filters and remove those that have no chips
        const basicDataFilters =
            basicDataFiltercard.content[0].attributes.content.filter(
                (e) => e.constraints.content.length !== 0
            );
        if (basicDataFilters.length === 0) {
            return [];
        }

        let basicDataInclusionReportFilters;
        if (basicDataFilters.length === 1) {
            basicDataInclusionReportFilters = [
                structuredClone(basicDataFiltercard),
            ];
        } else {
            // Split Basic Data into distinct filtercards
            basicDataInclusionReportFilters = basicDataFilters.map((e) => {
                // Clone overall structure of Basic Data filter card and replace attributes.content with individual Basic Data attributes.content
                const basicDataFiltercardClone =
                    structuredClone(basicDataFiltercard);
                basicDataFiltercardClone.content[0].attributes.content = [e];

                return basicDataFiltercardClone;
            });
        }

        // Update basic data to use dynamically generated interactions.basicdata in cdm config
        basicDataInclusionReportFilters.forEach((e, idx) => {
            const cur = e.content[0];
            const name = cur.attributes.content[0].configPath.split(".").at(-1);

            const baseConfigPath = `patient.interactions.basicdata${idx + 1}`;
            const baseInstanceId = `patient.interactions.basicdata.${idx + 1}`;
            // Update content
            cur.configPath = baseConfigPath;
            cur.instanceNumber = idx + 1;
            cur.instanceID = baseInstanceId;
            cur.name = name;

            // Update content attributes
            cur.attributes.content[0].configPath = `${baseConfigPath}.attributes.${name}`;
            cur.attributes.content[0].instanceID = `${baseInstanceId}.attributes.${name}`;
        });

        return basicDataInclusionReportFilters;
    }

    private parseNonBasicDataFilters(filtercards) {
        let nonBasicDataFilters = filtercards.filter(
            (e) => e.content[0].name !== "Basic Data"
        );

        // Treat explicit exclusions from mriquery as inclusion filter
        nonBasicDataFilters.forEach((filtercard) => {
            const notFilters = filtercard.content.filter((content) => {
                return content.op === "NOT";
            });
            notFilters.forEach((e) => {
                nonBasicDataFilters.push({
                    content: e.content,
                    type: "BooleanContainer",
                    op: "OR",
                    isExclude: true,
                });
            });

            // Set filtercard.content to only inclusions filters
            filtercard.content = filtercard.content.filter(
                (content) => content.op !== "NOT"
            );
        });

        // Filter filtercard.content to remove elements where content is empty
        nonBasicDataFilters = nonBasicDataFilters.filter(
            (filtercard) => filtercard.content.length !== 0
        );

        return nonBasicDataFilters;
    }

    /**
     * Generates all possible bitmap masks for a set of size n.
     * Example if n === 3, output is ['000', '001', '010', '011', '100', '101', '110', '111']
     * @param n The number of elements (bits)
     * @returns An array of strings representing every bitmap mask
     */
    private getBitmapMasks(n: number): string[] {
        // Total combinations = 2^n
        const totalCombinations = 1 << n;
        const bitmapMasks: string[] = [];

        for (let i = 0; i < totalCombinations; i++) {
            bitmapMasks.push(i.toString(2).padStart(n, "0"));
        }
        return bitmapMasks;
    }

    /**
     * Generates all possible selective bitmap masks for a set of size n, with default value "1" and "0" if the filter card is excluded.
     * Examples,
     * if n === 3 & all filter cards are inclusive, then the output is ['1', '11', '111']
     * if n === 4 & the last filter card is exclusive, then the output is ['1', '11', '111', '1110']
     * if n === 5 & the 3rd & last filter cards are exclusive, then the output is ['1', '11', '110', '1101', '11010']
     * @param n The number of elements (bits)
     * @returns An array of strings representing all possible bitmap masks where where all are enabled
     */
    private getSelectiveBitmapMasks(inclusionReportFiltercards): string[] {
        let bitmapMasks = [];
        if (
            inclusionReportFiltercards &&
            inclusionReportFiltercards.length > 0
        ) {
            const n = inclusionReportFiltercards.length;
            let isExclude = false;

            for (let i = 0; i < n; i++) {
                let bitmapMask = "";
                for (let j = 0; j <= i; j++) {
                    isExclude = inclusionReportFiltercards[j].isExclude
                        ? true
                        : false;
                    bitmapMask += isExclude ? "0" : "1";
                    isExclude = false;
                }
                bitmapMasks.push(bitmapMask);
            }
        }
        console.log(`bitmapMasks:${bitmapMasks}`);
        return bitmapMasks;
    }

    /**
     * Normalize bitmask so that '1' always means "rule satisfied".
     * For exclusion rules, the raw bit is inverted (0 = exclusion applied = satisfied),
     * so we flip those bits.
     */
    private normalizeBitmask(
        bitmask: string,
        inclusionReportFiltercards: any[]
    ): string {
        return bitmask
            .split("")
            .map((bit, idx) => {
                if (inclusionReportFiltercards[idx].isExclude) {
                    return bit === "0" ? "1" : "0";
                }
                return bit;
            })
            .join("");
    }

    /**
     * Gets the name of a filter card entry, unwrapping NOT if present.
     * For inclusion: entry is a FilterCard with a `name` property.
     * For exclusion: entry is a NOT BooleanContainer wrapping the FilterCard.
     */
    private getFilterCardName(entry): string {
        return entry.op === "NOT" ? entry.content[0].name : entry.name;
    }

    private getBaseInclusionRuleStats(
        inclusionReportFiltercards
    ): BaseInclusionRuleStat[] {
        let inclusionRuleStats = [];
        for (const [idx, filtercard] of inclusionReportFiltercards.entries()) {
            const { content } = filtercard;
            const isExclude = filtercard.isExclude === true;
            inclusionRuleStats.push({
                id: idx,
                name: content
                    .map((e) => this.getFilterCardName(e))
                    .join(" OR "),
                countSatisfying: 0,
                countExcluded: 0,
                isExclude,
            });
        }
        return inclusionRuleStats;
    }

    /**
     * Divides two inut numbers, then format float into percentage string
     * Example 0.123456 returns "12.34%"
     */
    private calcPercentageString(top: number, bottom: number): string {
        if (bottom === 0) {
            return "0.00%";
        }
        return `${((top / bottom) * 100).toFixed(2)}%`;
    }
}
