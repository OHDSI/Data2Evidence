sap.ui.require([
    "sap/hc/mri/pa/ui/lib/bookmarks/AnnotateBM",
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/tests/pa/ui/unit/lib/bookmarks/JsonBookmarkHelper"
], function (AnnotateBM, BMv2Parser, MriFrontendConfig, IFR2Bookmark, IFRBuilder, JsonBookmarkHelper) {
    "use strict";

    QUnit.module("AnnotateBM", {
        setup: function () {
            this.attributeParam1 = {
                instanceID: "patient.interactions.someInteraction.attributes.someAttribute.1",
                configPath: "patient.interactions.someInteraction.attributes.someAttribute"
            };
            this.attributeParam2 = {
                instanceID: "patient.interactions.someOtherInteraction.attributes.someOtherAttribute.1",
                configPath: "patient.interactions.someOtherInteraction.attributes.someOtherAttribute"
            };
            this.attributeParam3 = {
                instanceID: "patient.interactions.someInteraction.attributes.annotatedSomeAttribute.1",
                configPath: "patient.interactions.someInteraction.attributes.annotatedSomeAttribute"
            };
            this.attributeParam4 = {
                instanceID: "patient.interactions.someOtherInteraction.attributes.annotatedSomeOtherAttribute.1",
                configPath: "patient.interactions.someOtherInteraction.attributes.annotatedSomeOtherAttribute"
            };

            this.axisSelection1 = [{
                attributeId: "patient.interactions.someInteraction.1.attributes.someAttribute",
                binsize: "",
                categoryId: "x1"
            },
            {
                attributeId: "patient.interactions.someOtherInteraction.1.attributes.someOtherAttribute",
                binsize: "",
                categoryId: "x2"
            }];
            this.axisSelection2 = [{
                attributeId: "patient.interactions.someInteraction.1.attributes.annotatedSomeAttribute",
                binsize: "",
                categoryId: "x1"
            },
            {
                attributeId: "patient.interactions.someOtherInteraction.1.attributes.annotatedSomeOtherAttribute",
                binsize: "",
                categoryId: "x2"
            }];

            MriFrontendConfig.createFrontendConfig({
                config: {
                    patient: {
                        interactions: {
                            someInteraction: {
                                name: "someInteraction",
                                attributes: {
                                    someAttribute: {
                                        name: "someAttrubute",
                                        annotations: ["annotatedSomeAttribute"]
                                    }
                                }
                            },
                            someOtherInteraction: {
                                name: "someOtherInteraction",
                                attributes: {
                                    someOtherAttribute: {
                                        name: "someOtherAttribute",
                                        annotations: ["annotatedSomeOtherAttribute"]
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

    QUnit.test("Bookmark with annotations", function (assert) {
        QUnit.expect(2);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addAnd().addAttribute().setParameters(this.attributeParam1).up().addAttribute()
            .setParameters(this.attributeParam2);

        var testIFR = filterBuilder.build();

        var oBookmark = AnnotateBM.annotate(testIFR, this.axisSelection1, MriFrontendConfig.getFrontendConfig());

        var filter = JsonBookmarkHelper.getFilter();
        filter.cards = JsonBookmarkHelper.getFilterCard();
        filter.cards.attributes = JsonBookmarkHelper.getAnd(JsonBookmarkHelper.getAttribute(this.attributeParam3), JsonBookmarkHelper
            .getAttribute(this.attributeParam4));
        assert.deepEqual(oBookmark.filter.cards.attributes, filter.cards.attributes);
        assert.deepEqual(oBookmark.axisSelection, this.axisSelection2);
    });

    QUnit.test("Bookmark with deannotated attribute names", function (assert) {
        QUnit.expect(2);

        var filterBuilder = new IFRBuilder.FilterBuilder();
        filterBuilder.addFilterCard().addAnd().addAttribute().setParameters(this.attributeParam3).up().addAttribute()
            .setParameters(this.attributeParam4);

        var testIFR = filterBuilder.build();

        var oBookmark = AnnotateBM.deannotate(testIFR, this.axisSelection2, MriFrontendConfig.getFrontendConfig());

        var filter = JsonBookmarkHelper.getFilter();
        filter.cards = JsonBookmarkHelper.getFilterCard();
        filter.cards.attributes = JsonBookmarkHelper.getAnd(JsonBookmarkHelper.getAttribute(this.attributeParam1), JsonBookmarkHelper
            .getAttribute(this.attributeParam2));
        assert.deepEqual(filter.cards.attributes, filter.cards.attributes);
        assert.deepEqual(oBookmark.axisSelection, this.axisSelection1);
    });
});
