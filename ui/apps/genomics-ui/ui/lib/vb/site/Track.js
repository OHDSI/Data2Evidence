jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.Track');
sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.site.Track', {
    metadata: {
        properties: {
            label: { type: 'string' },
            minimized: {
                type: 'boolean',
                default: false
            },
            path: { type: 'string' },
            pluginId: {
                type: 'string',
                defaultValue: null
            },
            parameters: {
                type: 'object',
                defaultValue: {}
            },
            initPlugin: { type: 'string' }
        },
        associations: {
            browser: {
                type: 'hc.hph.genomics.ui.lib.VariantBrowser',
                multiple: false
            }
        },
        aggregations: {
            _label: {
                type: 'sap.m.Label',
                multiple: false,
                visibility: 'hidden'
            }
        }
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            oRenderManager.write('<div');
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass('sapUiGen-TrackRow');
            oRenderManager.writeClasses();
            oRenderManager.write('>');
            this._renderLabel(oRenderManager, oControl);
            oRenderManager.write('<div>');
            this._renderContent(oRenderManager, oControl);
            oRenderManager.write('</div>');
            oRenderManager.write('</div>');
        },
        _renderLabel: function (oRenderManager, oControl) {
            var label = oControl.getAggregation('_label');
            label.addStyleClass('sapUiGen-TrackLabel');
            oRenderManager.renderControl(label);
        },
        _renderContent: function (oRenderManager, oControl) {
        }
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
        this.setAggregation('_label', new sap.m.Label(this.getId() + '_label', { width: '100%' }));
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
    },
    _clear: function () {
        d3.select('#' + this.getId() + ' > div').remove();
    },
    onBeforeRendering: function () {
        this.getAggregation('_label').setText(this.getLabel());
    },
    getReference: function (bNoMerge) {
        if (bNoMerge) {
            return this.getProperty("parameters").reference;
        } else {
            return this.getProperty("parameters").reference ? this.getProperty("parameters").reference : sap.ui.getCore().byId(this.getBrowser()).getParameters().reference;
        }
    },
    getDataset: function (bNoMerge) {
        if (bNoMerge) {
            return this.getProperty("parameters").dataset;
        } else {
            return this.getProperty("parameters").dataset ? this.getProperty("parameters").dataset : sap.ui.getCore().byId(this.getBrowser()).getParameters().dataset;
        }
    },
    getRequestParameters: function (bNoMerge) {
        var param = { pluginFunction: this.getPluginId() };
        if (bNoMerge) {
            return $.extend({}, this.getProperty("parameters"), param);
        }
        if (this.getProperty("parameters")) {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), this.getProperty("parameters"), param);
        } else {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), param);
        }
    },
    setData: function (oData) {
        this.getModel().setData(oData);
    },
    getInitRequest: function () {
    }
});