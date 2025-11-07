sap.ui.require([
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/TagInput",
    "sap/ui/core/ListItem"
], function TagInputTest(MriFrontendConfig, TagInput, ListItem) {
    "use strict";

    QUnit.module("TagInput");

    // Regression test for 0020751294 0000134279 2016
    // TODO: Skipping this test against SAP UI version 1.28.42, This has to be fixed later.
    QUnit.skip("Select event on bold text", function boldTestSelectionTest(assert) {
        // Arrange
        // Create a Config object as the TagElement requires it
        MriFrontendConfig.createFrontendConfig({
            config: {},
            meta: {}
        });
        var oTagInput = new TagInput({
            items: [
                new ListItem({
                    key: "key1",
                    text: "text1"
                }),
                new ListItem({
                    key: "key2",
                    text: "<b>bold text</b>"
                })
            ]
        });

        // Act
        oTagInput.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();
        oTagInput._openBusyBox();
        oTagInput._openBox();
        oTagInput._getListBox().$("list").find("li:nth-child(2) b").click();
        // Assert
        assert.equal(oTagInput.getMyTags()[0].getText(), "key2", "Correct key is selected");
    });
});
