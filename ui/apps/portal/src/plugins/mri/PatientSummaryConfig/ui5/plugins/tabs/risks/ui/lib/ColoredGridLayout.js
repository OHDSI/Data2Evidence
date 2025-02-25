sap.ui.define([
    "hc/hph/patient/plugins/tabs/risks/ui/lib/ColoredFormContainer",
    "sap/ui/layout/form/ResponsiveGridLayout"
], function (ColoredFormContainer, ResponsiveGridLayout) {
    "use strict";

    /**
     * Constructor for a new ColoredGridLayout.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The ColoredGridLayout control provides the content for a Tile detail Popover.
     * @extends sap.ui.layout.form.ResponsiveGridLayout
     * @alias hc.hph.patient.plugins.tabs.risks.ui.lib.ColoredGridLayout
     */
    var ColoredGridLayout = ResponsiveGridLayout.extend("hc.hph.patient.plugins.tabs.risks.ui.lib.ColoredGridLayout");

    var sBaseClass = "sapPSRiskClass";

    ColoredGridLayout.prototype.onBeforeRendering = function () {
        ResponsiveGridLayout.prototype.onBeforeRendering.apply(this, arguments);

        var oForm = this.getParent();
        if (!oForm || !(oForm instanceof sap.ui.layout.form.Form)) {
            // layout not assigned to form - nothing to do
            return;
        }

        var aContainers = oForm.getFormContainers();
        aContainers.forEach(function (oContainer) {
            var sContainerId = oContainer.getId();
            var oPanel = this.mContainers[sContainerId][0];
            if (oPanel && oContainer instanceof ColoredFormContainer) {
                var sStyleClass;
                if (oContainer.getColor()) {
                    sStyleClass = sBaseClass + oContainer.getColor();
                }
                if (sStyleClass !== oContainer._styleClass) {
                    if (oContainer._styleClass) {
                        oPanel.removeStyleClass(oContainer._styleClass);
                    }
                    if (sStyleClass) {
                        oPanel.addStyleClass(sStyleClass);
                    }
                    oContainer._styleClass = sStyleClass;
                }
            }
        }, this);
    };

    return ColoredGridLayout;
});
