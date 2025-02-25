sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/DetailsTrack",
    "hc/hph/genomics/ui/lib/vb/site/LinkGenerator"
], function (DetailsTrack) {
    "use strict";
    var LinkListDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.LinkListDetailsTrack", {
        metadata: {
            aggregations: {
                generators: {
                    type: "hc.hph.genomics.ui.lib.vb.site.LinkGenerator",
                    multiple: true
                },
                _links: {
                    type: "sap.m.Link",
                    multiple: true,
                    visibility: "hidden"
                }
            },
            defaultAggregation: "generators"
        },
        onBeforeRendering: function () {
            var that = this;
            this.removeAllAggregation("_links");
            this.getGenerators().forEach(function (oGenerator) {
                oGenerator.generateLinks().forEach(function (oLink) {
                    that.addAggregation("_links", oLink);
                });
            });
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<ul");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiGen-SiteDetailsTrack-LinkList");
                oRenderManager.writeClasses();
                oRenderManager.write(">");
                if (oControl.getAggregation("_links")) {
                    oControl.getAggregation("_links").forEach(function (oLink) {
                        oRenderManager.write("<li>");
                        oRenderManager.renderControl(oLink);
                        oRenderManager.write("</li>");
                    });
                }
                oRenderManager.write("</ul>");
            }
        }
    });
    return LinkListDetailsTrack;
});