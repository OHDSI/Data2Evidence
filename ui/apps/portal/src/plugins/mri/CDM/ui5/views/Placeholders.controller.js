sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/core/mvc/Controller",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/Dialog",
    "hc/hph/cdw/config/ui/lib/ConfigModelsData",
], function (ConfigUtils, BackendLinker, Controller, TextArea, Button, Dialog, ConfigModelsData) {
    "use strict";
    var factTableAttributePath = "/tableTypePlaceholderMap/factTable/attributeTables";
    var dimTablePath = "/tableTypePlaceholderMap/dimTables";

    var view = Controller.extend("hc.hph.cdw.config.ui.views.Placeholders", {
        onInit: function () {
            this._eventBus = sap.ui.getCore().getEventBus();
            this.getView().addStyleClass("sapMxConfigUi");
            this._configModelsData = new ConfigModelsData();
        },
        onExit: function () {


            // destroy the model manager in order to unsubscribe from events as well
            this._oModelMgr.destroy();
        },
        onBeforeRendering: function () {

        },
        onAfterRendering: function () {

        },
        setModelManager: function (oModelMgr) {
            this._oModelMgr = oModelMgr;
        },
        listEnabler: function (columns) {
            if (columns) {
                return columns.length > 0;
            }
            return false;
        },
        columnFactory: function (sId, oContext) {
            var that = this;
            var column = oContext.getProperty("name");
            var value = column ? "\"" + column + "\"" : "";
            var itemControl = new sap.ui.core.Item(sId, {
                key: value,
                text: value
            });

            return itemControl;
        },
        addBaseAttributeTable: function (oEvent) {
            var oPath = oEvent.oSource.getParent().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/attributeTables";
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(oPath);
            oData.push(this._configModelsData.getEmptyFactTableAttribute());
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(oPath, oData);
        },
        addDimTable: function (oEvent) {
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(dimTablePath);
            oData.push(this._configModelsData.getEmptyDimTable());
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(dimTablePath, oData);
        },
        addDimAttributeTable: function (oEvent) {
            var oPath = oEvent.oSource.getParent().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/attributeTables";
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(oPath);
            oData.push(this._configModelsData.getEmptyDimAttributeTable());
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(oPath, oData);
        },
        deleteAttributeTable: function (oEvent) {
            var oPath = oEvent.oSource.getParent().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath().split("/");
            var index = oPath.pop();
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(oPath.join("/"));
            oData.splice(index, 1);
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(oPath.join("/"), oData);
        },        
        getColumns: function (oEvent) {
            var oPath = oEvent.oSource.getParent().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath();
            var dbObject = oEvent.getSource().getValue();
            var view = this.getView();
            BackendLinker.getColumns([{ key: "table", value: dbObject }])
                .done(function (data, status) {
                    if(status === "success"){
                        view.getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(oPath + "/columns", data.result["table"]);
                    }
            });            
        },
        toUpper: function (oEvent) {
            var oInput = oEvent.getSource();
            var val = oEvent.getSource().getValue();
            oInput.setValue(val.toUpperCase());
        },
        reset: function () {
            
        }
    });

    return view;
});
