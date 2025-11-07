export let input = {
    cards: {
        content: [
            {
                content: [{
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
                    },
                    {
                        _configPath: "patient.attributes.gender",
                        _instanceID: "patient.attributes.gender",
                        _constraints: {
                            content: [],
                        },
                    },
                    {
                        _configPath: "patient.attributes.biomarker",
                        _instanceID: "patient.attributes.biomarker",
                        _constraints: {
                            content: [],
                        },
                    }],
                },
                },
                ],
            },
            {
                content: [
                    {
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
                            },
                            {
                                _configPath: "patient.conditions.acme.interactions.priDiag.attributes.age",
                                _instanceID: "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                                _constraints: {
                                    content: [],
                                },
                            }],
                        },
                    }],
            },
            {
                content: [
                    {
                        _configPath: "patient.conditions.acme.interactions.chemo",
                        _instanceNumber: 1,
                        _instanceID: "patient.conditions.acme.interactions.chemo.1",
                        _name: "Chemotherapy A",
                        _advance_time_filter: {
                            filters: [{
                                value: "patient.conditions.acme.interactions.priDiag.1",
                                this: "overlap",
                                other: "overlap",
                                after_before: "",
                                operator: "",
                            }],
                            request: [{
                                and: [{
                                    or: [{
                                        value: "patient.conditions.acme.interactions.priDiag.1",
                                        filter: [{
                                            this: "start",
                                            other: "start",
                                            and: [{
                                                op: "<",
                                                value: 0,
                                            }],
                                        },
                                        {
                                            this: "end",
                                            other: "end",
                                            and: [{
                                                op: ">",
                                                value: 0,
                                            }],
                                        }],
                                    },
                                    {
                                        value: "patient.conditions.acme.interactions.priDiag.1",
                                        filter: [{
                                            this: "start",
                                            other: "start",
                                            and: [{
                                                op: ">",
                                                value: 0,
                                            }],
                                        },
                                        {
                                            this: "end",
                                            other: "end",
                                            and: [{
                                                op: "<",
                                                value: 0,
                                            }],
                                        }],
                                    },
                                    {
                                        value: "patient.conditions.acme.interactions.priDiag.1",
                                        filter: [{
                                            this: "end",
                                            other: "start",
                                            and: [{
                                                op: ">",
                                                value: 0,
                                            }],
                                        },
                                        {
                                            this: "end",
                                            other: "end",
                                            and: [{
                                                op: "<",
                                                value: 0,
                                            }],
                                        }],
                                    },
                                    {
                                        value: "patient.conditions.acme.interactions.priDiag.1",
                                        filter: [{
                                            this: "start",
                                            other: "start",
                                            and: [{
                                                op: ">",
                                                value: 0,
                                            }],
                                        },
                                        {
                                            this: "start",
                                            other: "end",
                                            and: [{
                                                op: "<",
                                                value: 0,
                                            }],
                                        }],
                                    }],
                                }],
                            }],
                            title: "Chemotherapy A > Primary Tumor Diagnosis A",
                        },
                        _attributes: {
                            content: [{
                                _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_ops",
                                _instanceID: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops",
                                _constraints: {
                                    content: [],
                                },
                            },
                            {
                                _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_prot",
                                _instanceID: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                                _constraints: {
                                    content: [],
                                },
                            }],
                        },
                    }],
            },
                
      ],
    },
    axes: [{
        id: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
        configPath: "patient.conditions.acme.interactions.priDiag",
        instanceID: "patient.conditions.acme.interactions.priDiag.1",
        axis: "x",
        seq: 1,
    },
    {
        id: "patient.attributes.pcount",
        configPath: "patient",
        instanceID: "patient",
        axis: "y",
        seq: 1,
    }],
    configData: {
        configId: "DC5C1E59984C4612E10000000A2C657E",
        configVersion: "A",
    },
};
