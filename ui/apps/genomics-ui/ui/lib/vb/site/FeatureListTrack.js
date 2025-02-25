jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.FeatureListTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.FeatureListTrack', {
    metadata: {
        properties: {
            classes: {
                type: 'string',
                multiple: true
            }
        },
        aggregations: {
            menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: false
            },
            _menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: false
            },
            _geneCtrl: {
                type: "hc.hph.genomics.ui.lib.vb.site.FeatureListTrack",
                multiple: true
            }
        },
        defaultAggregation: "menu"
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            var aContent = oControl.getModel().getProperty(oControl.getPath());
            if (aContent instanceof Array) {
                for (var index = 0; index < aContent.length; ++index) {
                    var oGeneCtrl = oControl.getAggregation("_geneCtrl")[index];
                    var oMenu = oGeneCtrl.getAggregation("_menu");
                    if (oMenu) {
                        oMenu.addStyleClass("menuButtonMargin");
                        oRenderManager.renderControl(oMenu);
                    }
                }
            } else {
                oRenderManager.write('<span');
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass('sapMText');
                oRenderManager.writeClasses();
                oRenderManager.write('>  - </span>');
            }
        }
    },
    onBeforeRendering: function (oEvent) {
        this.removeAllAggregation("_geneCtrl");
        this.getAggregation("_label").setText(oEvent.srcControl.getLabel());
        var oData = this.getModel().getData();
        if (oData.gene) {
            for (var i = 0; i < oData.gene.length; i++) {
                var oGeneCtrl = new hc.hph.genomics.ui.lib.vb.site.FeatureListTrack();
                oGeneCtrl.setModel(new sap.ui.model.json.JSONModel());
                oGeneCtrl.getModel().setData(oData.gene[i]);
                oGeneCtrl.setClasses(this.getClasses());
                var oMenu = this.getAggregation("menu");
                if (oMenu) {
                    var menuTrack = oMenu.clone();
                    oGeneCtrl.getAggregation("_menu", menuTrack);
                }
                this.addAggregation("_geneCtrl", oGeneCtrl);
            }
        }
    }
});