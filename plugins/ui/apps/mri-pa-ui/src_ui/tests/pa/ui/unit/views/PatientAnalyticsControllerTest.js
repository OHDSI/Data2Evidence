sap.ui.require([
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig"
], function PATest(MriFrontendConfig) {
    "use strict";

    QUnit.module("PatientAnalyticsControllerTest - URL handling", {
        setup: function () {
            this.paController = _preparePAController();

            // This hurts...
            this.originalDimensions = sap.hc.mri.pa.ui.lib.Dimensions;
            sap.hc.mri.pa.ui.lib.Dimensions = 0;

            MriFrontendConfig.createFrontendConfig({
                config: {},
                meta: {}
            });

            sinon.stub(MriFrontendConfig.getFrontendConfig(), "getInitialChart");

            sinon.stub(sap.ui.getCore().getEventBus(), "subscribe");
        },
        teardown: function () {
            sap.ui.getCore().getEventBus().subscribe.restore();
            MriFrontendConfig.getFrontendConfig().getInitialChart.restore();
            sap.hc.mri.pa.ui.lib.Dimensions = this.originalDimensions;
        }
    });

    QUnit.test("PAController loads normally without parameters", function (assert) {
        var stub = sinon.stub(this.paController, "getOwnerComponent");

        stub.returns({
            getComponentData: function () {
                return {};
            }
        });

        this.paController.onInit();

        assert.ok(this.paController._loadDefaultFilters.calledOnce);
        assert.ok(this.paController._switchToChart.calledOnce);
    });

    QUnit.test("Parameter handling doesn't crash local dev environment", function (assert) {
        QUnit.expect(0);

        var stub = sinon.stub(this.paController, "getOwnerComponent");

        stub.returns({
            getComponentData: function () {
                return undefined;
            }
        });
        this.paController.onInit();
    });

    QUnit.test("Test url bookmark id handling", function (assert) {
        var bmkId = "6fba91f3-4cd6-4d8c-88f0-b3509d81916e";
        sinon.stub(this.paController, "getOwnerComponent").returns({
            getComponentData: function () {
                return {
                    startupParameters: {
                        bmkId: [bmkId]
                    }
                };
            }
        });

        var mock = sinon.mock(this.paController);
        mock.expects("_loadBookmarkWithId").once().withExactArgs(bmkId);

        this.paController.onInit();

        mock.verify();
    });

    QUnit.test("Test url filter handling", function (assert) {
        var filterString = '{"patient.conditions.acme.interactions.priDiag" : {"icd_10" : ["C50"]}}';
        sinon.stub(this.paController, "getOwnerComponent").returns({
            getComponentData: function () {
                return {
                    startupParameters: {
                        filterV1: [filterString]
                    }
                };
            }
        });

        var mock = sinon.mock(this.paController);
        mock.expects("_applyFilterFromUrl").once().withExactArgs(filterString);

        this.paController.onInit();

        mock.verify();
    });

    function _preparePAController() {
        var paController = sap.ui.controller("sap.hc.mri.pa.ui.views.PatientAnalytics");
        sinon.stub(paController, "_buildToolbar");
        sinon.stub(paController, "_loadDefaultFilters");
        sinon.stub(paController, "_switchToChart");
        sinon.stub(paController, "_updateFilterDescriptionColumnWidthOnSplitterResize");

        sinon.stub(paController, "getView").returns({
            addStyleClass: sinon.stub(),
            byId: sinon.stub(),
            setModel: sinon.stub()
        });

        paController.getView().byId.withArgs("bookmarks").returns({
            reinit: sinon.stub()
        });

        paController.getView().byId.withArgs("layMain").returns({
            getCenter: function () {
                return {
                    addStyleClass: sinon.stub()
                };
            }
        });

        paController.getView().byId.withArgs("filterContainer").returns({
            getChartableFilterCardInformation: sinon.stub()
        });

        return paController;
    }
});
