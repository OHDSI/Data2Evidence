export let input = {
    cards: {
        content: [{
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
            }],
        },
        {
            content: [{
                _configPath: "patient.conditions.acme.interactions.chemo",
                _instanceNumber: 1,
                _instanceID: "patient.conditions.acme.interactions.chemo.1",
                _name: "Chemotherapy A",
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
                            content: [{
                                _operator: "=",
                                _value: "FOLFOX",
                            },
                            {
                                _operator: "=",
                                _value: "COPP",
                            }],
                        },
                    }],
                },
            }],
        },
        {
            content: [{
                _configPath: "patient.conditions.acme.interactions.chemo",
                _instanceNumber: 2,
                _instanceID: "patient.conditions.acme.interactions.chemo.2",
                _name: "Chemotherapy B",
                _attributes: {
                    content: [{
                        _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_ops",
                        _instanceID: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
                        _constraints: {
                            content: [],
                        },
                    },
                    {
                        _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_prot",
                        _instanceID: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
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
                _instanceNumber: 3,
                _instanceID: "patient.conditions.acme.interactions.chemo.3",
                _name: "Chemotherapy C",
                _attributes: {
                    content: [{
                        _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_ops",
                        _instanceID: "patient.conditions.acme.interactions.chemo.3.attributes.chemo_ops",
                        _constraints: {
                            content: [],
                        },
                    },
                    {
                        _configPath: "patient.conditions.acme.interactions.chemo.attributes.chemo_prot",
                        _instanceID: "patient.conditions.acme.interactions.chemo.3.attributes.chemo_prot",
                        _constraints: {
                            content: [],
                        },
                    },
                    {
                        _configPath: "patient.conditions.acme.interactions.chemo.attributes.calYear",
                        _instanceID: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
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
        id: "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        configPath: "patient.conditions.acme.interactions.chemo",
        instanceID: "patient.conditions.acme.interactions.chemo.1",
        axis: "x",
        seq: 1,
    },
    {
        id: "patient.conditions.acme.interactions.chemo.2.attributes.chemo_ops",
        configPath: "patient.conditions.acme.interactions.chemo",
        instanceID: "patient.conditions.acme.interactions.chemo.2",
        axis: "x",
        seq: 2,
    },
    {
        id: "patient.conditions.acme.interactions.chemo.3.attributes.calYear",
        configPath: "patient.conditions.acme.interactions.chemo",
        instanceID: "patient.conditions.acme.interactions.chemo.3",
        axis: "x",
        seq: 3,
        binsize: 5,
    },
    {
        id: "patient.attributes.pcount",
        configPath: "patient",
        instanceID: "patient",
        axis: "y",
        seq: 1,
    }],
    configData: {
        configId: "0212D958C3FDCC16E10000000A2C657E",
        configVersion: "A",
    },
};
