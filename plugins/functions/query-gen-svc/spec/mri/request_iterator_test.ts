import * as requestIteratorLib  from "../../src/api/request_handler/RequestIterator";
import * as testUtilLib from"../testutils/testutils";
import * as mConf from "../testutils/mock_config";

let config = mConf.config;

let testRequest = {
    patient: {
        attributes: {
            pcount: [{ yaxis: 1 }],
            smoker: [{ values: ["Yes"] }],
        },
        conditions: {
            acme: {
                interactions: {
                    priDiag: {
                        1: {
                            attributes: {
                                icd: [{ values: ["C04", "C05", "C06"], xaxis: 1 }],
                            },
                        },
                        2: {
                            attributes: {
                                icd: [{ values: ["C04", "C05", "C06"], xaxis: 1 }],
                            },
                        },
                    },
                    radio: {
                        1: {
                            attributes: {
                                radio_ops: [{ values: ["8-521"] }],
                                radio_dosage: [{ values: ["50 Gy"] }],
                            },
                        },
                    },
                },
            },
        },
        interactions: {
            vStatus: {
                1: {
                    attributes: {
                        status: [{ values: ["Alive"] }],
                    },
                },
            },
        },
    },
};


let excludeTestRequest = {
    patient: {
        attributes: {
            pcount: [{ yaxis: 1 }],
            smoker: [{ values: ["Yes"] }],
        },
        conditions: {
            acme: {
                interactions: {
                    priDiag: {
                        1: {
                            attributes: {
                                icd: [{ values: ["C04", "C05", "C06"], xaxis: 1 }],
                            },
                        },
                        2: {
                            attributes: {
                                exclude: true,
                                icd: [{ values: ["C04", "C05", "C06"], xaxis: 1 }],
                            },
                        },
                    },
                    radio: {
                        1: {
                            attributes: {
                                radio_ops: [{ values: ["8-521"] }],
                                radio_dosage: [{ values: ["50 Gy"] }],
                            },
                        },
                    },
                },
            },
        },
        interactions: {
            vStatus: {
                1: {
                    attributes: {
                        status: [{ values: ["Alive"] }],
                    },
                },
            },
        },
    },
};

describe(
    "TEST SUITE FOR THE REQUEST ITERATOR",
    () => {
        describe("getConfigElement() ", () => {
            it("should return an object with all non-object properties at the given path in the config", () => {
                let result = requestIteratorLib.getConfigElement(config, "patient.conditions.acme.interactions.priDiag.1");
                expect(result.defaultFilter).toBe(config.patient.conditions.acme.interactions.priDiag.defaultFilter);
                let result2 = requestIteratorLib.getConfigElement(config, "patient.conditions.acme.interactions.priDiag.1.attributes.icd");
                expect(result2).toEqual(config.patient.conditions.acme.interactions.priDiag.attributes.icd);
            });
        });

        describe("getRequestIterator() ", () => {
            it("returns a function to that returns extracts all paths matching the passed pattern", () => {
                let requestIterator = new requestIteratorLib.RequestIterator(testRequest, config);

                let attributes = requestIterator.get("**.attributes.*");

                let expectedPaths = [
                    "patient.attributes.pcount",
                    "patient.attributes.smoker",
                    "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
                    "patient.conditions.acme.interactions.priDiag.2.attributes.icd",
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage",
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
                    "patient.interactions.vStatus.1.attributes.status",
                ];
                let i = null;
                for (i = 0; i < attributes.length; i++) {
                    expect(attributes[i].requestPath).toBe(expectedPaths[i]);
                }
            });

            it("returns a function that attaches the correct request parts for each path", () => {
                let requestIterator = new requestIteratorLib.RequestIterator(testRequest, config);

                let attributes = requestIterator.get("**.attributes.*");

                let correctMatches = {
                    "patient.attributes.pcount": testRequest.patient.attributes.pcount,
                    "patient.attributes.smoker": testRequest.patient.attributes.smoker,
                    "patient.conditions.acme.interactions.priDiag.1.attributes.icd":
                        testRequest.patient.conditions.acme.interactions.priDiag["1"].attributes.icd,
                    "patient.conditions.acme.interactions.priDiag.2.attributes.icd":
                        testRequest.patient.conditions.acme.interactions.priDiag["2"].attributes.icd,
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage":
                        testRequest.patient.conditions.acme.interactions.radio["1"].attributes.radio_dosage,
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                        testRequest.patient.conditions.acme.interactions.radio["1"].attributes.radio_ops,
                    "patient.interactions.vStatus.1.attributes.status": testRequest.patient.interactions.vStatus["1"].attributes.status,
                };
                let i = null;
                for (i = 0; i < attributes.length; i++) {
                    expect(attributes[i].requestValue).toEqual(correctMatches[attributes[i].requestPath]);
                }
            });

            it("returns a function that attaches the correct config parts for each path", () => {
                let requestIterator = new requestIteratorLib.RequestIterator(testRequest, config);

                let attributes = requestIterator.get("**.attributes.*");

                let correctMatches = {
                    "patient.attributes.pcount": config.patient.attributes.pcount,
                    "patient.attributes.smoker": config.patient.attributes.smoker,
                    "patient.conditions.acme.interactions.priDiag.1.attributes.icd": config.patient.conditions.acme.interactions.priDiag.attributes.icd,
                    "patient.conditions.acme.interactions.priDiag.2.attributes.icd": config.patient.conditions.acme.interactions.priDiag.attributes.icd,
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage":
                        config.patient.conditions.acme.interactions.radio.attributes.radio_dosage,
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_ops": config.patient.conditions.acme.interactions.radio.attributes.radio_ops,
                    "patient.interactions.vStatus.1.attributes.status": config.patient.interactions.vStatus.attributes.status,
                };
                attributes.forEach((attr) => {
                    expect(attr.configValue).toEqual(correctMatches[attr.requestPath]);
                });
            });

            it("returns a function that attaches the correct config parts for each path, also with excluded interactions", () => {
                let requestIterator = new requestIteratorLib.RequestIterator(excludeTestRequest, config);

                let attributes = requestIterator.get("**.attributes.*");

                let correctMatches = {
                    "patient.attributes.pcount": config.patient.attributes.pcount,
                    "patient.attributes.smoker": config.patient.attributes.smoker,
                    "patient.conditions.acme.interactions.priDiag.1.attributes.icd": config.patient.conditions.acme.interactions.priDiag.attributes.icd,
                    "patient.conditions.acme.interactions.priDiag.2.attributes.icd": config.patient.conditions.acme.interactions.priDiag.attributes.icd,
                    "patient.conditions.acme.interactions.priDiag.2.attributes.exclude": {},
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage":
                        config.patient.conditions.acme.interactions.radio.attributes.radio_dosage,
                    "patient.conditions.acme.interactions.radio.1.attributes.radio_ops": config.patient.conditions.acme.interactions.radio.attributes.radio_ops,
                    "patient.interactions.vStatus.1.attributes.status": config.patient.interactions.vStatus.attributes.status,
                };
                attributes.forEach((attr) => {
                    expect(attr.configValue).toEqual(correctMatches[attr.requestPath]);
                });
            });
        });

    });