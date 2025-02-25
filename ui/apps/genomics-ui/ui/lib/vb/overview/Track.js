jQuery.sap.require('hc.hph.genomics.ui.lib.vb.StandardLegend');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.Track');
sap.ui.base.ManagedObject.extend('hc.hph.genomics.ui.lib.vb.overview.Track', {
    metadata: {
        properties: {
            type: { type: 'string' },
            name: {
                type: 'string',
                defaultValue: 'overview'
            },
            height: { type: 'int' },
            minValue: {
                type: 'float',
                defaultValue: 0
            },
            maxValue: { type: 'float' },
            color: {
                type: 'string',
                defaultValue: '#aaaaaa'
            },
            initPlugin: { type: 'string' },
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
                type: 'hc.hph.genomics.ui.lib.vb.StandardLegend',
                multiple: true
            },
            _standardLegend: {
                type: 'hc.hph.genomics.ui.lib.vb.StandardLegend',
                multiple: false,
                visibility: 'hidden'
            }
        }
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mTracksDisplayable = true;
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
    },
    onAfterRendering: function () {
        this.attachError(function () {
            sap.ui.getCore().byId(this.getBrowser()).fireError({
                errorCode: "error.LoadingData",
                parameters: [
                    "overview-track",
                    this.getName(),
                    "trackId:",
                    this.getId()
                ]
            });
        });
    },
    getInitRequest: function () {
        return {
            pluginFunction: this.getInitPlugin(),
            parameters: this.getParameters(true),
            merge: false
        };
    },
    //Needs to return max value
    setData: function (oData) {
        //delete old data
        var oTrackData = this.getModel().getData();
        var sKey;
        for (sKey in oTrackData) {
            delete oTrackData[sKey];
        }
        // set new data
        for (sKey in oData) {
            oTrackData[sKey] = oData[sKey];
        }
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
    getParameters: function (bNoMerge) {
        if (bNoMerge) {
            return this.getProperty("parameters");
        } else if (this.getProperty("parameters")) {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), this.getProperty("parameters"));
        } else {
            return sap.ui.getCore().byId(this.getBrowser()).getParameters();
        }
    },
    getMaxData: function () {
    },
    getAllLegends: function () {
        var aAdvancedLegends = this.getAggregation('legends');
        var oStandardLegend = this.getAggregation('_standardLegend');
        if (oStandardLegend) {
            return $.merge(aAdvancedLegends, [oStandardLegend]);
        } else {
            return aAdvancedLegends;
        }
    },
    getLayouts: function () {
        return sap.ui.getCore().byId(this.getBrowser()).mOverviewLayouts;
    },
    _clearTrack: function () {
    }
});