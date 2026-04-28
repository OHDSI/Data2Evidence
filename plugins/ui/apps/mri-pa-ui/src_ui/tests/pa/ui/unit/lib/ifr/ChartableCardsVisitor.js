sap.ui.require([
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/ChartableCardsVisitor",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder"
], function ChartableCardsVisitorTest(MriFrontendConfig, IFR, ChartableCardsVisitor, IFRBuilder) {
    "use strict";

    QUnit.module("ChartableCardsVisitor", {
        setup: function () {
            sinon.stub(MriFrontendConfig, "getFrontendConfig").returns({
                getFilterCardByPath: function (configPath) {
                    return {
                        getAllAttributes: function () {
                            return this.aAttributes.map(function (mAttribute) {
                                return {
                                    getConfigKey: function () {
                                        return mAttribute.key;
                                    },
                                    getName: function () {
                                        return mAttribute.name;
                                    },
                                    isVisibleInFilterCard: function () {
                                        return mAttribute.visible;
                                    }
                                };
                            });
                        }.bind(this)
                    };
                }.bind(this)
            });
        },

        teardown: function () {
            MriFrontendConfig.getFrontendConfig.restore();
        }
    });

    QUnit.test("Empty IFR", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, []);
    });

    QUnit.test("IFR with one card", function (assert) {
        this.aAttributes = [];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard"
        }]);
    });

    QUnit.test("IFR with multiple cards", function (assert) {
        this.aAttributes = [];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addAnd().addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard A"
        }).up().addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.1",
            name: "FilterCard B"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard A"
        }, {
            aAttributes: [],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.1",
            sFilterCardName: "FilterCard B"
        }]);
    });

    QUnit.test("IFR with excluded card", function (assert) {
        this.aAttributes = [];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addNot().addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, []);
    });

    QUnit.test("IFR with inactive card", function (assert) {
        this.aAttributes = [];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard",
            inactive: true
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, []);
    });

    QUnit.test("IFR with or section", function (assert) {
        this.aAttributes = [];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addAnd().addAnd().addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard A"
        }).up().up().addOr().addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.1",
            name: "FilterCard B"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard A"
        }]);
    });

    QUnit.test("IFR with attributes", function (assert) {
        this.aAttributes = [{
            key: "attr1",
            name: "Attribute 1",
            visible: false
        }, {
            key: "attr2",
            name: "Attribute 2",
            visible: false
        }];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [
                {
                    bAvailable: true,
                    sAttributeInstance: "card.0.attributes.attr1",
                    sAttributeName: "Attribute 1"
                }, {
                    bAvailable: true,
                    sAttributeInstance: "card.0.attributes.attr2",
                    sAttributeName: "Attribute 2"
                }
            ],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard"
        }]);
    });

    QUnit.test("IFR with invisible attributes", function (assert) {
        this.aAttributes = [{
            key: "attr1",
            name: "Attribute 1",
            visible: false
        }, {
            key: "attr2",
            name: "Attribute 2",
            visible: true
        }];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [
                {
                    bAvailable: true,
                    sAttributeInstance: "card.0.attributes.attr1",
                    sAttributeName: "Attribute 1"
                }, {
                    bAvailable: false,
                    sAttributeInstance: "card.0.attributes.attr2",
                    sAttributeName: "Attribute 2"
                }
            ],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard"
        }]);
    });

    QUnit.test("IFR with attributes on FilterCards", function (assert) {
        this.aAttributes = [{
            key: "attr1",
            name: "Attribute 1",
            visible: true
        }, {
            key: "attr2",
            name: "Attribute 2",
            visible: true
        }];
        var oFilterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata("1", "1")
        });
        oFilterBuilder.addFilterCard().setParameters({
            configPath: "card",
            instanceID: "card.0",
            name: "FilterCard"
        }).addAttribute().setParameters({
            configPath: "attr1",
            instanceID: "card.0.attributes.attr2"
        });
        var oIFR = oFilterBuilder.build();

        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(oIFR);

        assert.deepEqual(aChartableFilterCards, [{
            aAttributes: [
                {
                    bAvailable: false,
                    sAttributeInstance: "card.0.attributes.attr1",
                    sAttributeName: "Attribute 1"
                }, {
                    bAvailable: true,
                    sAttributeInstance: "card.0.attributes.attr2",
                    sAttributeName: "Attribute 2"
                }
            ],
            sFilterCardConfigPath: "card",
            sFilterCardInstance: "card.0",
            sFilterCardName: "FilterCard"
        }]);
    });
});
