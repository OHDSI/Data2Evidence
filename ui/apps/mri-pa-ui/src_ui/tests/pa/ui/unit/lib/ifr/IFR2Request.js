sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Request",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/VariantValidator"
], function (IFR, ifr2Request, IFRBuilder, MriFrontendConfig, VariantValidator) {
    "use strict";

    QUnit.module("IFR2Request", {
        setup: function () {
            sinon.stub(VariantValidator, "validateFromCache").returns({
                status: "Valid",
                geneName: "TP53",
                positionStart: 10,
                positionEnd: 20
            });

            // stub the config to recognize attributes ending in "location" as having the annotation "genomics_variant_location"
            sinon.stub(MriFrontendConfig, "getFrontendConfig").returns({
                getAttributeByPath: function (configPath) {
                    var pathParts = configPath.split(".");
                    var lastPathPart = pathParts.pop();
                    if (lastPathPart === "location") {
                        return {
                            hasAnnotation: function () {
                                return true;
                            }
                        };
                    } else {
                        return {
                            hasAnnotation: function () {
                                return false;
                            }
                        };
                    }
                }
            });
        },

        teardown: function () {
            // restore the stubbed methods
            VariantValidator.validateFromCache.restore();
            MriFrontendConfig.getFrontendConfig.restore();
        }
    });

    QUnit.test("Creates one request, if only 'and' filtercards are set", function (assert) {
        QUnit.expect(1);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var containerBuilder = filterBuilder.addAnd();
        var andContainerBuilder = containerBuilder.addAnd();
        containerBuilder.addOr();
        andContainerBuilder.addFilterCard();
        andContainerBuilder.addFilterCard();
        var testIFR = filterBuilder.build();

        var oFilterObject = ifr2Request(testIFR);
        assert.equal(oFilterObject.length, 1);
    });

    QUnit.test("Creates one request, if only one 'or' filtercard are set", function (assert) {
        QUnit.expect(1);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var containerBuilder = filterBuilder.addAnd();
        var andContainerBuilder = containerBuilder.addAnd();
        var orContainerBuilder = containerBuilder.addOr();
        andContainerBuilder.addFilterCard();
        andContainerBuilder.addFilterCard();
        orContainerBuilder.addFilterCard();
        var testIFR = filterBuilder.build();

        var oFilterObject = ifr2Request(testIFR);
        assert.equal(oFilterObject.length, 1);
    });

    QUnit.test("Creates two requests, if two 'or' filtercards are set", function (assert) {
        QUnit.expect(1);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var containerBuilder = filterBuilder.addAnd();
        var andContainerBuilder = containerBuilder.addAnd();
        var orContainerBuilder = containerBuilder.addOr();
        andContainerBuilder.addFilterCard();
        orContainerBuilder.addFilterCard();
        orContainerBuilder.addFilterCard();
        var testIFR = filterBuilder.build();

        var oFilterObject = ifr2Request(testIFR);
        assert.equal(oFilterObject.length, 2);
    });

    QUnit.test("'any' filtercards are only present in one request", function (assert) {
        QUnit.expect(5);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var containerBuilder = filterBuilder.addAnd();
        var andContainerBuilder = containerBuilder.addAnd();
        var orContainerBuilder = containerBuilder.addOr();
        andContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.and.1",
            configPath: "patient.and",
            instanceNumber: 1
        });
        orContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.or.1",
            configPath: "patient.or",
            instanceNumber: 1
        });
        orContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.or.2",
            configPath: "patient.or",
            instanceNumber: 2
        });
        var testIFR = filterBuilder.build();

        var oFilterObject = ifr2Request(testIFR);
        assert.equal(oFilterObject.length, 2);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("or") && oFilterObject[0].patient.or.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.hasOwnProperty("or") && !oFilterObject[0].patient.or.hasOwnProperty("2"));
        assert.ok(oFilterObject[1].patient.hasOwnProperty("or") && oFilterObject[1].patient.or.hasOwnProperty("2"));
        assert.ok(oFilterObject[1].patient.hasOwnProperty("or") && !oFilterObject[1].patient.or.hasOwnProperty("1"));
    });

    QUnit.test("'all' filtercards are present in all requests", function (assert) {
        QUnit.expect(3);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var containerBuilder = filterBuilder.addAnd();
        var andContainerBuilder = containerBuilder.addAnd();
        var orContainerBuilder = containerBuilder.addOr();
        andContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.and.1",
            configPath: "patient.and",
            instanceNumber: 1
        });
        orContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.or.1",
            configPath: "patient.or",
            instanceNumber: 1
        });
        orContainerBuilder.addFilterCard().setParameters({
            instanceID: "patient.or.2",
            configPath: "patient.or",
            instanceNumber: 2
        });
        var testIFR = filterBuilder.build();

        var oFilterObject = ifr2Request(testIFR);
        assert.equal(oFilterObject.length, 2);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("and") && oFilterObject[0].patient.and.hasOwnProperty("1"));
        assert.ok(oFilterObject[1].patient.hasOwnProperty("and") && oFilterObject[1].patient.and.hasOwnProperty("1"));
    });

    QUnit.test("Includes empty filtercards in the request", function (assert) {
        QUnit.expect(3);
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters({
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        });

        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("empty"));
        assert.ok(oFilterObject[0].patient.empty.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.empty["1"].hasOwnProperty("isFiltercard"));
    });

    QUnit.test("Doesn't include inactive filtercards in the request", function (assert) {
        QUnit.expect(4);
        var filterCardParam1 = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1,
            inactive: true
        };
        var filterCardParam2 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam1).up().addFilterCard()
            .setParameters(filterCardParam2);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(!oFilterObject[0].patient.hasOwnProperty("empty"));

        // Same test for a filter card containing a location attribute
        var locationAttributeParam = {
            instanceID: "patient.empty.attributes.location.1",
            configPath: "patient.empty.attributes.location"
        };
        var locFilterBuilder = new IFRBuilder.FilterBuilder();
        var aFilters = locFilterBuilder.addAnd().addAnd();
        aFilters.addFilterCard().setParameters(filterCardParam1).addAnd().addAttribute()
            .setParameters(locationAttributeParam);
        aFilters.addFilterCard().setParameters(filterCardParam2).addAnd().addAttribute()
            .setParameters(locationAttributeParam);
        var testLocationIFR = locFilterBuilder.build();
        var oLocationFilterObject = ifr2Request(testLocationIFR);
        assert.ok(oLocationFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(!oLocationFilterObject[0].patient.hasOwnProperty("empty"));
    });

    QUnit.test("Doesn't include inactive excluded filtercards in the request", function (assert) {
        QUnit.expect(2);
        var filterCardParam1 = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1,
            inactive: true
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addNot().addFilterCard().setParameters(filterCardParam1);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(!oFilterObject[0].patient);

        // Same test for a filter card containing a location attribute
        var locationAttributeParam = {
            instanceID: "patient.empty.attributes.location.1",
            configPath: "patient.empty.attributes.location"
        };
        var locFilterBuilder = new IFRBuilder.FilterBuilder();
        locFilterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam1).addAnd().addAttribute()
            .setParameters(locationAttributeParam);
        var testLocationIFR = locFilterBuilder.build();
        var oLocationFilterObject = ifr2Request(testLocationIFR);
        assert.ok(!oLocationFilterObject[0].patient);
    });

    QUnit.test("Properly uses a string constraint value", function (assert) {
        QUnit.expect(9);
        var filterCardParam = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var expressionParam = {
            value: "test"
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam).addAnd().addAttribute()
            .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.empty["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.hasOwnProperty("attrtest"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].value === "test");
    });

    QUnit.test("Properly uses a numerical constraint value", function (assert) {
        QUnit.expect(9);
        var filterCardParam = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var expressionParam = {
            value: 42
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam).addAnd().addAttribute()
            .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.empty["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.hasOwnProperty("attrtest"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].value === 42);
    });

    QUnit.test("Properly uses the operators", function (assert) {
        QUnit.expect(21);
        var filterCardParam = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var expressionParam1 = {
            operator: "="
        };
        var expressionParam2 = {
            operator: ">"
        };
        var expressionParam3 = {
            operator: "<"
        };
        var expressionParam4 = {
            operator: ">="
        };
        var expressionParam5 = {
            operator: "<="
        };
        var expressionParam6 = {
            operator: "!="
        };
        var expressionParam7 = {
            operator: "contains"
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam).addAnd().addAttribute()
            .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam1).up().addExpression()
            .setParameters(expressionParam2).up().addExpression().setParameters(expressionParam3).up().addExpression()
            .setParameters(expressionParam4).up().addExpression().setParameters(expressionParam5).up().addExpression()
            .setParameters(expressionParam6).up().addExpression().setParameters(expressionParam7).up();
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.empty["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.hasOwnProperty("attrtest"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter.length === 7);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].op === "=");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].op === ">");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[2].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[2].op === "<");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[3].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[3].op === ">=");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[4].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[4].op === "<=");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[5].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[5].op === "!=");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[6].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[6].op === "contains");
    });

    QUnit.test("Can combines two attribute expressions", function (assert) {
        QUnit.expect(15);
        var filterCardParam = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var expressionParam1 = {
            operator: "<=",
            value: 100
        };
        var expressionParam2 = {
            operator: ">",
            value: 10
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam).addAnd().addAttribute()
            .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam1).up().addExpression()
            .setParameters(expressionParam2);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.empty["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.hasOwnProperty("attrtest"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest.length === 1);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter.length === 2);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].op === "<=");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[0].value === 100);
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].op === ">");
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.empty["1"].attributes.attrtest[0].filter[1].value === 10);
    });

    QUnit.test("Creates an successor attribute for a filtercard with successor relations", function (assert) {
        QUnit.expect(9);
        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1,
            successor: new IFR.Successor("patient.test.2", 10, 100)
        };
        var filterCardParam2 = {
            instanceID: "patient.test.2",
            configPath: "patient.test",
            instanceNumber: 2
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam1).up().addFilterCard()
            .setParameters(filterCardParam2);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("2"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.hasOwnProperty("_succ"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].value === "patient.test.2");
    });

    QUnit.test("Creates an successor attribute with time constraints for a filtercard with time relations", function (assert) {
        QUnit.expect(21);
        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1,
            successor: new IFR.Successor("patient.test.2", 10, 100)
        };
        var filterCardParam2 = {
            instanceID: "patient.test.2",
            configPath: "patient.test",
            instanceNumber: 2
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam1).up().addFilterCard()
            .setParameters(filterCardParam2);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("2"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.hasOwnProperty("_succ"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].hasOwnProperty("and"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and.length === 2);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[0]
            .hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[0].op === ">=");
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[0]
            .hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[0].value === 10);
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[1]
            .hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[1].op === "<");
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[1]
            .hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes._succ[0].filter[0].and[1].value === 100);
    });

    QUnit.test("Sets 'exclude' to true for negated filtercards", function (assert) {
        QUnit.expect(4);
        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addNot().addFilterCard().setParameters(filterCardParam1);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("exclude"));
        assert.ok(oFilterObject[0].patient.test["1"].exclude);
    });

    QUnit.test("Sets 'exclude' to true for negated Location filtercards", function (assert) {
        QUnit.expect(4);
        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.location.1",
            configPath: "patient.empty.attributes.location"
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addNot().addFilterCard().setParameters(filterCardParam1).addAnd().addAttribute()
        .setParameters(attributeParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("exclude"));
        assert.ok(oFilterObject[0].patient.test["1"].exclude);
    });

    QUnit.test("Properly converts a location expression using the validation service", function (assert) {
        QUnit.expect(20);

        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.location.1",
            configPath: "patient.empty.attributes.location"
        };
        var expressionParam = {
            operator: "=",
            value: "testGene"
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addFilterCard().setParameters(filterCardParam1).addAnd().addAttribute()
        .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);

        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.hasOwnProperty("location"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].hasOwnProperty("and"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and.length === 2);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].op === ">=");
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].value === 10); // hard-coded mocked value
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].op === "<=");
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].value === 20); // hard-coded mocked value
    });

    QUnit.test("Properly converts a location expression in a negated filter card", function (assert) {
        QUnit.expect(22);

        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.location.1",
            configPath: "patient.empty.attributes.location"
        };
        var expressionParam = {
            operator: "=",
            value: "testGene"
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd().addNot().addFilterCard().setParameters(filterCardParam1).addAnd().addAttribute()
        .setParameters(attributeParam).addOr().addExpression().setParameters(expressionParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);

        assert.ok(oFilterObject[0].patient.hasOwnProperty("test"));
        assert.ok(oFilterObject[0].patient.test.hasOwnProperty("1"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("attributes"));
        assert.ok(oFilterObject[0].patient.test["1"].hasOwnProperty("exclude"));
        assert.ok(oFilterObject[0].patient.test["1"].exclude);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.hasOwnProperty("location"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].hasOwnProperty("filter"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter.length === 1);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].hasOwnProperty("and"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and instanceof Array);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and.length === 2);
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].op === ">=");
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[0].value === 10); // hard-coded mocked value
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].hasOwnProperty("op"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].op === "<=");
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].hasOwnProperty("value"));
        assert.ok(oFilterObject[0].patient.test["1"].attributes.location[0].filter[0].and[1].value === 20); // hard-coded mocked value
    });

    QUnit.test("Adds config meta data in each request", function (assert) {
        QUnit.expect(5);
        var filterParam = {
            configMetadata: new IFR.ConfigMetadata("A", "testConfig")
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.setParameters(filterParam);
        var testIFR = filterBuilder.build();
        var oFilterObject = ifr2Request(testIFR);
        assert.ok(oFilterObject[0].hasOwnProperty("configData"));
        assert.ok(oFilterObject[0].configData.hasOwnProperty("configId"));
        assert.ok(oFilterObject[0].configData.configId === "testConfig");
        assert.ok(oFilterObject[0].configData.hasOwnProperty("configVersion"));
        assert.ok(oFilterObject[0].configData.configVersion === "A");
    });
});
