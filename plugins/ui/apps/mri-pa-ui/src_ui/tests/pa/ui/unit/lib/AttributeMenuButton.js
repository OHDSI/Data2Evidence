sap.ui.require([
    "sap/hc/mri/pa/ui/lib/AttributeMenuButton"
], function AttributeMenuButtonTest(AttributeMenuButton) {
    "use strict";

    QUnit.module("AttributeMenuButton");

    QUnit.test("init", function (assert) {
        // Arrange
        var oAttributeMenuButton = new AttributeMenuButton();

        // Assert
        assert.ok(oAttributeMenuButton.hasStyleClass("sapMriPaAttributeMenuButton"), "StyleClass is added");
        assert.strictEqual(oAttributeMenuButton.getText(), "", "Text is empty");
        assert.strictEqual(oAttributeMenuButton.getTooltip(), null, "Tooltip is empty");
    });

    QUnit.test("setSelection to invalid", function (assert) {
        // Arrange
        var oAttributeMenuButton = new AttributeMenuButton();
        oAttributeMenuButton.setSelection(sap.hc.mri.pa.ui.lib.Selection.Invalid);

        // Assert
        assert.strictEqual(oAttributeMenuButton.getText(), "", "Text is empty");
        assert.strictEqual(oAttributeMenuButton.getTooltip(), null, "Tooltip is empty");
    });

    QUnit.test("setSelection to valid without chartableFilterCards", function (assert) {
        // Arrange
        var oAttributeMenuButton = new AttributeMenuButton();
        oAttributeMenuButton.setSelection("valid.selection");

        // Assert
        assert.strictEqual(oAttributeMenuButton.getText(), "", "Text is empty");
        assert.strictEqual(oAttributeMenuButton.getTooltip(), null, "Tooltip is empty");
    });

    QUnit.test("setChartableFilterCards without selection", function (assert) {
        // Arrange
        var oAttributeMenuButton = new AttributeMenuButton();
        oAttributeMenuButton.setChartableFilterCards([{}]);

        // Assert
        assert.strictEqual(oAttributeMenuButton.getText(), "", "Text is empty");
        assert.strictEqual(oAttributeMenuButton.getTooltip(), null, "Tooltip is empty");
    });

    QUnit.test("setChartableFilterCards and setSelection", function (assert) {
        // Arrange
        var oAttributeMenuButton = new AttributeMenuButton();
        oAttributeMenuButton.setSelection("card.1.attributes.attr");
        oAttributeMenuButton.setChartableFilterCards([{
            sFilterCardName: "Card",
            aAttributes: [{
                sAttributeName: "Attr",
                sAttributeInstance: "card.1.attributes.attr"
            }]
        }]);

        // Assert
        assert.strictEqual(oAttributeMenuButton.getText(), "Attr", "Text is set");
        assert.strictEqual(oAttributeMenuButton.getTooltip(), "Card - Attr", "Tooltip is set");
    });
});
