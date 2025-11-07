sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/tests/pa/ui/unit/lib/bookmarks/JsonBookmarkHelper"
], function (IFR, ifr2bookmark, IFRBuilder, JsonHelper) {
    "use strict";

    QUnit.module("IFR2Bookmark");

    QUnit.test("Empty bookmark", function (assert) {
        var filter = JsonHelper.getFilter();

        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(filter.configMetadata.version, filter.configMetadata.id)
        });
        var testIFR = filterBuilder.build();

        var bookmark = ifr2bookmark(testIFR);

        assert.deepEqual(bookmark, filter);
    });

    QUnit.test("Bookmark with one card", function (assert) {
        var filter = JsonHelper.getFilter();
        var filterCard = JsonHelper.getFilterCard();

        filter.cards = filterCard;

        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(filter.configMetadata.version, filter.configMetadata.id)
        });
        filterBuilder.addFilterCard().setParameters(filterCard);
        var testIFR = filterBuilder.build();

        var bookmark = ifr2bookmark(testIFR);

        assert.deepEqual(bookmark, filter);
    });

    QUnit.test("Bookmark with multiple cards", function (assert) {
        var filter = JsonHelper.getFilter();
        var filterCards = [
            JsonHelper.getFilterCard(), JsonHelper.getFilterCard()
        ];

        filter.cards = JsonHelper.getAnd(filterCards[0], filterCards[1]);

        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(filter.configMetadata.version, filter.configMetadata.id)
        });
        filterBuilder.addAnd().addFilterCard().setParameters(filterCards[0]).up().addFilterCard().setParameters(
            filterCards[1]);
        var testIFR = filterBuilder.build();

        var bookmark = ifr2bookmark(testIFR);

        assert.deepEqual(bookmark, filter);
    });

    QUnit.test("Bookmark with excluded card", function (assert) {
        var filter = JsonHelper.getFilter();
        var filterCards = [
            JsonHelper.getFilterCard(), JsonHelper.getFilterCard()
        ];

        filter.cards = JsonHelper.getAnd(filterCards[0], JsonHelper.getNot(filterCards[1]));

        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(filter.configMetadata.version, filter.configMetadata.id)
        });
        filterBuilder.addAnd().addFilterCard().setParameters(filterCards[0]).up().addNot().addFilterCard()
            .setParameters(filterCards[1]);
        var testIFR = filterBuilder.build();

        var bookmark = ifr2bookmark(testIFR);

        assert.deepEqual(bookmark, filter);
    });
    QUnit.test("Adds config meta data in each bookmark", function (assert) {
        QUnit.expect(1);
        var filter = JsonHelper.getFilter();
        filter.configMetadata.id = "testConfig";
        filter.configMetadata.version = "A";

        var filterParam = {
            configMetadata: new IFR.ConfigMetadata("A", "testConfig")
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.setParameters(filterParam);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        assert.deepEqual(oBookmark, filter);
    });
    QUnit.test("Bookmark with multiple attributes", function (assert) {
        QUnit.expect(1);
        var attributeParam1 = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var attributeParam2 = {
            instanceID: "patient.empty.attributes.attrtest.2",
            configPath: "patient.empty.attributes.attrtest"
        };
        var attributeParam3 = {
            instanceID: "patient.empty.attributes.attrtest.3",
            configPath: "patient.empty.attributes.attrtest"
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addOr().addAttribute().setParameters(
                attributeParam1).up().addAnd().addAttribute().setParameters(attributeParam2).up().addAttribute()
            .setParameters(attributeParam3);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        var filter = JsonHelper.getFilter();
        filter.cards = JsonHelper.getFilterCard();
        filter.cards.attributes = JsonHelper.getOr(JsonHelper.getAttribute(attributeParam1), JsonHelper.getAnd(JsonHelper
            .getAttribute(attributeParam2), JsonHelper.getAttribute(attributeParam3)));
        assert.deepEqual(oBookmark.cards.attributes, filter.cards.attributes);
    });
    QUnit.test("Bookmark with one attribute with multiple constraints", function (assert) {
        QUnit.expect(1);
        var expressionParam1 = {
            operator: "=",
            value: 10
        };
        var expressionParam2 = {
            operator: ">",
            value: 10
        };
        var expressionParam3 = {
            operator: "<",
            value: 10
        };
        var expressionParam4 = {
            operator: ">=",
            value: 10
        };
        var expressionParam5 = {
            operator: "<=",
            value: 10
        };
        var expressionParam6 = {
            operator: "!=",
            value: 10
        };
        var expressionParam7 = {
            operator: "contains",
            value: "test"
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addAttribute().addOr().addExpression().setParameters(expressionParam1).up()
            .addExpression().setParameters(expressionParam2).up().addExpression().setParameters(expressionParam3).up()
            .addExpression().setParameters(expressionParam4).up().addExpression().setParameters(expressionParam5).up()
            .addExpression().setParameters(expressionParam6).up().addExpression().setParameters(expressionParam7).up();
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        var filter = JsonHelper.getFilter();
        filter.cards = JsonHelper.getFilterCard();
        filter.cards.attributes = JsonHelper.getAttribute();
        filter.cards.attributes.constraints =
            JsonHelper.getOr(JsonHelper.getExpression(expressionParam1), JsonHelper
                .getExpression(expressionParam2), JsonHelper
                .getExpression(expressionParam3), JsonHelper
                .getExpression(expressionParam4), JsonHelper
                .getExpression(expressionParam5), JsonHelper
                .getExpression(expressionParam6), JsonHelper
                .getExpression(expressionParam7));
        assert.deepEqual(oBookmark.cards.attributes.constraints, filter.cards.attributes.constraints);
    });
    QUnit.test("Bookmark with successor", function (assert) {
        QUnit.expect(1);
        var filterCardParam1 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1,
            successor: new IFR.Successor("patient.test.2", 10, 100)
        };

        var filterCardParam1Json = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            instanceNumber: 1,
            successor: {
                id: "patient.test.2",
                minDaysBetween: 10,
                maxDaysBetween: 100
            }
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().setParameters(filterCardParam1);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        var filter = JsonHelper.getFilter();
        filter.cards = JsonHelper.getFilterCard(filterCardParam1Json);
        assert.deepEqual(oBookmark.cards.successor, filter.cards.successor);
    });
    QUnit.test("Bookmark: inactive cards should be saved", function (assert) {
        QUnit.expect(1);
        var filterCardParam1 = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1,
            inactive: true
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().setParameters(filterCardParam1);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        var filter = JsonHelper.getFilter();
        filter.cards = JsonHelper.getFilterCard(filterCardParam1);
        assert.deepEqual(oBookmark.cards, filter.cards);
    });
    QUnit.test("The order of the cards should be saved", function (assert) {
        QUnit.expect(2);
        var filterCardParam1 = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            name: "FC1",
            instanceNumber: 1
        };
        var filterCardParam2 = {
            instanceID: "patient.test.1",
            configPath: "patient.test",
            name: "FC2",
            instanceNumber: 1
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addFilterCard().setParameters(filterCardParam1).up().addFilterCard().setParameters(
            filterCardParam2);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        assert.deepEqual(oBookmark.cards.content[0], JsonHelper.getFilterCard(filterCardParam1));
        assert.deepEqual(oBookmark.cards.content[1], JsonHelper.getFilterCard(filterCardParam2));
    });
    QUnit.test("Attributes with no constraints should be saved", function (assert) {
        QUnit.expect(1);
        var filterCardParam = {
            instanceID: "patient.empty.1",
            configPath: "patient.empty",
            instanceNumber: 1
        };
        var attributeParam = {
            instanceID: "patient.empty.attributes.attrtest.1",
            configPath: "patient.empty.attributes.attrtest"
        };
        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().setParameters(filterCardParam).addAttribute().setParameters(attributeParam);
        var testIFR = filterBuilder.build();
        var oBookmark = ifr2bookmark(testIFR);

        var filter = JsonHelper.getFilter();
        filter.cards = JsonHelper.getFilterCard(filterCardParam);
        filter.cards.attributes = JsonHelper.getAttribute(attributeParam);
        assert.deepEqual(oBookmark.cards, filter.cards);
    });
});
