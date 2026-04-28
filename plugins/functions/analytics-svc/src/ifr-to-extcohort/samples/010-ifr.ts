export default {
    filter: {
        configMetadata: {
            id: "92d7c6f8-3118-4256-ab22-f2f7fd19d4e7",
            version: "A",
        },
        cards: {
            content: [
                {
                    content: [
                        {
                            configPath: "patient",
                            instanceNumber: 0,
                            instanceID: "patient",
                            name: "Basic Data",
                            inactive: false,
                            type: "FilterCard",
                            attributes: {
                                content: [],
                                type: "BooleanContainer",
                                op: "AND",
                            },
                            advanceTimeFilter: null,
                        },
                    ],
                    type: "BooleanContainer",
                    op: "OR",
                },
                {
                    content: [
                        {
                            configPath: "patient.interactions.drugera",
                            instanceNumber: 1,
                            instanceID: "patient.interactions.drugera.1",
                            name: "DrugEra A",
                            inactive: false,
                            type: "FilterCard",
                            attributes: {
                                content: [
                                    {
                                        configPath:
                                            "patient.interactions.drugera.attributes.drugname",
                                        instanceID:
                                            "patient.interactions.drugera.1.attributes.drugname",
                                        type: "Attribute",
                                        constraints: {
                                            content: [
                                                {
                                                    type: "Expression",
                                                    operator: "=",
                                                    value: "vitamin B12",
                                                },
                                                {
                                                    type: "Expression",
                                                    operator: "=",
                                                    value: "vitamin B6",
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
                },
                {
                    content: [
                        {
                            content: [
                                {
                                    configPath: "patient.interactions.drugera",
                                    instanceNumber: 2,
                                    instanceID:
                                        "patient.interactions.drugera.2",
                                    name: "DrugEra B",
                                    inactive: false,
                                    type: "FilterCard",
                                    attributes: {
                                        content: [
                                            {
                                                configPath:
                                                    "patient.interactions.drugera.attributes.drugname",
                                                instanceID:
                                                    "patient.interactions.drugera.2.attributes.drugname",
                                                type: "Attribute",
                                                constraints: {
                                                    content: [
                                                        {
                                                            type: "Expression",
                                                            operator: "=",
                                                            value: "oxygen",
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
                            op: "NOT",
                        },
                    ],
                    type: "BooleanContainer",
                    op: "OR",
                },
                {
                    content: [
                        {
                            content: [
                                {
                                    configPath: "patient.interactions.death",
                                    instanceNumber: 1,
                                    instanceID: "patient.interactions.death.1",
                                    name: "Death A",
                                    inactive: false,
                                    type: "FilterCard",
                                    attributes: {
                                        content: [],
                                        type: "BooleanContainer",
                                        op: "AND",
                                    },
                                    advanceTimeFilter: null,
                                },
                            ],
                            type: "BooleanContainer",
                            op: "NOT",
                        },
                    ],
                    type: "BooleanContainer",
                    op: "OR",
                },
            ],
            type: "BooleanContainer",
            op: "AND",
        },
        sort: "MRI_PA_CHART_SORT_DEFAULT",
    },
    chartType: "stacked",
    axisSelection: [
        { attributeId: "n/a", binsize: "n/a", categoryId: "x1" },
        { attributeId: "n/a", binsize: "n/a", categoryId: "x2" },
        { attributeId: "n/a", binsize: "n/a", categoryId: "x3" },
        { attributeId: "n/a", binsize: "n/a", categoryId: "x4" },
        { attributeId: "patient.attributes.pcount", categoryId: "y1" },
    ],
    metadata: { version: 3 },
    datasetId: "aa8b5d58-1905-4fa9-89aa-45c5df97613e",
};
