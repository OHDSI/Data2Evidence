sap.ui.require([
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/lib/ifr/SimpleVisitors",
    "sap/hc/mri/tests/pa/ui/unit/lib/bookmarks/JsonBookmarkHelper"
], function (BMv2Parser, SimpleVisitors, JsonHelper) {
    "use strict";

    QUnit.module("BMv2Parser");

    QUnit.test("Empty Filter", function (assert) {
        QUnit.expect(2);

        var filter = JsonHelper.getFilter();
        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilter: function (configMetadata, cards) {
                assert.equal(configMetadata.version, filter.configMetadata.version);
                assert.equal(configMetadata.id, filter.configMetadata.id);
            },
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, successor, attributes) {
                // There should be no FilterCards
                assert.ok(false);
            }
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Filter with ALL part (top level AND)", function (assert) {
        QUnit.expect(3);

        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();

        filter.cards = JsonHelper.getAnd(filterCard);

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, successor, attributes) {
                assert.equal(configPath, filterCard.configPath);
                assert.equal(instanceNumber, filterCard.instanceNumber);
                assert.equal(instanceID, filterCard.instanceID);
            }
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Filter with ALL and ANY part (1st level AND + 2nd level OR)", function (assert) {
        QUnit.expect(8);

        var filter = JsonHelper.getFilter();
        var filterCards = [JsonHelper.getFilterCard(), JsonHelper.getFilterCard()];

        filter.cards = JsonHelper.getAnd(filterCards[0], JsonHelper.getOr(filterCards[1]));

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitAndStart: function () {
                assert.ok(true);
            },
            onVisitOrStart: function () {
                assert.ok(true);
            },
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, successor, attributes) {
                assert.equal(configPath, filterCards[this._currentCardIndex].configPath);
                assert.equal(instanceNumber, filterCards[this._currentCardIndex].instanceNumber);
                assert.equal(instanceID, filterCards[this._currentCardIndex].instanceID);
                this._currentCardIndex += 1;
            }.bind({
                _currentCardIndex: 0
            })
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Filter with FilterCard with Attribute", function (assert) {
        QUnit.expect(2);

        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();
        var attribute = JsonHelper.getAttribute();

        filter.cards = filterCard;
        filterCard.attributes = attribute;

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitAttribute: function (configPath, instanceID, constraints) {
                assert.equal(configPath, attribute.configPath);
                assert.equal(instanceID, attribute.instanceID);
            }
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Filter with FilterCard with Attribute with Expression", function (assert) {
        QUnit.expect(2);

        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();
        var attribute = JsonHelper.getAttribute();
        var expression = JsonHelper.getExpression();

        filter.cards = filterCard;
        filterCard.attributes = attribute;
        attribute.constraints = expression;

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitExpression: function (operator, value) {
                assert.equal(operator, expression.operator);
                assert.equal(value, expression.value);
            }
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Filter with Not", function (assert) {
        QUnit.expect(4);

        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();
        var filterCardNot = JsonHelper.getFilterCard();
        var attribute = JsonHelper.getAttribute();
        var expression = JsonHelper.getExpression();

        filter.cards = JsonHelper.getAnd(
            filterCard,
            JsonHelper.getNot(filterCardNot)
        );
        filterCard.attributes = JsonHelper.getOr(attribute);
        attribute.constraints = JsonHelper.getNot(expression);

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitNotStart: function (notContent) {
                assert.ok(true, "Visitor passes Not-branch (twice)");
            },
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, successor, attributes) {
                assert.equal(configPath, this.expected.configPath, "Filter card value matches expected");
                this.expected = filterCardNot;
            }.bind({
                expected: filterCard
            })
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("FilterCard with Successor", function (assert) {
        QUnit.expect(3);

        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();
        var successorJson = JsonHelper.getSuccessor();

        filter.cards = filterCard;
        filterCard.successor = successorJson;

        var ifr = BMv2Parser.convertBM2IFR(filter);

        var filterVisitor = new SimpleVisitors.FilterVisitor({
            onVisitFilterCard: function (configPath, instanceNumber, instanceID, name, successor, attributes) {
                assert.equal(successor.id, successorJson.id);
                assert.equal(successor.minDaysBetween, successorJson.minDaysBetween);
                assert.equal(successor.maxDaysBetween, successorJson.maxDaysBetween);
            }
        });

        ifr.accept(filterVisitor);
    });

    QUnit.test("Parser fails with malformed bookmarks", function (assert) {
        assert.throws(function () {
            BMv2Parser.convertBM2IFR({});
        }, Error);

        assert.throws(function () {
            var filter = JsonHelper.getFilter();
            var filterCard = JsonHelper.getFilterCard();

            filter.cards = filterCard;
            filterCard.type = {};

            BMv2Parser.convertBM2IFR(filter);
        }, Error, "Undefined FilterCard type");

        assert.throws(function () {
            var filter = JsonHelper.getFilter();
            var filterCard = JsonHelper.getFilterCard();
            var attribute = JsonHelper.getAttribute();

            filter.cards = filterCard;
            filterCard.attributes = attribute;
            attribute.type = null;

            BMv2Parser.convertBM2IFR(filter);
        }, Error, "Undefined Attribute type");

        assert.throws(function () {
            var filter = JsonHelper.getFilter();
            var filterCard = JsonHelper.getFilterCard();
            var attribute = JsonHelper.getAttribute();
            var expression = JsonHelper.getExpression();

            filter.cards = filterCard;
            filterCard.attributes = attribute;
            attribute.constraints = expression;
            expression.type = undefined;

            BMv2Parser.convertBM2IFR(filter);
        }, Error, "Undefined Expression type");

        assert.throws(function () {
            var filter = JsonHelper.getFilter();

            filter.cards = JsonHelper.getAnd();
            filter.cards.op = "sap sap";

            BMv2Parser.convertBM2IFR(filter);
        }, Error, "Undefined Expression type");
    });
});
