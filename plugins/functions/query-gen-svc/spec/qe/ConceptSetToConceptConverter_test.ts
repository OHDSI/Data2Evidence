import {
    mockables,
    findConceptSetsInIfr,
    updateIfrWithConcepts,
    generateConceptConstraints,
    getConceptsFromConceptSets,
} from "../../src/utils/formatter/ConceptSetToConceptConverter";

const config = {
    patient: {
        interactions: {
            conditionera: {
                name: "ConditionEra",
                defaultFilter: "1=1",
                defaultPlaceholder: "@CONDERA",
                order: 15,
                parentInteraction: [],
                parentInteractionLabel: "parent",
                attributes: {
                    attrConceptSet: {
                        name: "attrConceptSet",
                        type: "conceptSet",
                        conceptSetAttr: "attrNotConceptSet",
                    },
                    attrNotConceptSet: {
                        name: "attrNotConceptSet",
                        type: "text",
                    },
                },
            },
        },
    },
};

const ifrWithConceptSets = {
    cards: {
        content: [
            {
                content: [
                    {
                        op: "AND",
                        _configPath: "patient",
                        _instanceNumber: 0,
                        _instanceID: "patient",
                        _name: "Basic Data",
                        _inactive: false,
                        _attributes: { content: [], op: "AND" },
                    },
                ],
                op: "OR",
            },
            {
                content: [
                    {
                        op: "AND",
                        _configPath: "patient.interactions.conditionera",
                        _instanceNumber: 1,
                        _instanceID: "patient.interactions.conditionera.1",
                        _name: "ConditionEra A",
                        _inactive: false,
                        _attributes: {
                            content: [
                                {
                                    _configPath:
                                        "patient.interactions.conditionera.attributes.attrConceptSet",
                                    _instanceID:
                                        "patient.interactions.conditionera.1.attributes.attrConceptSet",
                                    _constraints: {
                                        content: [
                                            {
                                                _operator: "=",
                                                _value: "9d146c3c-ccbb-4a56-848f-3e5126ad5e61",
                                            },
                                        ],
                                        op: "OR",
                                    },
                                },
                                {
                                    _configPath:
                                        "patient.interactions.conditionera.attributes.attrNotConceptSet",
                                    _instanceID:
                                        "patient.interactions.conditionera.1.attributes.attrNotConceptSet",
                                    _constraints: {
                                        content: [
                                            {
                                                _operator: "=",
                                                _value: "9d146c3c-ccbb-4a56-848f-3e5126ad5e61",
                                            },
                                            {
                                                _operator: "=",
                                                _value: "9d146c3c-ccbb-4a56-848f-3e5126ad5e62",
                                            },
                                        ],
                                        op: "OR",
                                    },
                                },
                            ],
                            op: "AND",
                        },
                    },
                ],
                op: "OR",
            },
        ],
        op: "AND",
    },
};

const ifrWithConcepts = {
    cards: {
        content: [
            {
                content: [
                    {
                        op: "AND",
                        _configPath: "patient",
                        _instanceNumber: 0,
                        _instanceID: "patient",
                        _name: "Basic Data",
                        _inactive: false,
                        _attributes: { content: [], op: "AND" },
                    },
                ],
                op: "OR",
            },
            {
                content: [
                    {
                        op: "AND",
                        _configPath: "patient.interactions.conditionera",
                        _instanceNumber: 1,
                        _instanceID: "patient.interactions.conditionera.1",
                        _name: "ConditionEra A",
                        _inactive: false,
                        _attributes: {
                            content: [
                                {
                                    _configPath:
                                        "patient.interactions.conditionera.attributes.attrNotConceptSet",
                                    _instanceID:
                                        "patient.interactions.conditionera.1.attributes.attrConceptSet",
                                    _constraints: {
                                        content: [
                                            {
                                                _operator: "=",
                                                _value: "1",
                                            },
                                            {
                                                _operator: "=",
                                                _value: "2",
                                            },
                                        ],
                                        op: "OR",
                                    },
                                },
                                {
                                    _configPath:
                                        "patient.interactions.conditionera.attributes.attrNotConceptSet",
                                    _instanceID:
                                        "patient.interactions.conditionera.1.attributes.attrNotConceptSet",
                                    _constraints: {
                                        content: [
                                            {
                                                _operator: "=",
                                                _value: "9d146c3c-ccbb-4a56-848f-3e5126ad5e61",
                                            },
                                            {
                                                _operator: "=",
                                                _value: "9d146c3c-ccbb-4a56-848f-3e5126ad5e62",
                                            },
                                        ],
                                        op: "OR",
                                    },
                                },
                            ],
                            op: "AND",
                        },
                    },
                ],
                op: "OR",
            },
        ],
        op: "AND",
    },
};

const bearerToken = "bearerToken";

describe("getConceptsFromConceptSets", () => {
    beforeEach(() => {
        spyOn(mockables, "getConceptIdsFromTerminologySvc").and.returnValue(
            Promise.resolve([1, 2])
        );
    });
    it("should get and format the results correctly", async function () {
        const ifrConceptSets = [
            {
                conceptSetAttr: "attrNotConceptSet",
                path: "path",
                instanceId: "instanceId",
                conceptSetIds: ["a", "b"],
            },
        ];
        expect(
            await getConceptsFromConceptSets(ifrConceptSets, "", bearerToken)
        ).toEqual([
            {
                conceptSetAttr: "attrNotConceptSet",
                path: "path",
                instanceId: "instanceId",
                conceptSetIds: ["a", "b"],
                conceptIds: [1, 2],
            },
        ]);
    });
});

describe("updateIfrWithConcepts", () => {
    beforeEach(() => {
        spyOn(mockables, "getConceptIdsFromTerminologySvc").and.returnValue(
            Promise.resolve([1, 2])
        );
    });
    xit("should get and format the results correctly", async function () {
      expect(
        await updateIfrWithConcepts(config, ifrWithConceptSets, "", bearerToken)
      ).toEqual(ifrWithConcepts);
    });
});

describe("findConceptSetsInIfr", () => {
    it("should get and format the results correctly", async function () {
        expect(findConceptSetsInIfr(config, ifrWithConceptSets)).toEqual([
            {
                conceptSetAttr: "attrNotConceptSet",
                path: "cards.content.1.content.0._attributes.content.0",
                instanceId:
                    "patient.interactions.conditionera.1.attributes.attrConceptSet",
                conceptSetIds: ["9d146c3c-ccbb-4a56-848f-3e5126ad5e61"],
            },
        ]);
    });
});

describe("generateConceptConstraints", () => {
    it("should get and format the results correctly", async function () {
        expect(generateConceptConstraints([1, 2])).toEqual({
            content: [
                {
                    _operator: "=",
                    _value: 1,
                },
                {
                    _operator: "=",
                    _value: 2,
                },
            ],
            op: "OR",
        });
    });
});
