import { Request } from "./RequestFactory";
import { Patient } from "./Patient";
import * as Keys from "../keys";
import { FastUtil } from "../fast_util";
import { ParserContainer, BaseNode, Expression } from "../def/ParserContainer";

export class RequestProcessing {
    public static measuresAndCategories: any = {};

    public static configSettings: any = {};

    public static setup(x: any) {
        this.configSettings = x;
    }

    public static requestProcessing(
        action: string,
        req: Request,
        message: any
    ) {
        switch (action) {
            case "plugin":
                this.pluginProcessing(req);
                break;
            case "totalpcount":
                this.tpcProcessing(req);
                break;
            case "patientdetail":
                this.patientListProcessing(req);
                break;
            case "patientdetailcount":
                this.patientListBaseProcessing(req);
                break;
            case "aggquery":
                this.totalPatientCount(req);
                break;
            case "attribute_validation_service":
            case "autocomplete_service":
            case "domain_values_service":
            case "freetext_search_service":
                break;
            default:
                throw new Error(
                    "Action " + action + " does have a requestProcessor!"
                );
        }
    }

    public static pluginProcessing(req: Request) {
        let columnsToSort = [];
        if (req.getOptions().columns) {
            columnsToSort = req
                .getOptions()
                .columns.filter(
                    (col) =>
                        col.configPath.indexOf("patient.attributes") > -1 &&
                        col.order !== ""
                );
        }

        (<Patient>req).getPatientContext().forEach((patientCtx) => {
            patientCtx.orderBy = columnsToSort.map((col) => ({
                alias: patientCtx.alias,
                path: col.configPath.split(".").pop(),
                pathId: col.configPath,
                templateId: col.configPath.replace(".", "-"),
                order: col.order === "A" ? "ASC" : "DESC",
            }));

            if(patientCtx.name === Keys.DEF_PATIENT_REQUEST_ENTRYEXIT) {
                const e = patientCtx;
                if (
                    e.groupBy.filter((f) => f.pathId === Keys.MRITERM_PID_ALIAS)
                        .length === 0
                ) {
                    e.groupBy.push({
                        path: Keys.MRITERM_PID,
                        alias: e.alias,
                        pathId: Keys.MRITERM_PID_ALIAS,
                        templateId: Keys.MRITERM_PID_TEMPLATEID,
                        axis: "y",
                        seq: 100,
                        order: "ASC",
                    });
                }
    
                if (
                    e.groupBy.filter((f) => f.pathId === Keys.MRITERM_PCOUNT_ALIAS)
                        .length === 0
                ) {
                    e.groupBy.push({
                        path: Keys.MRITERM_PCOUNT,
                        alias: e.alias,
                        pathId: Keys.MRITERM_PCOUNT_ALIAS,
                        templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
                        axis: "y",
                        seq: 2,
                        order: "ASC",
                    });
                }
               
            } else {
                patientCtx.groupBy = [
                    ...patientCtx.groupBy.filter((grpByElement) => {
                        return (
                            typeof grpByElement.pathId !== Keys.TERM_UNDEFINED &&
                            grpByElement.pathId === Keys.MRITERM_PCOUNT_ALIAS
                        );
                    }),
                    ...patientCtx.orderBy,
                ];
            }
        });

        (<Patient>req).buildDefaultOrderByList(
            (<Patient>req).getPopulationContext(),
            "x"
        );

        let patientCount = new ParserContainer(
            "PatientCount",
            Keys.CQLTERM_CONTEXT_POPULATION,
            1
        );
        let groupBy = FastUtil.deepClone(
            (req as Patient).getPopulationContext().groupBy
        ) as any[];
        patientCount.groupBy = groupBy.filter(
            (e) => e.pathId !== Keys.MRITERM_PID
        );
        patientCount.measure.push({
            path: Keys.MRITERM_PCOUNT_ALIAS,
            alias: patientCount.alias,
            pathId: Keys.MRITERM_PCOUNT_ALIAS,
            templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
            axis: "y",
            seq: 1,
            order: "ASC",
        });

        req.parserContainers.push(patientCount);

        if (
            typeof req.getOptions().limit !== Keys.TERM_UNDEFINED &&
            req.getOptions().limit !== 0
        ) {
            (<Patient>req)
                .getPopulationContext()
                .addClause("limit", req.getOptions().limit);
            if (typeof req.getOptions().offset !== Keys.TERM_UNDEFINED) {
                (<Patient>req)
                    .getPopulationContext()
                    .addClause("offset", req.getOptions().offset);
            }
        }
    }

    public static patientListBaseProcessing(req: Request) {
        (<Patient>req).getPopulationContext().groupBy = [];
        (<Patient>req).getPopulationContext().having = [];
        req.parserContainers.forEach((x) => {
            x.groupBy.push({
                path: Keys.MRITERM_PID,
                alias: x.alias,
                pathId: Keys.MRITERM_PID,
                templateId: Keys.MRITERM_PID_TEMPLATEID,
                axis: "x",
                seq: 100,
                order: "ASC",
                aggregation: "STRING_AGG(%Q,'_UNIQUE_SEPARATOR_STRING_')",
            });
        });

        (<Patient>req).getPatientContext().forEach((x) => {
            for (let i = x.groupBy.length - 1; i >= 0; i--) {
                if (
                    typeof x.groupBy[i].pathId !== Keys.TERM_UNDEFINED &&
                    x.groupBy[i].pathId === Keys.MRITERM_PCOUNT_ALIAS
                ) {
                    x.groupBy.splice(i, 1);
                }
            }
        });

        (<Patient>req).getPopulationContext().having = [];

        (<Patient>req).buildDefaultOrderByList(
            (<Patient>req).getPopulationContext(),
            "y"
        );
    }

