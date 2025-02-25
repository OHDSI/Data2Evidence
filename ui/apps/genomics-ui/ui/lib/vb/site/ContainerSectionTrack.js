sap.ui.define(["hc/hph/genomics/ui/lib/vb/site/SectionTrack"], function (SectionTrack) {
    "use strict";
    var ContainerSectionTrack = SectionTrack.extend("hc.hph.genomics.ui.lib.vb.site.ContainerSectionTrack", {
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
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                oControl.getContent().forEach(function (oContent) {
                    oRenderManager.renderControl(oContent);
                });
                oRenderManager.write("</div>");
            }
        }
    });
    return ContainerSectionTrack;
});