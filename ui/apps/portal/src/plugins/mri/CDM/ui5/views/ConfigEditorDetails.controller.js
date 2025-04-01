sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller"
], function (ConfigUtils, Controller) {
    "use strict";

    var ConfigEditorDetailsController = Controller.extend("hc.hph.cdw.config.ui.views.ConfigEditorDetails");

    ConfigEditorDetailsController.prototype.onInit = function () {
        this._eventBus = sap.ui.getCore().getEventBus();

        this.noErrorMsg = "CONFIG_TEST_NO_ERRORS";


        if (!this.filterCardItemView) {
            this.filterCardItemView = sap.ui.xmlview({ type: sap.ui.core.mvc.ViewType.XML, viewName: "hc.hph.cdw.config.ui.views.FilterCardItem" });
        }

        if (!this.attributeView) {
            this.attributeView = sap.ui.xmlview({ type: sap.ui.core.mvc.ViewType.XML, viewName: "hc.hph.cdw.config.ui.views.Attribute" });
        }



        this._filterCardItemLayout = this.getView().byId(
            "filterCardItemLayout");
        this._filterCardItemLayout.addContent(this.filterCardItemView);
        this._filterCardItemLayout.setVisible(false);

        this._AttributeLayout = this.getView().byId("AttributeLayout");
        this._AttributeLayout.addContent(this.attributeView);
        this._AttributeLayout.setVisible(false);

        this._eventBus
            .subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
                this._showFilterCard,
                this);

        this._eventBus
            .subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
                this._showAttribute,
                this);

        this._eventBus
            .subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_ATTRIBUTE,
                this._hideAttribute,
                this);

        this._eventBus
            .subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC,
                this._hideFilterCard,
                this);

    };

    ConfigEditorDetailsController.prototype.onBeforeRendering = function () {
    };

    ConfigEditorDetailsController.prototype.onAfterRendering = function () {
    };

    ConfigEditorDetailsController.prototype.onExit = function () {
        this._eventBus
            .unsubscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
                this._showFilterCard,
                this);

        this._eventBus
            .unsubscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
                this._showAttribute,
                this);

        this._eventBus
            .unsubscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_ATTRIBUTE,
                this._hideAttribute,
                this);

        this._eventBus
            .unsubscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC,
                this._hideFilterCard,
                this);

    };

    ConfigEditorDetailsController.prototype.setModelManager = function (oModelMgr) {
        this._oModelMgr = oModelMgr;
    };

    ConfigEditorDetailsController.prototype._showFilterCard = function () {

        var layout2 = this._filterCardItemLayout;
        layout2.setVisible(true);

        var layout3 = this._AttributeLayout;
        layout3.setVisible(false);

    };

    ConfigEditorDetailsController.prototype._hideFilterCard = function () {

        var layout2 = this._filterCardItemLayout;
        layout2.setVisible(false);

        var layout3 = this._AttributeLayout;
        layout3.setVisible(false);

    };

    ConfigEditorDetailsController.prototype._showAttribute = function () {

        var layout3 = this._AttributeLayout;
        layout3.setVisible(true);

    };

    ConfigEditorDetailsController.prototype._hideAttribute = function () {

        var layout3 = this._AttributeLayout;
        layout3.setVisible(false);

    };

    return ConfigEditorDetailsController;
});    
