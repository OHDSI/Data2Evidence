sap.ui.define(["hc/hph/genomics/ui/lib/vb/site/DetailsTrack"], function (DetailsTrack) {
    "use strict";
    var ContainerDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.ContainerDetailsTrack", {
        metadata: {
            aggregations: {
                content: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            },
            defaultAggregation: "content"
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiForm");
                oRenderManager.writeClasses();
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                oControl.getContent().forEach(function (oContent) {
                    oRenderManager.renderControl(oContent);
                });
                oRenderManager.write("</div>");
            }
        }
    });
    return ContainerDetailsTrack;
});