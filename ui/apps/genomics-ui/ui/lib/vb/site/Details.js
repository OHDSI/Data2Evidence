sap.ui.define(["sap/ui/core/Control"], function (Control) {
    "use strict";
    var Details = Control.extend("hc.hph.genomics.ui.lib.vb.site.Details", {
        metadata: {
            aggregations: {
                tracks: {
                    type: "hc.hph.genomics.ui.lib.vb.site.DetailsTrack",
                    multiple: true
                }
            }
        },
        init: function () {
        },
        // overwrite default accessors
        setVisible: function (bVisibility) {
            this.setProperty("visible", bVisibility, true);
            this.$().css("display", bVisibility ? null : "none");
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapMPage");
                oRenderManager.writeClasses();
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                oControl.getTracks().forEach(function (oTrack) {
                    oRenderManager.renderControl(oTrack);
                });
                oRenderManager.write("</div>");
            }
        },
        getRequests: function () {
            return this.getTracks().map(function (oTrack) {
                return {
                    name: oTrack.getPluginId(),
                    parameters: oTrack.getParameters()
                };
            });
        }
    });
    return Details;
});