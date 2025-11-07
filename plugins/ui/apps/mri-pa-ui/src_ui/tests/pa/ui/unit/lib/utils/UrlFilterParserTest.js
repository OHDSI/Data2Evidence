sap.ui.require([
    "sap/hc/mri/pa/ui/lib/utils/UrlFilterParser"
], function (UrlFilterParser) {
    "use strict";

    QUnit.module("UrlFilterPaser");

    QUnit.test("UrlFilterPaser parse empty filter object", function (assert) {
        var urlFilterParser = new UrlFilterParser([]);

        var res = urlFilterParser.getPathAttributeValuePairs();

        assert.deepEqual(res, []);
    });

    QUnit.test("UrlFilterPaser parse simple filter object", function (assert) {
        var value = "value";

        var filterObject = [{
            interactionPath: {
                attributeId: value
            }
        }];

        var resultObject = {
            interactionPath: "interactionPath",
            attributeId: "attributeId",
            value: value
        };

        var urlFilterParser = new UrlFilterParser(filterObject);

        var res = urlFilterParser.getPathAttributeValuePairs();

        assert.deepEqual(res, [resultObject]);
    });
});
