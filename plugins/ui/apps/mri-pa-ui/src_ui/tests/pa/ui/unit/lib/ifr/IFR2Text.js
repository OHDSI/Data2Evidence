sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Text",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig"
], function (ifr2Text, IFRBuilder, MriFrontendConfig) {
    "use strict";

    QUnit.module("IFR2Text", {
        setup: function () {
            MriFrontendConfig.createFrontendConfig({
                config: {
                    patient: {
                        interactions: {
                            someInteraction: {
                                name: "Interaction 1",
                                attributes: {
                                    someAttribute: {
                                        name: "Attribute 1"
                                    }
                                }
                            }
                        }
                    }
                },
                meta: {}
            });
        },
        teardown: function () {
            MriFrontendConfig.createFrontendConfig({});
        }
    });

    QUnit.test("Handle non-string attribute filter values correctly", function (assert) {
        QUnit.expect(4);

        var filterCardSettings = {
            configPath: "patient.interactions.someInteraction"
        };

        var attributeSettings = {
            configPath: "patient.interactions.someInteraction.attributes.someAttribute"
        };

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addAnd().addAnd()
            .addFilterCard().setParameters(filterCardSettings)
            .addAttribute().setParameters(attributeSettings)
            .addOr()
            .addExpression("=", 23).up()
            .addExpression(">", 42);

        var testIFR = filterBuilder.build();

        var oFilterString = ifr2Text(testIFR);

        assert.ok(oFilterString.indexOf("Interaction 1") >= 0);
        assert.ok(oFilterString.indexOf("Attribute 1") >= 0);
        assert.ok(oFilterString.indexOf("23") >= 0);
        assert.ok(oFilterString.indexOf("42") >= 0);
    });
});
