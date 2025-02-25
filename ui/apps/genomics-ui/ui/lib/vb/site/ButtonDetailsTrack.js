sap.ui.define(["hc/hph/genomics/ui/lib/vb/site/DetailsTrack"], function (DetailsTrack) {
    "use strict";
    var ButtonDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.ButtonDetailsTrack", {
        metadata: {
            properties: {
                text: {
                    type: 'string',
                    multiple: false
                },
                icon: {
                    type: 'string',
                    multiple: false
                },
                enabled: {
                    type: 'boolean',
                    defaultValue: true
                },
                width: {
                    type: 'string',
                    defaultValue: true
                },
                payload: {
                    type: 'string',
                    defaultValue: null
                }
            },
            events: { press: {} }
        },
        init: function () {
            var that = this;
            this.mButton = new sap.m.Button({
                press: function (oEvent) {
                    that.firePress({ payload: that.getPayload() });
                }
            });
            this.addDependent(this.mButton);
        },
        setText: function (sText) {
            this.setProperty("text", sText, true);
            this.mButton.setText(sText);
        },
        setIcon: function (sIcon) {
            this.setProperty("icon", sIcon, true);
            this.mButton.setIcon(sIcon);
        },
        setEnabled: function (bEnabled) {
            this.setProperty("enabled", bEnabled, true);
            this.mButton.setEnabled(bEnabled);
        },
        setWidth: function (sWidth) {
            this.setProperty("width", sWidth, true);
            this.mButton.setWidth(sWidth);
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.write(">");
                oRenderManager.renderControl(oControl.mButton);
                oRenderManager.write("</div>");
            }
        }
    });
    return ButtonDetailsTrack;
});