sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/lib/tab/WidgetExtensionBaseComponent",
    "hc/hph/patient/plugins/widgets/diagnoses/ui/lib/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, WidgetExtensionBaseComponent, Utils, JSONModel, ResourceModel) {
    "use strict";

    /**
     * Patient Summary Diagnoses Widget Extension.
     * @constructor
     *
     * @extends hc.hph.patient.ui.content.extension.WidgetComponentBase
     * @alias hc.hph.patient.plugins.widgets.diagnoses.ui.Extension
     */
    var WidgetComponent = WidgetExtensionBaseComponent.extend("hc.hph.patient.plugins.widgets.diagnoses.ui.Extension", {
        metadata: {
            includes: [
                "css/style.css"
            ],
            rootView: "hc.hph.patient.plugins.widgets.diagnoses.ui.view.Diagnoses",
            config: {
                rootPath: "/hc/hph/patient/plugins/widgets/diagnoses/ui",
                resourceBundle: "i18n/text.properties"
            }
        }
    });

    /**
     * Initialize the component.
     * Subscribe URL params change handler.
     * @override
     * @protected
     */
    WidgetComponent.prototype.init = function () {
        WidgetExtensionBaseComponent.prototype.init.apply(this, arguments);

        // Load i18n model
        var mConfig = this.getMetadata().getConfig();
        this.oResourceModel = new ResourceModel({
            bundleUrl: [mConfig.rootPath, mConfig.resourceBundle].join("/")
        });
        this.setModel(this.oResourceModel, "i18n");
    };

    return WidgetComponent;
});
