sap.ui.define(["sap/ui/core/Control"], function (Control) {
    "use strict";
    var SectionTrack = Control.extend("hc.hph.genomics.ui.lib.vb.site.SectionTrack", {
        metadata: {
            properties: {
                pluginId: {
                    type: "string",
                    defaultValue: null
                },
                dataPlugin: {
                    type: "string",
                    defaultValue: null
                },
                title: {
                    type: "string",
                    defaultValue: null
                },
                error: {
                    type: "any",
                    defaultValue: null
                }
            }
        },
        init: function () {
            this.mDetails = {};
        },
        // overwrite default accessors
        setVisible: function (bVisibility) {
            this.setProperty("visible", bVisibility, true);
            this.$().css("display", bVisibility ? null : "none");
        },
        setError: function (oError) {
            if (oError) {
                console.error(oError);
            }
            if (!oError) {
                this.setProperty("error", null, true);
            } else if (typeof oError === "object") {
                if (!oError.errorCode) {
                    oError.errorCode = "error.Unknown";
                }
                this.setProperty("error", oError, true);
            } else if (typeof oError === "string") {
                this.setProperty("error", {
                    errorCode: "error.Unknown",
                    message: oError
                }, true);
            } else {
                this.setProperty("error", { errorCode: "error.Unknown" }, true);
            }
        },
        // implement control functionality
        renderer: {
            renderTitle: function (oRenderManager, sTitle) {
                if (sTitle) {
                    oRenderManager.write("<h4");
                    oRenderManager.addClass("sapUiFormTitle");
                    oRenderManager.addClass("sapUiFormTitleH4");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(sTitle);
                    oRenderManager.write("</h4>");
                }
            },
            renderSection: function (oRenderManager, sSectionTitle) {
                if (sSectionTitle) {
                    oRenderManager.write("<h5");
                    oRenderManager.addClass("sapUiFormTitle");
                    oRenderManager.addClass("sapUiFormTitleH5");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(sSectionTitle);
                    oRenderManager.write("</h5>");
                }
            }
        },
        // get parameters and set data model
        getParameters: function () {
            return {};
        },
        getSubRequests: function () {
            var oThis = this;
            return Object.keys(this.mDetails).reduce(function (aRequests, sDetailKey) {
                return aRequests.concat(oThis.mDetails[sDetailKey].getRequests().map(function (oRequest) {
                    oRequest.attribute = sDetailKey;
                    return oRequest;
                }));
            }, []);
        },
        // accessor for section
        getSection: function () {
            return this.getParent().getParent().getParent();
        },
        setDetails: function (sDetail, iIndex) {
            var oDetailStatus = Object.keys(this.mDetails).reduce(function (oStatus, sDetailKey) {
                if (sDetailKey === sDetail) {
                    oStatus.done = true;
                } else if (!oStatus.done) {
                    oStatus.offset += this.mDetails[sDetailKey].getTracks().length;
                }
                return oStatus;
            }, {
                offset: 0,
                done: false
            });
            this.getSection().setDetails(this.mDetails[sDetail], this.getBindingContext().getPath(), oDetailStatus.offset, iIndex);
        },
        getErrorMessage: function () {
            var oError = this.getError();
            if (oError) {
                var sText = null;
                if (oError.errorCode) {
                    sText = this.getModel("i18n.vb").getResourceBundle().getText(oError.errorCode, oError.parameters);
                    if (sText === oError.errorCode) {
                        sText = null;
                    }
                }
                return sText ? sText : this.getModel("i18n.vb").getResourceBundle().getText("error.Unknown");
            } else {
                return null;
            }
        }
    });
    return SectionTrack;
});