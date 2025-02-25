jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.GeneVariantTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.GeneVariantTrack', {
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            var label = oControl.getAggregation("_label");
            var userTitle = oControl.getLabel();
            var oData = oControl.getModel().getData();
            oData = oData.result ? oData.result : oData;
            if (oData.geneVariant) {
                var geneInfo = oData.geneVariant;
                var sampleCount = oData.sampleCount;
                var name = oControl.getModel().getData().name ? oControl.getModel().getData().name : "";
                label.setText(userTitle + " " + name);
                label.addStyleClass('sapUiGen-TrackLabel');
                oRenderManager.writeClasses();
                oRenderManager.renderControl(label);
                if (geneInfo.length === 0) {
                    var text = new sap.m.Text({ text: '-' });
                    oRenderManager.renderControl(text);
                } else {
                    for (var gene in geneInfo) {
                        var geneName = new sap.m.Text({ text: geneInfo[gene].geneName + ': ' });
                        var value = new sap.m.Text({
                            text: geneInfo[gene].count + "/" + sampleCount + " (" + (geneInfo[gene].count * 100 / sampleCount).toFixed(1) + "%)",
                            textAlign: "Right"
                        });
                        var icon = new sap.ui.core.Icon({
                            src: "sap-icon://person-placeholder",
                            color: "#666666"
                        });
                        icon.addStyleClass("patientIcon");
                        var hbox = new sap.m.HBox({
                            items: [
                                value,
                                icon
                            ]
                        });
                        var flexBox = new sap.m.FlexBox({
                            justifyContent: "SpaceBetween",
                            items: [
                                geneName,
                                hbox
                            ]
                        });
                        oRenderManager.renderControl(flexBox);
                    }
                }
            } else {
                label.setText(userTitle);
                label.addStyleClass('sapUiGen-TrackLabel');
                oRenderManager.writeClasses();
                oRenderManager.renderControl(label);
                var text = new sap.m.Text({ text: oControl.getModel("i18n.vb").getResourceBundle().getText(oData) });
                oRenderManager.renderControl(text);
            }
        }
    }
});