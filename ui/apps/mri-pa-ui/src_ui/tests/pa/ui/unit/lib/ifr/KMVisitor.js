sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/KMVisitor",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder"
], function (KMVisitor, IFRBuilder) {
    "use strict";

    QUnit.module("KMVisitor Tests");

    QUnit.test("List has one element if only one Filtercard is added", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        oFilterBuilder.addAnd().addAnd().addFilterCard();
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames.length, 1);
    });

    QUnit.test("List has two elements if two Filtercards are added", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        var oContainerBuilder = oFilterBuilder.addAnd().addAnd();
        oContainerBuilder.addFilterCard();
        oContainerBuilder.addFilterCard();
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames.length, 2);
    });

    QUnit.test("List element has the correct properties", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        oFilterBuilder.addAnd().addAnd().addFilterCard().setParameters({
            instanceID: "fc",
            name: "FC Name"
        });
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames[0].key, "fc", "correct key");
        assert.equal(aNames[0].name, "FC Name", "correct name");
    });

    QUnit.test("Ignores FilterCards in the Any-Section", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        oFilterBuilder.addAnd().addOr().addFilterCard();
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames.length, 0);
    });

    QUnit.test("Ignores negated FilterCards", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        oFilterBuilder.addAnd().addAnd().addNot().addFilterCard();
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames.length, 0);
    });

    QUnit.test("Ignores the 'Basic Data' FilterCards", function (assert) {
        var oFilterBuilder = new IFRBuilder.FilterBuilder();
        oFilterBuilder.addAnd().addAnd().addFilterCard().setParameters({
            configPath: "patient",
            instanceID: "patient",
            name: "Basic Data"
        });
        var oIFR = oFilterBuilder.build();

        var aNames = KMVisitor.getFilterCardNames(oIFR);
        assert.equal(aNames.length, 0);
    });
});
