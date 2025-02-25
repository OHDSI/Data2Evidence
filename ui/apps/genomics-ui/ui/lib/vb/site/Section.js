sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/layout/Splitter",
    "sap/ui/layout/SplitterLayoutData",
    "sap/m/Page"
], function (Control, Splitter, SplitterLayoutData, Page) {
    "use strict";
    var Section = Control.extend("hc.hph.genomics.ui.lib.vb.site.Section", {
        metadata: {
            properties: {
                key: { type: "string" },
                title: { type: "string" },
                lazyLoading: {
                    type: "boolean",
                    defaultValue: false
                }
            },
            aggregations: {
                tracks: {
                    type: "hc.hph.genomics.ui.lib.vb.site.SectionTrack",
                    multiple: true
                }
            },
            defaultAggregation: "tracks"
        },
        init: function () {
            this.setProperty("key", this.getId());
            // default to ID to ensure that key is set
            this.mContent = new Page({
                showHeader: false,
                height: "100%",
                layoutData: new SplitterLayoutData({
                    size: "auto",
                    resizable: true
                })
            }).addStyleClass("sapUiContentPadding");
            this.mDetails = new Page({
                showHeader: false,
                height: "100%",
                layoutData: new SplitterLayoutData({
                    size: "0px",
                    resizable: true
                })
            }).addStyleClass("sapUiContentPadding");
            this.mSplitter = new Splitter({
                height: "100%",
                width: "100%",
                contentAreas: [
                    this.mContent,
                    this.mDetails
                ]
            });
            this.addDependent(this.mSplitter);
        },
        clone: function () {
            var oClone = Control.prototype.clone.call(this);
            this.getTracks().forEach(function (oTrack) {
                oClone.addTrack(oTrack.clone());
            });
            return oClone;
        },
        // overwrite default accessors
        setVisible: function (bVisibility) {
            this.setProperty("visible", bVisibility, true);
            this.$().css("display", bVisibility ? null : "none");
        },
        // redirect tracks into first splitter page
        getTracks: function () {
            return this.mContent.getContent();
        },
        addTrack: function (oTrack) {
            oTrack.bindElement(this.mContent.getContent().length.toString());
            this.mContent.addContent(oTrack);
        },
        // provide interface to show content in the second splitter page
        setDetails: function (oDetails, sPath, iTrackIndexOffset, iIndex) {
            if (this.mDetails.getContent().length > 0 && this.mDetails.getContent()[0] !== oDetails) {
                this.mDetails.removeAllContent();
            }
            if (this.mDetails.getContent().length === 0) {
                this.mDetails.addContent(oDetails.clone());
            }
            this.mDetails.getContent()[0].getTracks().forEach(function (oTrack, iTrackIndex) {
                oTrack.bindElement(sPath + "/subResults/" + (iTrackIndexOffset + iTrackIndex) + "/result/" + iIndex);
                oTrack.bindProperty("error", sPath + "/subResults/" + (iTrackIndexOffset + iTrackIndex) + "/error");
            });
            this.mDetails.setLayoutData(new SplitterLayoutData({ minSize: 100 }));
            this.mDetails.setVisible(iIndex !== null);
        },
        clearDetails: function () {
            this.mDetails.setVisible(false);
            this.mDetails.setLayoutData(new SplitterLayoutData({
                size: "0px",
                resizable: false
            }));
            this.mDetails.removeAllContent();
        },
        // get parameters and set data model
        getRequests: function () {
            return this.getTracks().map(function (oTrack) {
                return {
                    name: oTrack.getPluginId(),
                    parameters: oTrack.getParameters(),
                    subRequests: oTrack.getSubRequests()
                };
            });
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
                oRenderManager.renderControl(oControl.mSplitter);
                oRenderManager.write("</div>");
            }
        }
    });
    return Section;
});