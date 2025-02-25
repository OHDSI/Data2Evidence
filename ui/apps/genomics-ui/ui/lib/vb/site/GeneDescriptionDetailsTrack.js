sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/DetailsTrack",
    "sap/ui/core/ResizeHandler"
], function (DetailsTrack, ResizeHandler) {
    "use strict";
    var GeneDescriptionDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.GeneDescriptionDetailsTrack", {
        metadata: {
            properties: {
                description: {
                    type: "string",
                    defaultValue: null
                },
                collapsed: {
                    type: "boolean",
                    defaultValue: true
                }
            }
        },
        init: function () {
            var oThis = this;
            DetailsTrack.prototype.init.call(this);
            this.mResizeTimer = null;
            this.mResizeHandlerID = null;
            sap.ui.getCore().attachInit(function () {
                oThis.mResizeHandlerID = ResizeHandler.register(oThis, function () {
                    if (this.iWidth > 0 && this.iHeight > 0) {
                        clearTimeout(oThis.mResizeTimer);
                        oThis.mResizeTimer = setTimeout(function () {
                            oThis.update();
                            oThis.mResizeTimer = null;
                        }, 50);
                    }
                });
            });
        },
        exit: function () {
            if (this.mResizeTimer) {
                clearTimeout(this.mResizeTimer);
            }
            if (this.mResizeHandlerID) {
                sap.ui.core.ResizeHandler.deregister(this.mResizeHandlerID);
            }
            if (DetailsTrack.prototype.exit) {
                DetailsTrack.prototype.exit.call(this);
            }
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiGen-SiteDetailsTrack-GeneDescription");
                oRenderManager.addClass("sapUiForm");
                oRenderManager.addClass("sapMText");
                if (oControl.getCollapsed()) {
                    oRenderManager.addClass("collapsed");
                }
                oRenderManager.writeClasses();
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                oRenderManager.writeEscaped(oControl.getDescription());
                oRenderManager.write("</div>");
            }
        },
        onAfterRendering: function () {
            var oThis = this;
            this.$().on("click", function () {
                oThis.setCollapsed(!oThis.getCollapsed());
            });
        },
        update: function () {
            if (this.getDomRef()) {
                this.$().toggleClass("long", parseFloat(getComputedStyle(this.getDomRef(), null).height) > 3.6 * parseFloat(getComputedStyle(this.getDomRef(), null).fontSize));
            }
        }
    });
    return GeneDescriptionDetailsTrack;
});