    public static patientListProcessing(req: Request) {
        this.measuresAndCategories.Measure = FastUtil.deepClone(
            (<Patient>req).getPopulationContext().measure
        );
        this.measuresAndCategories.GroupBy = FastUtil.deepClone(
            (<Patient>req).getPopulationContext().groupBy
        );
        this.patientListBaseProcessing(req);
        if (
            typeof req.getOptions().limit !== Keys.TERM_UNDEFINED &&
            req.getOptions().limit !== 0
        ) {
            (<Patient>req)
                .getPopulationContext()
                .addClause("limit", req.getOptions().limit);
            if (typeof req.getOptions().offset !== Keys.TERM_UNDEFINED) {
                (<Patient>req)
                    .getPopulationContext()
                    .addClause("offset", req.getOptions().offset);
            }
        }
    }

    public static totalPatientCount(req: Request) {
        let patientCount = new ParserContainer(
            "PatientCount",
            Keys.CQLTERM_CONTEXT_POPULATION,
            1
        );
        let groupBy = FastUtil.deepClone(
            (req as Patient).getPopulationContext().groupBy
        ) as any[];
        patientCount.groupBy = groupBy.filter(
            (e) => e.pathId !== Keys.MRITERM_PID
        );

        patientCount.groupBy.push({
            path: Keys.MRITERM_PID,
            alias: patientCount.alias,
            pathId: Keys.MRITERM_PID_ALIAS,
            templateId: Keys.MRITERM_PID_TEMPLATEID,
            axis: "y",
            seq: 100,
            order: "ASC",
        });
        patientCount.measure.push({
            path: Keys.MRITERM_PCOUNT_ALIAS,
            alias: patientCount.alias,
            pathId: Keys.MRITERM_PCOUNT_ALIAS,
            templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
            axis: "y",
            seq: 1,
            order: "ASC",
        });

        (req as Patient).getPatientContext().forEach((e) => {
            if (
                e.groupBy.filter((f) => f.pathId === Keys.MRITERM_PID_ALIAS)
                    .length === 0
            ) {
                e.groupBy.push({
                    path: Keys.MRITERM_PID,
                    alias: e.alias,
                    pathId: Keys.MRITERM_PID_ALIAS,
                    templateId: Keys.MRITERM_PID_TEMPLATEID,
                    axis: "y",
                    seq: 100,
                    order: "ASC",
                });
            }

            if (
                e.groupBy.filter((f) => f.pathId === Keys.MRITERM_PCOUNT_ALIAS)
                    .length === 0
            ) {
                e.groupBy.push({
                    path: Keys.MRITERM_PCOUNT,
                    alias: e.alias,
                    pathId: Keys.MRITERM_PCOUNT_ALIAS,
                    templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
                    axis: "y",
                    seq: 2,
                    order: "ASC",
                });
            }
            return e;
        });
        req.parserContainers.push(patientCount);
    }

    public static tpcProcessing(req: Request) {
        for (let i = 0; i < req.parserContainers.length; i++) {
            let e = req.parserContainers[i];

            if (e.context === Keys.CQLTERM_CONTEXT_POPULATION) {
                let pcount = {
                    path: Keys.MRITERM_PCOUNT_ALIAS,
                    alias: e.alias,
                    pathId: Keys.MRITERM_PCOUNT_ALIAS,
                    templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
                    axis: "y",
                    seq: 1,
                    order: "ASC",
                };
                e.having = [];
                e.measure = [];
                e.measure.push(pcount);
            }
            if (
                e.groupBy.filter((f) => f.pathId === Keys.MRITERM_PID_ALIAS)
                    .length === 0
            ) {
                e.groupBy.push({
                    path: Keys.MRITERM_PID,
                    alias: e.alias,
                    pathId: Keys.MRITERM_PID_ALIAS,
                    templateId: Keys.MRITERM_PID_TEMPLATEID,
                    axis: "y",
                    seq: 100,
                    order: "ASC",
                });
            }
        }
    }

    public static getFERenderingData(action: string, req: Request) {
        let self = this;
        let getMeasuresAndCategories = (): any => {
            switch (action) {
                case "boxplot":
                case "patientdetail":
                    return self.measuresAndCategories;
                case "aggquery":
                case "totalpcount":
                case "attribute_validation_service":
                case "autocomplete_service":
                case "domain_values_service":
                case "freetext_search_service":
                default: {
                    let select: any = {};
                    for (let i = 0; i < req.parserContainers.length; i++) {
                        if (
                            req.parserContainers[i].context ===
                            Keys.CQLTERM_CONTEXT_POPULATION
                        ) {
                            select.Measure = req.parserContainers[i].measure;
                            select.GroupBy = req.parserContainers[i].groupBy;
                            break;
                        }
                    }

                    return select;
                }
            }
        };
        let measuresAndCategories = getMeasuresAndCategories();

        if (measuresAndCategories.Measure) {
            measuresAndCategories.Measure.sort((x, y) => {
                return x.seq - y.seq;
            });
        }

        if (measuresAndCategories.GroupBy) {
            measuresAndCategories.GroupBy.sort((x, y) => {
                return x.seq - y.seq;
            });
        }
        return measuresAndCategories;
    }
}
