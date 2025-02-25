jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.AlleleTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.AlleleTrack', {
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
        this.height = '45px';
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            oRenderManager.write('<div');
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass('alleleFreq');
            oRenderManager.writeClasses();
            oRenderManager.write('>');
            var content = oControl.getModel().getProperty(oControl.getPath());
            if (content && content.result) {
                content = content.result;
            }
            if (content instanceof Array) {
                for (var index = 0; index < content.length; ++index) {
                    oRenderManager.write('<div');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oControl._renderAllele(oRenderManager, content[index]);
                    oRenderManager.write('</div>');
                }
            }
            oRenderManager.write('</div>');
        }
    },
    _renderAllele: function (oRenderManager, oContent) {
        oRenderManager.write('<span');
        oRenderManager.addClass('sapMText');
        oRenderManager.addClass('freq');
        oRenderManager.writeClasses();
        oRenderManager.write('>');
        oRenderManager.writeEscaped(parseFloat(oContent.value).toFixed(2));
        oRenderManager.write('</span>');
        if (oContent.label.length === 0) {
            oRenderManager.write('<div>-</div>');
        } else if (oContent.label[0] === '<') {
            oRenderManager.write('<div>');
            oRenderManager.writeEscaped(oContent.label);
            oRenderManager.write('</div>');
        } else {
            for (var index = 0; index < oContent.label.length; ++index) {
                oRenderManager.write('<div>');
                oRenderManager.writeEscaped(oContent.label[index]);
                oRenderManager.write('</div>');
            }
        }
    }
});