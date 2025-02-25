jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.Center');
sap.ui.base.ManagedObject.extend('hc.hph.genomics.ui.lib.vb.overview.Center', {
    metadata: {
        properties: {
            type: { type: 'string' },
            name: {
                type: 'string',
                defaultValue: 'test'
            },
            height: { type: 'int' },
            innerRadius: { type: 'double' },
            initPlugin: { type: 'string' },
            color: {
                type: 'string',
                defaultValue: '#aaaaaa'
            },
            parameters: {
                type: 'object',
                defaultValue: {}
            }
        },
        events: { 'error': { allowPreventDefault: true } },
        associations: {
            browser: {
                type: 'hc.hph.genomics.ui.lib.VariantBrowser',
                multiple: false
            }
        },
        aggregations: {
            legends: {
                type: 'sap.ui.core.Control',
                multiple: true
            }
        }
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
    },
    getInitRequest: function () {
        return {
            pluginFunction: this.getInitPlugin(),
            parameters: this.getParameters(true),
            merge: false
        };
    },
    getParameters: function (bNoMerge) {
        if (bNoMerge) {
            return this.getProperty("parameters");
        } else if (this.getProperty("parameters")) {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), this.getProperty("parameters"));
        } else {
            return sap.ui.getCore().byId(this.getBrowser()).getParameters();
        }
    },
    onAfterRendering: function () {
        this.attachError(function () {
            sap.ui.getCore().byId(this.getBrowser()).fireError({
                errorCode: "error.LoadingData",
                parameters: [
                    "center",
                    this.getName(),
                    "id:",
                    this.getId()
                ]
            });
        });
    }
});