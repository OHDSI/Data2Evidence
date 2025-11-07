sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/pa/ui/lib/ifr/SimpleVisitors"
], function (BooleanContainers, IFR, IFRBuilder, SimpleVisitors) {
    "use strict";

    QUnit.module("IFRBuilder Tests");

    QUnit.test("Build an empty filter", function (assert) {
        var filterBuilder = new IFRBuilder.FilterBuilder();
        var filter = filterBuilder.build();
        assert.ok(filter instanceof IFR.Filter);
    });

    QUnit.test("Build an empty filter with metadata", function (assert) {
        QUnit.expect(2);

        var version = "1";
        var id = "MyId";
        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(version, id)
        });
        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilter: function (configMetadata) {
                assert.equal(configMetadata.version, version);
                assert.equal(configMetadata.id, id);
            },
            onVisitFilterCard: function () {
                // There should be no FilterCards
                assert.ok(false);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with an empty filtercard", function (assert) {
        QUnit.expect(7);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard();

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
                assert.equal(configPath, "");
                assert.equal(instanceNumber, 0);
                assert.equal(instanceID, "");
                assert.equal(name, "");
                assert.equal(successor, null);
                assert.ok(attributes instanceof BooleanContainers.BooleanContainer);
                assert.equal(inactive, false);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with a filtercard with parameters", function (assert) {
        QUnit.expect(7);

        var expected = {
            configPath: "path 1",
            instanceNumber: 1,
            instanceID: "id 1",
            name: "name 1",
            inactive: true
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().setParameters(expected);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
                assert.equal(configPath, expected.configPath);
                assert.equal(instanceNumber, expected.instanceNumber);
                assert.equal(instanceID, expected.instanceID);
                assert.equal(name, expected.name);
                assert.equal(successor, null);
                assert.ok(attributes instanceof BooleanContainers.BooleanContainer);
                assert.equal(inactive, expected.inactive);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with a filtercard with an empty attribute", function (assert) {
        QUnit.expect(2);

        var expected = {
            configPath: "path 1",
            instanceID: "id 1"
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        var filterCardBuilder = filterBuilder.addFilterCard();
        filterCardBuilder.addAttribute().setParameters(expected);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitAttribute: function (configPath, instanceID) {
                assert.equal(configPath, expected.configPath);
                assert.equal(instanceID, expected.instanceID);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with a filtercard with an attribute and an expression", function (assert) {
        QUnit.expect(2);

        var expressionParam = {
            operator: "=",
            value: 42
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        var filterCardBuilder = filterBuilder.addFilterCard();
        var attributeBuilder = filterCardBuilder.addAttribute();
        attributeBuilder.addExpression().setParameters(expressionParam);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitExpression: function (operator, value) {
                assert.equal(operator, expressionParam.operator);
                assert.equal(value, expressionParam.value);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with a filtercard with an attribute and an expression (alternative)", function (assert) {
        QUnit.expect(2);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addAttribute().addExpression("=", 42);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitExpression: function (operator, value) {
                assert.equal(operator, "=");
                assert.equal(value, 42);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Handle falsy expression parameters correctly", function (assert) {
        QUnit.expect(2);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addAttribute().addExpression("=", "");

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitExpression: function (operator, value) {
                assert.equal(operator, "=");
                assert.strictEqual(value, "");
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with a filtercard with an attribute and and two and'ed expressions", function (assert) {
        QUnit.expect(4);

        var expressionParams = [{
            operator: "=",
            value: 42
        }, {
            operator: "!=",
            value: 17
        }];

        var filterBuilder = new IFRBuilder.FilterBuilder();
        var filterCardBuilder = filterBuilder.addFilterCard();
        var attributeBuilder = filterCardBuilder.addAttribute().addAnd();
        attributeBuilder.addExpression().setParameters(expressionParams[0]);
        attributeBuilder.addExpression().setParameters(expressionParams[1]);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitExpression: function (operator, value) {
                if (this.first) {
                    assert.equal(operator, expressionParams[0].operator);
                    assert.equal(value, expressionParams[0].value);
                    this.first = false;
                } else {
                    assert.equal(operator, expressionParams[1].operator);
                    assert.equal(value, expressionParams[1].value);
                }
            }.bind({
                first: true
            })
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with or'd filtercards", function (assert) {
        QUnit.expect(3);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder = filterBuilder.addOr();
        filterBuilder.addFilterCard();
        filterBuilder.addFilterCard();

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilter: function (configMetadata, cards) {
                assert.ok(cards instanceof BooleanContainers.Or);
            },
            onVisitFilterCard: function () {
                assert.ok(true);
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Build a filter with an included and an excluded filtercard", function (assert) {
        QUnit.expect(5);

        var expectedFilterCards = [{
            configPath: "path 1"
        }, {
            configPath: "path 2"
        }];

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder = filterBuilder.addAnd();
        filterBuilder.addFilterCard().setParameters(expectedFilterCards[0]);
        filterBuilder.addNot().addFilterCard().setParameters(expectedFilterCards[1]);

        var filter = filterBuilder.build();

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilter: function (configMetadata, cards) {
                assert.ok(cards instanceof BooleanContainers.And);
            },
            onVisitAndStart: function (content) {
                assert.ok(content[0] instanceof IFR.FilterCard);
                content[0].accept({
                    visitFilterCard: function (configPath) {
                        assert.equal(configPath, expectedFilterCards[0].configPath);
                    }
                });
            },
            onVisitNotStart: function (content) {
                assert.ok(content[0] instanceof IFR.FilterCard);
                content[0].accept({
                    visitFilterCard: function (configPath) {
                        assert.equal(configPath, expectedFilterCards[1].configPath);
                    }
                });
            }
        });

        filter.accept(filterVisitor);
    });

    QUnit.test("Fail when adding two FilterCards at Filter level", function (assert) {
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard();
        assert.throws(function () {
            filterBuilder.addFilterCard();
        }, Error);
    });

    QUnit.test("Go up one builder level in FilderCards", function () {
        QUnit.expect(0);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder
            .addAnd()
            .addFilterCard().up()
            .addFilterCard();
    });

    QUnit.test("Go up one builder level in Attributes", function () {
        QUnit.expect(0);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder
            .addFilterCard()
            .addAnd()
            .addAttribute().up()
            .addAttribute();
    });

    QUnit.test("Go up one builder level in Expressions", function () {
        QUnit.expect(0);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        var expressionParam = {
            operator: "=",
            value: 1
        };

        filterBuilder
            .addFilterCard()
            .addAttribute()
            .addAnd()
            .addExpression().setParameters(expressionParam).up()
            .addExpression().setParameters(expressionParam);
    });

    QUnit.test("Go up several builder levels", function () {
        QUnit.expect(0);

        var filterBuilder = new IFRBuilder.FilterBuilder();

        filterBuilder
            .addFilterCard()
            .addAnd()
            .addAttribute()
            .addAnd()
            .addExpression().up().up().up()
            .addAttribute();
    });
});
