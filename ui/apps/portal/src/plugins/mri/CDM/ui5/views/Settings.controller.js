sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/core/mvc/Controller",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/Dialog"
], function (ConfigUtils, BackendLinker, Controller, TextArea, Button, Dialog) {
    "use strict";
    var languagePath = "/settings/languages/value";

    var view = Controller.extend("hc.hph.cdw.config.ui.views.Settings", {
        onInit: function () {
        },
        setModelManager: function (oModelMgr) {
            this._oModelMgr = oModelMgr;
        },
        onBeforeRendering: function () {
            var allLanguageMap = sap.ui.core.LocaleData.getInstance(sap.ui.getCore().getConfiguration().getLocale()).getLanguages();
            this.getView().addStyleClass("sapMxConfigUi");
            var model = new sap.ui.model.json.JSONModel({
                list: Object.keys(allLanguageMap).map(function (code) {
                    return { key: code, text: allLanguageMap[code] };
                })
            });
            model.setSizeLimit(1000);
            this.getView().setModel(model, "allLanguages");
        },
        onAfterRendering: function () {

        },
        convertLang: function (oEvent) {

        },
        addLanguage: function (oEvent) {
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(languagePath);
            oData.push({
                key: "",
                path: ""
            });
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(languagePath, oData);
        },
        deleteLanguage: function (oEvent) {
            var oPath = oEvent.oSource.getParent().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath();
            var languageIndex = oPath.split("/").reverse()[0];
            var oData = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(languagePath);
            oData.splice(languageIndex, 1);
            this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).setProperty(languagePath, oData);
        },
        isValidDateFormat: function (evt) {
            var oSrc = evt.getSource();
            var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: oSrc.getValue() });
            try {
                oDateFormat.parse(oDateFormat.format(new Date()));
            } catch (err) {
                oSrc.setValue("YYYY-MM-dd");
            }
        },
        isValidTimeFormat: function (evt) {
            var oSrc = evt.getSource();
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: 'YYYY-MM-dd ' + oSrc.getValue() });
            try {
                oDateFormat.parse(oDateFormat.format(new Date()));
            } catch (err) {
                oSrc.setValue("HH:mm:ss");
            }
        },
        reset: function () {
            
        }
    });

    return view;
});
