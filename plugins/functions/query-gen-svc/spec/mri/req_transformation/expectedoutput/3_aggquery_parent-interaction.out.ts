export let output = {
    statement: {
        def: [
            {
                name: "PatientRequest0",
                context: "patient",
                accessLevel: "Public",
                expression: {
                    type: "Query",
                    actionType: "aggquery",
                    source: [
                        {
                            alias: "P0",
                            expression: {
                                type: "Retrieve",
                                dataType: "patient",
                                templateId: "patient",
                            },
                        },
                    ],
                    relationship: [
                        {
                            alias: "priDiag1",
                            type: "With",
                            expression: {
                                type: "Retrieve",
                                dataType: "priDiag",
                                templateId:
                                    "patient-conditions-acme-interactions-priDiag",
                            },
                        },
                        {
                            alias: "chemo1",
                            type: "With",
                            expression: {
                                type: "Retrieve",
                                dataType: "chemo",
                                templateId:
                                    "patient-conditions-acme-interactions-chemo",
                            },
                            suchThat: {
                                type: "Equal",
                                operand: [
                                    {
                                        type: "Property",
                                        path: "PARENT_INTERACT_ID",
                                        scope: "chemo1",
                                        axis: false,
                                    },
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "priDiag1",
                                    },
                                ],
                            },
                        },
                    ],
                    groupBy: [
                        {
                            type: "Property",
                            path: "icd_10",
                            scope: "priDiag1",
                            alias: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            axis: "x",
                        },
                        {
                            type: "Property",
                            path: "pcount",
                            scope: "P0",
                            alias: "patient.attributes.pcount",
                            axis: "y",
                        },
                        {
                            type: "Property",
                            path: "pid",
                            scope: "P0",
                            alias: "patient.attributes.pid",
                            axis: "y",
                        },
                    ],
                },
            },
            {
                name: "MeasurePopulation",
                context: "population",
                accessLevel: "Public",
                expression: {
                    type: "AggregateExpression",
                    actionType: "aggquery",
                    source: [
                        {
                            name: "PatientRequest0",
                            type: "ExpressionRef",
                        },
                    ],
                    groupBy: [
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-priDiag-attributes-icd_10",
                        },
                    ],
                    measure: [
                        {
                            type: "Property",
                            path: "patient.attributes.pcount",
                            scope: "PatientRequest0",
                            alias: "patient.attributes.pcount",
                            templateId: "patient-attributes-pcount",
                        },
                    ],
                    having: [
                        {
                            type: "GreaterOrEqual",
                            operand: [
                                {
                                    type: "Property",
                                    path: "patient.attributes.pcount",
                                    scope: "PatientRequest0",
                                    alias: "patient.attributes.pcount",
                                    templateId: "patient-attributes-pcount",
                                },
                                {
                                    type: "Literal",
                                    valueType: "String",
                                    value: 1,
                                },
                            ],
                        },
                    ],
                    orderBy: [
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            axis: "x",
                            order: "ASC",
                            templateId:
                                "patient-conditions-acme-interactions-priDiag-attributes-icd_10",
                        },
                    ],
                },
            },
            {
                name: "PatientCount",
                context: "population",
                accessLevel: "Public",
                expression: {
                    type: "AggregateExpression",
                    actionType: "aggquery",
                    source: [
                        {
                            name: "PatientRequest0",
                            type: "ExpressionRef",
                        },
                    ],
                    groupBy: [
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-priDiag-attributes-icd_10",
                        },
                        {
                            type: "Property",
                            path: "patient.attributes.pid",
                            scope: "PatientRequest0",
                            alias: "patient.attributes.pid",
                            axis: "y",
                            templateId: "patient-attributes-pid",
                        },
                    ],
                    measure: [
                        {
                            type: "Property",
                            path: "patient.attributes.pcount",
                            scope: "PatientRequest0",
                            alias: "patient.attributes.pcount",
                            templateId: "patient-attributes-pcount",
                        },
                    ],
                },
            },
        ],
    },
};
