sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/library"
], function (jQuery) {
    "use strict";

     sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["hc.hph.cdw.config.ui.lib"], "");

    /**
     * SAPUI5 library for FFH CDM Configuration
     *
     * @namespace
     * @name hc.hph.cdw.config.ui.lib
     * @author SAP SE
     * @version 1.0.0
     * @public
     */
    sap.ui.getCore().initLibrary({
        name: "hc.hph.cdw.config.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.ui.core",
            "sap.ui.commons"
        ],
        types: [
        ],
        interfaces: [
        ],
        controls: [
                   "hc.hph.cdw.config.ui.lib.BackendLinker",
                   "hc.hph.cdw.config.ui.lib.Config",
                   "hc.hph.cdw.config.ui.lib.ConfigModelsData",
                   "hc.hph.cdw.config.ui.lib.ConfigModelsManager",                   
                   "hc.hph.cdw.config.ui.lib.DragDropContainer",
                   "hc.hph.cdw.config.ui.lib.DragDropContainerReceiver",
                   "hc.hph.cdw.config.ui.lib.DragDropContainerTemplate",
                   "hc.hph.cdw.config.ui.lib.FilterCard",
                   "hc.hph.cdw.config.ui.lib.FilterCardGroup",
                   "hc.hph.cdw.config.ui.lib.Formatter",
                   "hc.hph.cdw.config.ui.lib.SmartAccordion",
                   "hc.hph.cdw.config.ui.lib.ValidityVisualElement"
        ],
        elements: [
                    "hc.hph.cdw.config.ui.lib.ConfigUtils"
        ]
    });

    return hc.hph.cdw.config.ui.lib;
});
