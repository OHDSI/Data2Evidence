jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.TrackGroup');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.TrackGroup', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'trackGroup'
            },
            maxCount: { type: 'int' },
            mergeGroup: {
                type: 'boolean',
                defaultValue: false
            },
            mergeGroupPlugin: { type: 'string' }
        },
        aggregations: {
            templateTrack: {
                type: 'hc.hph.genomics.ui.lib.vb.site.Track',
                multiple: false
            },
            _tracks: {
                type: 'hc.hph.genomics.ui.lib.vb.site.Track',
                multiple: true
            }
        },
        defaultAggregation: "templateTrack"
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            this._renderContent(oRenderManager, oControl);
            var aTracks = oControl.getAggregation("_tracks");
            if (aTracks) {
                $.each(aTracks, function (iTrack, oTrack) {
                    oRenderManager.renderControl(oTrack);
                });
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
        this.mPluginId = 'vb.TrackGroups.load';
        this.setModel(new sap.ui.model.json.JSONModel());
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
        this.getAggregation('templateTrack').setAssociation('browser', oBrowser, true);
    },
    setData: function (oData) {
        this.getModel().setData(oData);
        this._updateAggregations(oData);
    },
    _updateAggregations: function (oData) {
        if (!$.isEmptyObject(oData)) {
            var oThis = this;
            $.each(oData, function (i, aData) {
                var oNextTrack = oThis.getTemplateTrack().clone();
                oNextTrack.setModel(new sap.ui.model.json.JSONModel());
                if (oThis.getMergeGroup()) {
                    oNextTrack.setData(oThis.getModel().getData());
                } else {
                    oNextTrack.setData(aData);
                }
                if (oNextTrack.mProperties.color) {
                    var oBrowserConfig = sap.ui.getCore().byId(oThis.getBrowser()).getVariantConfiguration();
                    if (oBrowserConfig.sampleConfig) {
                        oNextTrack.setProperty('color', oBrowserConfig.sampleConfig[0].categories[i].color, true);
                    }
                }
                oNextTrack.setAssociation('browser', oThis.getBrowser(), true);
                oThis.addAggregation('_tracks', oNextTrack, true);
            });
        }
    },
    getRequestParameters: function (bNoMerge) {
        var groupParams = {
            pluginFunction: this.mPluginId,
            groupsRequest: this.getPluginId(),
            trackRequest: this.getAggregation('templateTrack').getInitPlugin(),
            trackParameters: sap.ui.getCore().byId(this.getBrowser()).getParameters(),
            groupsParameters: sap.ui.getCore().byId(this.getBrowser()).getParameters(),
            maxCount: this.getMaxCount(),
            mergeGroup: this.getMergeGroup(),
            mergeGroupPlugin: this.getMergeGroupPlugin()
        };
        if (bNoMerge) {
            return $.extend({}, this.getProperty("parameters"), groupParams);
        }
        if (this.getProperty("parameters")) {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), this.getProperty("parameters"), groupParams);
        } else {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), groupParams);
        }
    }
});