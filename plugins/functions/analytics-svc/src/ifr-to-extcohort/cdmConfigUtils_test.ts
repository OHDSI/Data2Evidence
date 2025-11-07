import cdmConfig from "./samples/cdm-config-with-extcohort-mapping";
import oxygenIFR from "./samples/002-ifr_oxygen";
import oxygenExtCohort from "./samples/002-extcohort_oxygen";
import { deepCopy } from "./utils";
import {
    getExtCohortKeyForEvent,
    getExtCohortInfoForAttribute,
    convertEventAttributesToConceptSets,
    createDemographicCriteriaList,
    convertAttributeContentToCriteria,
} from "./cdmConfigUtils";
import { IMRIRequest } from "../types";
import sampleConcepts from "./samples/sample-concepts";
import * as conceptGetters from "./conceptGetters";

const req = {} as IMRIRequest;

jest.mock("../utils/TerminologySvcProxy", () => ({
    terminologyRequest: jest.fn(),
}));
jest.spyOn(conceptGetters, "getConceptByName").mockImplementation(
    ({ conceptName }: { conceptName: string }) => {
        return new Promise((resolve, reject) => {
            const concept = sampleConcepts.filter(
                (concept) => concept.CONCEPT_NAME === conceptName
            )[0];
            resolve(concept);
        });
    }
);

describe("getExtCohortKeyForEvent", () => {
    it("", () => {
        expect(
            getExtCohortKeyForEvent(
                cdmConfig,
                "patient.interactions.conditionoccurrence"
            )
        ).toEqual("ConditionOccurrence");
    });
    it("", () => {
        expect(
            getExtCohortKeyForEvent(
                cdmConfig,
                "patient.interactions.conditionoccurrence_fail"
            )
        ).toBeNull();
    });
});

describe("getExtCohortKeyForAttribute", () => {
    it("", () => {
        const expected = { key: "OccurrenceStartDate", type: "time" };
        expect(
            getExtCohortInfoForAttribute(
                cdmConfig,
                "patient.interactions.conditionoccurrence.attributes.startdate"
            )
        ).toEqual(expected);
    });
    it("", () => {
        expect(
            getExtCohortInfoForAttribute(
                cdmConfig,
                "patient.interactions.conditionoccurrence.attributes.startdate_fail"
            )
        ).toBeNull();
    });
});

describe("convertEventAttributesToConceptSets", () => {
    it("", async () => {
        const ifr = deepCopy(oxygenIFR);
        const extCohort = deepCopy(oxygenExtCohort);
        const expected = extCohort.ConceptSets;
        expected[0].name = "patient.interactions.drugera.1.attributes.drugname";
        expect(
            await convertEventAttributesToConceptSets(
                cdmConfig,
                ifr.filter.cards.content,
                req,
                ""
            )
        ).toEqual(expected);
    });
});

describe("convertAttributeContentToCriteria", () => {
    it("", () => {
        expect(
            convertAttributeContentToCriteria({
                attrType: "time",
                content: [
                    {
                        type: "Expression",
                        operator: ">=",
                        value: "2023-05-17T00:00:00.000Z",
                    },
                ],
            })
        ).toEqual({ Op: "gte", Value: "2023-05-17" });
    });
    it("", () => {
        expect(
            convertAttributeContentToCriteria({
                attrType: "time",
                content: [
                    {
                        type: "Expression",
                        operator: ">",
                        value: "2023-05-17T00:00:00.000Z",
                    },
                ],
            })
        ).toEqual({ Op: "gt", Value: "2023-05-17" });
    });
});

describe("createDemographicCriteriaList", () => {
    it("", async () => {
        const input = {
            content: [
                {
                    configPath: "patient",
                    instanceNumber: 0,
                    instanceID: "patient",
                    name: "Basic Data",
                    inactive: false,
                    type: "FilterCard",
                    attributes: {
                        content: [
                            {
                                configPath: "patient.attributes.Age",
                                instanceID: "patient.attributes.Age",
                                type: "Attribute",
                                constraints: {
                                    content: [
                                        {
                                            type: "Expression",
                                            operator: ">",
                                            value: 50,
                                        },
                                    ],
                                    type: "BooleanContainer",
                                    op: "OR",
                                },
                            },
                            {
                                configPath: "patient.attributes.Gender",
                                instanceID: "patient.attributes.Gender",
                                type: "Attribute",
                                constraints: {
                                    content: [
                                        {
                                            type: "Expression",
                                            operator: "=",
                                            value: "MALE",
                                        },
                                    ],
                                    type: "BooleanContainer",
                                    op: "OR",
                                },
                            },
                        ],
                        type: "BooleanContainer",
                        op: "AND",
                    },
                    advanceTimeFilter: null,
                },
            ],
            type: "BooleanContainer",
            op: "OR",
        };
        const expected = [
            {
                Age: {
                    Op: "gt",
                    Value: 50,
                },
                Gender: [
                    {
                        CONCEPT_CODE: "M",
                        CONCEPT_ID: 8507,
                        CONCEPT_NAME: "MALE",
                        DOMAIN_ID: "Gender",
                        VOCABULARY_ID: "Gender",
                    },
                ],
            },
        ];
        expect(
            await createDemographicCriteriaList(input, cdmConfig, req, "")
        ).toEqual(expected);
    });
});
