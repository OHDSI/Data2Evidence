import { ParserContainer } from "../def/ParserContainer";
import * as Keys from "../keys";
import { Logger } from "@alp/alp-base-utils";
import { Config } from "../../qe/qe_config_interface/Config";
import { FastUtil } from "../fast_util";

let logger = Logger.CreateLogger("query-gen-log");
const aggregationWhiteList = [
    "(COUNT)(\\S*)",
    "(AVG)(\\S*)",
    "(MAX)(\\S*)",
    "(MIN)(\\S*)",
];
const numericalAggregations = ["(AVG)(\\S*)", "(MAX)(\\S*)", "(MIN)(\\S*)"];
let wlRegExp = new RegExp("^(" + aggregationWhiteList.join("|") + ")$");
let numRegExp = new RegExp("^(" + numericalAggregations.join("|") + ")$");
function checkValidAggregations(
    containers: ParserContainer[],
    config: Config,
    message: any
) {
    containers.forEach((c) => {
        c.measure.forEach((m) => {
            if (m.aggregation) {
                if (!wlRegExp.test(m.aggregation)) {
                    message.noDataReason = "MRI_PA_NO_MATCHING_PATIENTS";
                    logger.error(
                        `SECURITY INCIDENT! Request should not contain the following aggregation: ${m.aggregation}`
                    );
                }
                if (numRegExp.test(m.aggregation)) {
                    let type = config
                        .getEntityByPath(
                            FastUtil.getId(
                                m.pathId.split(Keys.TERM_DELIMITER_PRD),
                                true,
                                true
                            )
                        )
                        .getConfig()[Keys.MRITERM_TYPE];
                    if (type && type !== "num") {
                        message.noDataReason = "MRI_PA_NO_MATCHING_PATIENTS";
                        logger.error(
                            `SECURITY INCIDENT! Attribute to be aggregated by ${m.aggregation} needs to be numerical: ${m.pathId}`
                        );
                    }
                }
            }
        });
    });
}

function checkMeasureExists(
    containers: ParserContainer[],
    message: any,
    errormsg: string
) {
    containers.forEach((p) => {
        if (
            p.context === Keys.CQLTERM_CONTEXT_POPULATION &&
            p.measure.length === 0
        ) {
            message.noDataReason = errormsg;
            return;
        }
    });
}

function checkInvalidOpOperator(
    containers: ParserContainer[],
    message: any,
    errormsg: string
) {
    let isInvalidReq = false;
    if (containers && containers.length > 0) {
        containers.forEach((c) => {
            if (c.filter && Object.keys(c.filter).length > 0) {
                Object.keys(c.filter).forEach((interactionType) => {
                    if (c.filter[interactionType].length > 0) {
                        c.filter[interactionType].forEach((filterCard) => {
                            if (
                                filterCard.attributeList &&
                                filterCard.attributeList.length > 0
                            ) {
                                filterCard.attributeList.forEach((attr) => {
                                    let validExpressions = [];
                                    let invalidExpressions = [];
                                    if (attr.filter && attr.filter.length > 0) {
                                        attr.filter.forEach((exp) => {
                                            if (
                                                "isValid" in exp &&
                                                !exp.isValid
                                            ) {
                                                invalidExpressions.push(exp);
                                            } else {
                                                validExpressions.push(exp);
                                            }
                                        });
                                        if (
                                            attr.filter.length ===
                                            invalidExpressions.length
                                        ) {
                                            isInvalidReq = true;
                                        } else {
                                            attr.filter = validExpressions;
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    if (isInvalidReq) {
        message.noDataReason = errormsg;
    }
}

export function requestValidation(
    action: string,
    containers: ParserContainer[],
    config: Config,
    message: any
) {
    switch (action) {
        case "boxplot":
            checkValidAggregations(containers, config, message);
            checkMeasureExists(
                containers,
                message,
                "MRI_PA_BOXPLOT_NO_Y_AXIS_SELECTED"
            );
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS"
            );
            break;
        case "totalpcount":
        case "aggquery":
            checkValidAggregations(containers, config, message);
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS"
            );
            break;
        case "patientdetail":
        case "patientdetailcount":
            checkMeasureExists(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS"
            );
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS_GUARDED"
            );
            break;
        case "kmquery":
        case "attribute_validation_service":
        case "autocomplete_service":
        case "domain_values_service":
        case "freetext_search_service":
        case "patients_collection_service":
        case "genomics_values_service":
            checkValidAggregations(containers, config, message);
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS"
            );
            break;
        case "plugin":
            checkValidAggregations(containers, config, message);
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS_GUARDED"
            );
            break;
        default:
            checkValidAggregations(containers, config, message);
            checkInvalidOpOperator(
                containers,
                message,
                "MRI_PA_NO_MATCHING_PATIENTS"
            );
            break;
    }
}
