import { dw_views_config } from "../data/pa/dw_views_config";
import { dw_views_pholderTableMap } from "../data/global/dw_views_pholdertablemap";
import { Fast } from "../../src/req_transformation/fast";
import { Config } from "../../src/qe/qe_config_interface/Config";
import { getAstFactory } from "../../src/qe/sql_generator2/AstFactory";

describe("Query Engine sql generation test", () => {
    it("Should not convert table ids' to upper case", () => {

        let request = {
            cards: {
                content: [
                    {
                        content: [
                            {
                                _configPath: "patient",
                                _instanceNumber: 0,
                                _instanceID: "patient",
                                _name: "Basic Data",
                                _attributes: {
                                    content: [{
                                        _configPath: "patient.attributes.smoker",
                                        _instanceID: "patient.attributes.smoker",
                                        _constraints: {
                                            content: [],
                                        },
                                    }, {
                                        _configPath: "patient.attributes.gender",
                                        _instanceID: "patient.attributes.gender",
                                        _constraints: {
                                            content: [],
                                        },
                                    }, {
                                        _configPath: "patient.attributes.biomarker",
                                        _instanceID: "patient.attributes.biomarker",
                                        _constraints: {
                                            content: [],
                                        },
                                    },
                                    ],
                                },

                            },
                        ],
                    },
                    {
                        content:
                            [{
                                _configPath: "patient.conditions.acme.interactions.priDiag",
                                _instanceNumber: 1,
                                _instanceID: "patient.conditions.acme.interactions.priDiag.1",
                                _name: "Primary Tumor Diagnosis A",
                                _attributes: {
                                    content: [{
                                        _configPath: "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
                                        _instanceID: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                                        _constraints: {
                                            content: [],
                                        },
                                    }, {
                                        _configPath: "patient.conditions.acme.interactions.priDiag.attributes.age",
                                        _instanceID: "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                                        _constraints: {
                                            content: [],
                                        },
                                    },
                                    ],
                                },
                            }],
                    },
                    {
                        content:
                            [
                                {
                                    _configPath: "patient.conditions.acme.interactions.priDiag",
                                    _instanceNumber: 2,
                                    _instanceID: "patient.conditions.acme.interactions.priDiag.2",
                                    _name: "Primary Tumor Diagnosis B",
                                    _attributes: {
                                        content: [{
                                            _configPath: "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
                                            _instanceID: "patient.conditions.acme.interactions.priDiag.2.attributes.icd_10",
                                            _constraints: {
                                                content: [],
                                            },
                                        }, {
                                            _configPath: "patient.conditions.acme.interactions.priDiag.attributes.age",
                                            _instanceID: "patient.conditions.acme.interactions.priDiag.2.attributes.age",
                                            _constraints: {
                                                content: [],
                                            },
                                        },
                                        ],
                                    },
                                },
                            ],
                    },
                ],
            },
            axes: [{
                id: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                configPath: "patient.conditions.acme.interactions.priDiag",
                instanceID: "patient.conditions.acme.interactions.priDiag.1",
                axis: "x",
                seq: 1,
            }, {
                id: "patient.attributes.pcount",
                configPath: "patient",
                instanceID: "patient",
                axis: "y",
                seq: 1,
            },
            ],
            configData: {
                configId: "PatientAnalyticsInitialCI",
                configVersion: "A",
            },
        };

        let f = new Fast("aggquery", request, dw_views_config, dw_views_pholderTableMap, "1");
        let confHelper = new Config(dw_views_config, dw_views_pholderTableMap);
        let astFactory = getAstFactory(confHelper);
        let nql = astFactory.astElementFactory(
            JSON.parse(JSON.stringify(f.statement.statement)), "statement", "statement", null);
        nql.generateSQLCombineCount();

        let interactionIdColumn1 = `"patient.priDiag1"."InteractionID"`;

        expect(nql.node.def[0].node.expression.node.where.node.operand[0].sql.queryString).toBe(interactionIdColumn1);
        expect(nql.node.def[0].node.expression.node.where.node.operand[1].sql.queryString).toBe(`"patient.priDiag2"."InteractionID"`);
        expect(nql.node.def[0].node.expression.node.where.node.type).toBe("NotEqual");
        expect(nql.sql.queryString.indexOf(`UPPER(${interactionIdColumn1})`)).toBe(-1);

    });
});