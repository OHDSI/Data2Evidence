jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.require('hc.hph.genomics.ui.lib.vb.TrackGroupLegend');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.TrackGroup');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.TrackGroup', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'trackGroup'
            },
            trackHeight: { type: 'int' },
            minTrackHeight: { type: 'int' },
            maxHeight: { type: 'int' },
            maxCount: { type: 'int' },
            titlePrefix: { type: 'string' },
            colors: {
                type: 'string[]',
                defaultValue: '#835DCC, #5A408C, #31234C'
            },
            pluginId: { type: 'string' }
        },
        aggregations: {
            templateTrack: {
                type: 'hc.hph.genomics.ui.lib.vb.overview.Track',
                multiple: false
            },
            _tracks: {
                type: 'hc.hph.genomics.ui.lib.vb.overview.Track',
                multiple: true
            }
        },
        defaultAggregation: "templateTrack"
    },
    init: function () {
        this.mPluginId = 'vb.TrackGroups.load';
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mCurrentTrackHeight = this.getTrackHeight();
        this.mMaxValue = 0.000006;
        var legend = new hc.hph.genomics.ui.lib.vb.TrackGroupLegend();
        legend.mTrackGroup = this;
        this.addAggregation('legends', legend, true);
    },
    _updateAggregations: function (oData) {
        var oThis = this;
        if ($.isEmptyObject(oData)) {
            this.mTracksDisplayable = false;
            this.mMessage = this.getModel("i18n.vb").getResourceBundle().getText("error.NoData");
            if (this.getAggregation('_tracks')) {
                $.each(this.getAggregation('_tracks'), function (i, oTrack) {
                    oTrack._clearTrack();
                });
            }
            this.removeAllAggregation('_tracks', true);
            //Determine which height to set
            this.mCurrentTrackHeight = this._calculateTrackHeight(oData.length);
            oThis = this;
            $.each(oData, function (i, aData) {
                var oNextTrack = oThis.getTemplateTrack().clone();
                oNextTrack.setModel(new sap.ui.model.json.JSONModel());
                oNextTrack.setProperty('height', oThis.mCurrentTrackHeight, true);
                oNextTrack.setProperty('name', aData.name);
                oNextTrack.setProperty('color', oThis.getColor(i), true);
                oNextTrack.setAssociation('browser', oThis.getBrowser(), true);
                oThis.addAggregation('_tracks', oNextTrack, true);
            });
        } else if (!$.isEmptyObject(oData) && !oData.hasOwnProperty('message')) {
            this.mTracksDisplayable = true;
            this.mMessage = undefined;
            if (this.getAggregation('_tracks')) {
                $.each(this.getAggregation('_tracks'), function (i, oTrack) {
                    oTrack._clearTrack();
                });
            }
            this.removeAllAggregation('_tracks', true);
            //Determine which height to set
            this.mCurrentTrackHeight = this._calculateTrackHeight(oData.length);
            oThis = this;
            oThis.mMaxValue = 0;
            $.each(oData, function (i, aData) {
                var oNextTrack = oThis.getTemplateTrack().clone();
                oNextTrack.setModel(new sap.ui.model.json.JSONModel());
                oNextTrack.setProperty('height', oThis.mCurrentTrackHeight, true);
                var fTrackMax = oNextTrack.setData(aData.result);
                if (fTrackMax !== null && fTrackMax !== undefined && oThis.mMaxValue < fTrackMax) {
                    oThis.mMaxValue = fTrackMax;
                }
                var oBrowserConfig = sap.ui.getCore().byId(oThis.getBrowser()).getSampleConfigColor();
                if (oBrowserConfig.categories && oBrowserConfig.categories[oData[i].categoryNumber]) {
                    oNextTrack.setProperty('color', oBrowserConfig.categories[aData.categoryNumber].color, true);
                } else {
                    oNextTrack.setProperty('color', oThis.getColor(i), true);
                }
                oNextTrack.setProperty('name', oThis.getTitlePrefix() + ': ' + aData.name, true);
                oNextTrack.setAssociation('browser', oThis.getBrowser(), true);
                oThis.addAggregation('_tracks', oNextTrack, true);
            });
            $.each(oThis.getAggregation('_tracks'), function (i, oTrack) {
                oTrack.setProperty('maxValue', oThis.mMaxValue, true);
            });
        }
    },
    _clearTrack: function () {
        if (this.getAggregation('_tracks')) {
            $.each(this.getAggregation('_tracks'), function (i, oTrack) {
                oTrack._clearTrack();
            });
        }
    },
    /**
     * Calculates the height for all tracks in this group 
     * */
    _calculateTrackHeight: function (iDataLength) {
        var mBrowser = sap.ui.getCore().byId(this.getBrowser());
        var iNeededHeight = iDataLength * (this.getTrackHeight() / 100 - mBrowser.mOverviewTrackGapSize) + iDataLength * mBrowser.mOverviewTrackGapSize;
        var iHeight = this.getTrackHeight();
        if (iNeededHeight > this.getMaxHeight() / 100) {
            iHeight = Math.floor((this.getMaxHeight() - iDataLength * (mBrowser.mOverviewTrackGapSize * 100)) / iDataLength);
            if (iHeight < this.getMinTrackHeight()) {
                iHeight = this.getMinTrackHeight();
            }
        }
        return iHeight;
    },
    getInitRequest: function () {
        var oInitRequest = this.getAggregation('templateTrack').getInitRequest();
        if (oInitRequest.pluginFunction) {
            return {
                defaultData: this.mTracksDisplayable ? this.getModel().getData() : { message: this.mMessage },
                pluginFunction: this.mPluginId,
                parameters: {
                    groupsRequest: this.getPluginId(),
                    groupsParameters: this.getParameters(),
                    trackRequest: oInitRequest.pluginFunction,
                    trackParameters: oInitRequest.parameters,
                    maxCount: this.getMaxCount()
                }
            };
        } else {
            return {};
        }
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
        this.getAggregation('templateTrack').setAssociation('browser', oBrowser, true);
    },
    setData: function (oData) {
        this.getModel().setData(oData);
        if (oData.length > this.getMaxCount()) {
            //Too many tracks received
            this.mTracksDisplayable = false;
            this.mMessage = this.getModel("i18n.vb").getResourceBundle().getText("error.TooManyResultsReceived");
        } else if ($.isEmptyObject(oData)) {
            this.mTracksDisplayable = false;
            this.mMessage = this.getModel("i18n.vb").getResourceBundle().getText("error.NoData");
        } else {
            this._updateAggregations(oData);
        }
    },
    renderer: {
        render: function (oRenderManager, oControl) {
        }
    },
    draw: function () {
        var oThis = this;
        var aTracks = this.getAggregation('_tracks');
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        var iTrackHeights = 0;
        if (this.mTracksDisplayable === true && !$.isEmptyObject(this.getAggregation('_tracks'))) {
            $.each(aTracks, function (iTrack, oTrack) {
                oTrack.mOuterRadius = oThis.mOuterRadius - oBrowser.mOverviewRadius * iTrackHeights;
                oTrack.mInnerRadius = oThis.mOuterRadius - oBrowser.mOverviewRadius * (iTrackHeights + oTrack.getHeight() / 100 - oBrowser.mOverviewTrackGapSize);
                iTrackHeights += oTrack.getHeight() / 100;
                oTrack.draw();
            });
        }
    },
    getHeight: function () {
        return this.getCompleteTrackHeight();
    },
    getCompleteTrackHeight: function () {
        if (!$.isEmptyObject(this.getAggregation('_tracks'))) {
            return this.getAggregation('_tracks').length * this.mCurrentTrackHeight;
        } else {
            return 0;
        }
    },
    getName: function () {
        return this.getTitlePrefix();
    },
    getColor: function (iIndex) {
        var aTracks = this.getAggregation('_tracks');
        var aTrackColors = [];
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if (oBrowser.isConfigured()) {
            if (aTracks) {
                $.each(aTracks, function (iTrack, oTrack) {
                    aTrackColors.push(oTrack.getColor());
                });
            }
            if (!$.isEmptyObject(aTrackColors) && aTrackColors.length > iIndex) {
                //If track has already a color return it
                return aTrackColors[iIndex];
            } else {
                //Return preconfigured track group colors
                return this.getColors()[iIndex % this.getColors().length];
            }
        } else {
            //Return preconfigured track group colors
            return this.getColors()[iIndex % this.getColors().length];
        }
    }
});