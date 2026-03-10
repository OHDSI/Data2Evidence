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
const log = Logger.CreateLogger("analytics-log");

interface BaseInclusionRuleStat {
    countSatisfying: number;
    countExcluded: number;
    name: string;
    id: number;
}
interface InclusionRuleStat {
    countSatisfying: number;
    percentSatisfying: string;
    percentExcluded: string;
    name: string;
    id: number;
}
interface InterfaceReportResults {
    treemapData: string;
    inclusionRuleStats: InclusionRuleStat[];
    summary: {
        percentMatched: string;
        lostCount: number;
        finalCount: number;
        baseCount: number;
    };
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
                // Get mriquery filtercards
                const filtercards = mriquery.filter.cards.content;

                const basicDataFilters =
                    this.splitBasicDataIntoDistinctFiltercards(filtercards);

                const inclusionReportFiltercards = [
                    ...basicDataFilters,
                    ...filtercards.filter(
                        (e) => e.content[0].name !== "Basic Data"
                    ),
                ];

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
                            bitmaskContent["op"] = "NOT";
                            bitmapMriquery.filter.cards.content.push({
                                content: [bitmaskContent],
                                type: "BooleanContainer",
                                op: "OR",
                            });
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
        const treemapData = {
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
            // Count number of ones occuring in the bitmapMask
            const countOfOnes = (bitmapMask.match(/1/g) || []).length;

            // summary
            baseCount += pcount;
            if (countOfOnes === inclusionReportFiltercards.length) {
                finalCount = pcount;
            }

            // baseInclusionRuleStats
            for (const [bmIdx, bmEle] of bitmapMask.split("").entries()) {
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
                name: bitmapMask,
                size: pcount,
            });
        });

        // Construct inclusionRuleStats
        const inclusionRuleStats: InclusionRuleStat[] =
            baseInclusionRuleStats.map((e) => {
                return {
                    id: e.id,
                    name: e.name,
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
            treemapData: JSON.stringify(treemapData),
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

    private getBaseInclusionRuleStats(
        inclusionReportFiltercards
    ): BaseInclusionRuleStat[] {
        let inclusionRuleStats = [];
        for (const [idx, { content }] of inclusionReportFiltercards.entries()) {
            inclusionRuleStats.push({
                id: idx,
                name: content.map((e) => e.name).join(" OR "),
                countSatisfying: 0,
                countExcluded: 0,
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
