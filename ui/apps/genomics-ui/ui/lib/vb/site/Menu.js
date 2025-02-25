jQuery.sap.require('sap.ui.unified.Menu');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.Menu');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.MenuItem');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.LinkMenuItem');
sap.m.Button.extend('hc.hph.genomics.ui.lib.vb.site.Menu', {
    metadata: {
        aggregations: {
            items: {
                type: "hc.hph.genomics.ui.lib.vb.site.MenuItem",
                multiple: true
            }
        },
        defaultAggregation: "items"
    },
    renderer: {},
    onBeforeRendering: function (oParam) {
        var oControl = oParam.srcControl;
        var aItem = oControl.getAggregation("items");
        if (aItem) {
            var menu = new sap.ui.unified.Menu();
            var that = this;
            $.each(aItem, function (i, content) {
                var menuItem = new sap.ui.unified.MenuItem(content.mProperties);
                switch (content.getItem()) {
                case "link":
                    menuItem.attachSelect(function () {
                        window.open(content.getHref(), content.getTarget());
                    });
                    break;
                default:
                    menuItem.attachSelect(function (oEvent) {
                        content.fireSelect(oEvent);
                    });
                    break;
                }
                that._addClasses(menuItem, content.getClasses());
                menu.addAggregation("items", menuItem);
            });
            oControl.attachPress(function (oEvent) {
                if (jQuery.sap.Version(sap.ui.version).compareTo("1.28.31") < 0) {
                    var oFocusInfo = sap.ui.core.Popup.getCurrentFocusInfo();
                    var fnOnClose = function (oEvent) {
                        sap.ui.core.Popup.applyFocusInfo(oFocusInfo);
                    };
                    menu.getPopup().attachClosed(fnOnClose, this);
                }
                var eDock = sap.ui.core.Popup.Dock;
                menu.open(false, oEvent.getSource(), eDock.BeginTop, eDock.BeginBottom, oEvent.getSource());
            });
        }
    },
    _addClasses: function (control, sClasses) {
        if (sClasses) {
            var aClasses = sClasses.split(" ");
            for (var i = 0; i < aClasses.length; i++) {
                control.addStyleClass(aClasses[i]);
            }
        }
    }
});
sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.site.MenuItem', {
    metadata: {
        properties: {
            item: {
                type: 'string',
                multiple: false
            },
            text: {
                type: 'string',
                multiple: false
            },
            icon: {
                type: 'string',
                multiple: false
            },
            classes: {
                type: 'string',
                multiple: false
            },
            enabled: {
                type: 'boolean',
                defaultValue: true
            },
            startsSection: {
                type: 'boolean',
                defaultValue: false
            }
        },
        events: { select: {} }
    }
});
hc.hph.genomics.ui.lib.vb.site.MenuItem.extend('hc.hph.genomics.ui.lib.vb.site.LinkMenuItem', {
    metadata: {
        properties: {
            href: {
                type: 'string',
                multiple: false
            },
            target: {
                type: 'string',
                multiple: false
            }
        }
    }
});