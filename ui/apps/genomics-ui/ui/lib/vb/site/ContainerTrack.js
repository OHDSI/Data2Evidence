jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.ContainerTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.ContainerTrack', {
    metadata: {
        aggregations: { content: { singularName: "content" } },
        defaultAggregation: "content"
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            var controls = oControl.getContent();
            $.each(controls, function (i, obj) {
                oRenderManager.renderControl(obj);
            });
        }
    }
});