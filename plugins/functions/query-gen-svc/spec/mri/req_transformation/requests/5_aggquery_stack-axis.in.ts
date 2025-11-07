export let input = {
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
                            content: [
                                {
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
                                },
                            ],
                        },
                    },
                ],
            },
            {
                content: [
                    {
                        _configPath:
                            "patient.conditions.acme.interactions.priDiag",
                        _instanceNumber: 1,
                        _instanceID:
                            "patient.conditions.acme.interactions.priDiag.1",
                        _name: "Primary Tumor Diagnosis A",
                        _attributes: {
                            content: [
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                                    _constraints: {
                                        content: [
                                            {
                                                _operator: "=",
                                                _value: "C34",
                                            },
                                        ],
                                    },
                                },
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.priDiag.attributes.age",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
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
                content: [
                    {
                        _configPath:
                            "patient.conditions.acme.interactions.chemo",
                        _instanceNumber: 1,
                        _instanceID:
                            "patient.conditions.acme.interactions.chemo.1",
                        _name: "Chemotherapy A",
                        _advanceTimeFilter: {
                            filters: [
                                {
                                    value: "patient.conditions.acme.interactions.surgery.1",
                                    this: "overlap",
                                    other: "overlap",
                                    after_before: "",
                                    operator: "",
                                },
                            ],
                            request: [
                                {
                                    and: [
                                        {
                                            or: [
                                                {
                                                    value: "patient.conditions.acme.interactions.surgery.1",
                                                    filter: [
                                                        {
                                                            this: "startdate",
                                                            other: "startdate",
                                                            and: [
                                                                {
                                                                    op: "<",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            this: "enddate",
                                                            other: "enddate",
                                                            and: [
                                                                {
                                                                    op: ">",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    value: "patient.conditions.acme.interactions.surgery.1",
                                                    filter: [
                                                        {
                                                            this: "startdate",
                                                            other: "startdate",
                                                            and: [
                                                                {
                                                                    op: ">",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            this: "enddate",
                                                            other: "enddate",
                                                            and: [
                                                                {
                                                                    op: "<",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    value: "patient.conditions.acme.interactions.surgery.1",
                                                    filter: [
                                                        {
                                                            this: "enddate",
                                                            other: "startdate",
                                                            and: [
                                                                {
                                                                    op: ">",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            this: "enddate",
                                                            other: "enddate",
                                                            and: [
                                                                {
                                                                    op: "<",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    value: "patient.conditions.acme.interactions.surgery.1",
                                                    filter: [
                                                        {
                                                            this: "startdate",
                                                            other: "startdate",
                                                            and: [
                                                                {
                                                                    op: ">",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                        {
                                                            this: "startdate",
                                                            other: "enddate",
                                                            and: [
                                                                {
                                                                    op: "<",
                                                                    value: 0,
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                            title: "Chemotherapy A > Surgery A",
                        },
                        _attributes: {
                            content: [
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.chemo.attributes.chemo_ops",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops",
                                    _constraints: {
                                        content: [],
                                    },
                                },
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.chemo.attributes.chemo_prot",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
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
                content: [
                    {
                        _configPath:
                            "patient.conditions.acme.interactions.surgery",
                        _instanceNumber: 1,
                        _instanceID:
                            "patient.conditions.acme.interactions.surgery.1",
                        _name: "Surgery A",
                        _attributes: {
                            content: [
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.surgery.attributes.exist",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.surgery.1.attributes.exist",
                                    _constraints: {
                                        content: [],
                                    },
                                },
                                {
                                    _configPath:
                                        "patient.conditions.acme.interactions.surgery.attributes.surgery_ops",
                                    _instanceID:
                                        "patient.conditions.acme.interactions.surgery.1.attributes.surgery_ops",
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
    axes: [
        {
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
        },
    ],
    configData: {
        configId: "0212D958C3FDCC16E10000000A2C657E",
        configVersion: "A",
    },
};
