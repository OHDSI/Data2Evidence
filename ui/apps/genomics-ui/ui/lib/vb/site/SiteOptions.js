jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.SiteOptions');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.SiteOptions', {
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
            }
        },
        defaultAggregation: "menu"
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            var menu = oControl.getAggregation("menu");
            if (menu) {
                var menuButton = new hc.hph.genomics.ui.lib.vb.site.Menu(menu.mProperties);
                var aItems = menu.getAggregation("items");
                if (aItems) {
                    for (var i = 0; i < aItems.length; i++) {
                        menuButton.addAggregation("items", aItems[i]);
                    }
                }
                var customHeader = oControl.getParent().getAggregation("customHeader");
                customHeader.addAggregation("content", menuButton);
            }
        }
    }
});