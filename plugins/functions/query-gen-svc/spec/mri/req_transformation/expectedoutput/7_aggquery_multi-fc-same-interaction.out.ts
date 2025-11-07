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
                            alias: "chemo1",
                            type: "With",
                            expression: {
                                type: "Retrieve",
                                dataType: "chemo",
                                templateId:
                                    "patient-conditions-acme-interactions-chemo",
                            },
                            suchThat: {
                                type: "Or",
                                operand: [
                                    {
                                        type: "Equal",
                                        operand: [
                                            {
                                                type: "Property",
                                                path: "chemo_prot",
                                                scope: "chemo1",
                                                alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                                                axis: false,
                                            },
                                            {
                                                type: "Literal",
                                                valueType: "String",
                                                value: "FOLFOX",
                                            },
                                        ],
                                    },
                                    {
                                        type: "Equal",
                                        operand: [
                                            {
                                                type: "Property",
                                                path: "chemo_prot",
                                                scope: "chemo1",
                                                alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                                                axis: false,
                                            },
                                            {
                                                type: "Literal",
                                                valueType: "String",
                                                value: "COPP",
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            alias: "chemo2",
                            type: "With",
                            expression: {
                                type: "Retrieve",
                                dataType: "chemo",
                                templateId:
                                    "patient-conditions-acme-interactions-chemo",
                            },
                        },
                        {
                            alias: "chemo3",
                            type: "With",
                            expression: {
                                type: "Retrieve",
                                dataType: "chemo",
                                templateId:
                                    "patient-conditions-acme-interactions-chemo",
                            },
                        },
                    ],
                    where: {
                        type: "And",
                        operand: [
                            {
                                type: "NotEqual",
                                operand: [
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo1",
                                    },
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo2",
                                    },
                                ],
                            },
                            {
                                type: "NotEqual",
                                operand: [
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo1",
                                    },
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo3",
                                    },
                                ],
                            },
                            {
                                type: "NotEqual",
                                operand: [
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo2",
                                    },
                                    {
                                        type: "Property",
                                        path: "INTERACTION_ID",
                                        scope: "chemo3",
                                    },
                                ],
                            },
                        ],
                    },
                    groupBy: [
                        {
                            type: "Property",
                            path: "chemo_prot",
                            scope: "chemo1",
                            alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
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
                            path: "chemo_ops",
                            scope: "chemo2",
                            alias: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            axis: "x",
                        },
                        {
                            type: "Property",
                            path: "calYear",
                            scope: "chemo3",
                            alias: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            axis: "x",
                            binsize: 5,
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
                            path: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_prot",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_ops",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            axis: "x",
                            binsize: 5,
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-calYear",
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
                            path: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            axis: "x",
                            order: "ASC",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_prot",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            axis: "x",
                            order: "ASC",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_ops",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            axis: "x",
                            order: "ASC",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-calYear",
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
                            path: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_prot",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                            axis: "x",
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-chemo_ops",
                        },
                        {
                            type: "Property",
                            path: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            scope: "PatientRequest0",
                            alias: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
                            axis: "x",
                            binsize: 5,
                            templateId:
                                "patient-conditions-acme-interactions-chemo-attributes-calYear",
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
