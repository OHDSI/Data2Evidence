jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.TrackGroup');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.TrackGroup', {
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
            colors: { type: 'string[]' },
            pluginId: { type: 'string' }
        },
        aggregations: {
            templateTrack: {
                type: 'hc.hph.genomics.ui.lib.vb.chromosome.Track',
                multiple: false
            },
            _tracks: {
                type: 'hc.hph.genomics.ui.lib.vb.chromosome.Track',
                multiple: true
            }
        },
        defaultAggregation: "templateTrack"
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
        this.mPluginId = 'vb.TrackGroups.load';
        this.mCurrentTrackHeight = this.getTrackHeight();
        this.mMaxValue = 0;
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
        this.getAggregation('templateTrack').setBrowser(oBrowser);
    },
    _updateAggregations: function (oData) {
        var oChromosomeDetails = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails');
        var iTrackCount = $.isEmptyObject(this.getModel().getData()) ? 0 : this.getModel().getData().length;
        var oThis = this;
        this._removeTracks();
        if (oData.message) {
            //Too many track received
            var oTrack = this.getTemplateTrack().clone();
            oTrack.setModel(new sap.ui.model.json.JSONModel());
            this.mMessage = this.getModel("i18n.vb").getResourceBundle().getText(oData.message);
            this.mTracksDisplayable = false;
            this.mCurrentTrackHeight = 0;
            oTrack.setProperty('height', 0);
            oTrack.setProperty('name', oThis.getTitlePrefix() + ': ' + (iTrackCount ? iTrackCount + ' track' + (iTrackCount === 1 ? '' : 's') : '') + ' ' + this.mMessage, true);
            oTrack.setAssociation('browser', oThis.getBrowser(), true);
            oTrack.setZoom(oChromosomeDetails.mChromosomeIndex, oChromosomeDetails.mChromosome, oChromosomeDetails.mBegin, oChromosomeDetails.mWidth, oChromosomeDetails.mZoomWidth);
            oThis.addAggregation('_tracks', oTrack, true);
        } else if ($.isEmptyObject(oData)) {
            var oTrack = this.getTemplateTrack().clone();
            oTrack.setModel(new sap.ui.model.json.JSONModel());
            this.mCurrentTrackHeight = 20;
            oTrack.setProperty('height', 20);
            if (!this.mInitial) {
                this.mMessage = this.getModel("i18n.vb").getResourceBundle().getText("error.NoData");
                this.mTracksDisplayable = false;
                oTrack.setProperty('name', oThis.getTitlePrefix() + ': ' + this.mMessage, true);
            } else {
                oTrack.setProperty('name', oThis.getTitlePrefix(), true);
            }
            oTrack.setAssociation('browser', oThis.getBrowser(), true);
            oTrack.setZoom(oChromosomeDetails.mChromosomeIndex, oChromosomeDetails.mChromosome, oChromosomeDetails.mBegin, oChromosomeDetails.mWidth, oChromosomeDetails.mZoomWidth);
            oThis.addAggregation('_tracks', oTrack, true);
        } else if (!$.isEmptyObject(oData)) {
            this.mTracksDisplayable = true;
            this.mMessage = undefined;
            oThis.mMaxValue = 0;
            $.each(oData, function (i, aData) {
                var oNextTrack = oThis.getTemplateTrack().clone();
                oNextTrack.setModel(new sap.ui.model.json.JSONModel());
                //Determine which height to set
                var iHeight = oThis.getTrackHeight();
                var iNeededHeight = oData.length * (oThis.getTrackHeight() + 24 + 4);
                if (iNeededHeight > oThis.getMaxHeight()) {
                    iHeight = Math.floor((oThis.getMaxHeight() - oData.length * 28) / oData.length);
                    if (iHeight < oThis.getMinTrackHeight()) {
                        iHeight = oThis.getMinTrackHeight();
                    }
                }
                oThis.mCurrentTrackHeight = iHeight;
                oNextTrack.setProperty('height', iHeight);
                var fTrackMax = oNextTrack.setData(aData.result, true);
                if (fTrackMax !== null && fTrackMax !== undefined && oThis.mMaxValue < fTrackMax) {
                    oThis.mMaxValue = fTrackMax;
                }
                oNextTrack.setProperty('name', oThis.getTitlePrefix() + ': ' + aData.name, true);
                var oBrowserConfig = sap.ui.getCore().byId(oThis.getBrowser()).getSampleConfigColor();
                if (oBrowserConfig.categories && oBrowserConfig.categories[oData[i].categoryNumber]) {
                    oNextTrack.setProperty('color', oBrowserConfig.categories[oData[i].categoryNumber].color, true);
                } else {
                    oNextTrack.setProperty('color', oThis.getColor(i), true);
                }
                oNextTrack.setAssociation('browser', oThis.getBrowser(), true);
                oNextTrack.setZoom(oChromosomeDetails.mChromosomeIndex, oChromosomeDetails.mChromosome, oChromosomeDetails.mBegin, oChromosomeDetails.mWidth, oChromosomeDetails.mZoomWidth);
                oThis.addAggregation('_tracks', oNextTrack, true);
            });
            $.each(this.getAggregation('_tracks'), function (i, oCurTrack) {
                oCurTrack.setProperty('maxValue', oThis.mMaxValue, true);
            });
        }
    },
    _updateTracks: function () {
        var aCurrentTracks = this.getAggregation('_tracks');
        var oChromosomeDetails = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails');
        var oThis = this;
        if (this.mTracksDisplayable) {
            var oData = this.getModel().getData();
            oThis.mMaxValue = 0;
            $.each(aCurrentTracks, function (i, oTrack) {
                var fMaxTrack = oTrack.setData(oData[i].result, true);
                if (oThis.mMaxValue < fMaxTrack) {
                    oThis.mMaxValue = fMaxTrack;
                }
                var oBrowserConfig = sap.ui.getCore().byId(oThis.getBrowser()).getSampleConfigColor();
                if (oBrowserConfig.categories && oBrowserConfig.categories[oData[i].categoryNumber]) {
                    oTrack.setProperty('color', oBrowserConfig.categories[oData[i].categoryNumber].color, true);
                } else {
                    oTrack.setProperty('color', oThis.getColor(i), true);
                }
                oTrack.setProperty('name', oThis.getTitlePrefix() + ': ' + oData[i].name, true);
                oTrack.setZoom(oChromosomeDetails.mChromosomeIndex, oChromosomeDetails.mChromosome, oChromosomeDetails.mBegin, oChromosomeDetails.mWidth, oChromosomeDetails.mZoomWidth);
            });
            $.each(aCurrentTracks, function (i, oTrack) {
                oTrack.setProperty('maxValue', oThis.mMaxValue, true);
            });
            this.triggerRedraw();
        } else {
            aCurrentTracks[0].setData({ message: this.mMessage }, true);
            aCurrentTracks[0].setZoom(oChromosomeDetails.mChromosomeIndex, oChromosomeDetails.mChromosome, oChromosomeDetails.mBegin, oChromosomeDetails.mWidth, oChromosomeDetails.mZoomWidth);
            aCurrentTracks[0].triggerRedraw();
        }
    },
    setData: function (oData) {
        if (oData.length !== this.getModel().getData().length || oData.hasOwnProperty('message')) {
            var oChromosomeDetails = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails');
            this._removeTracks();
            this.getModel().setData(oData);
            oChromosomeDetails.rerender();
        } else {
            this.getModel().setData(oData);
            this._updateTracks();
        }
    },
    onBeforeRendering: function () {
        var oData = this.getModel().getData();
        var aCurrentTracks = this.getAggregation('_tracks');
        if (!aCurrentTracks || aCurrentTracks.length !== oData.length || this.mMessage !== undefined) {
            this._updateAggregations(oData);
        } else {
            this._updateTracks(oData);
        }
    },
    /**
	 * Render header, connector lines
	 * and chromosome tracks
	 */
    renderer: {
        render: function (oRenderManager, oControl) {
            "use strict";
            //Render header
            oRenderManager.write('<g');
            oRenderManager.addClass('header');
            oRenderManager.writeClasses();
            oRenderManager.write('><rect');
            oRenderManager.addClass('bg');
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute('width', '100%');
            oRenderManager.writeAttribute('height', '24px');
            oRenderManager.write('/></g>');
            oRenderManager.write('<g');
            oRenderManager.addClass('connectors');
            oRenderManager.writeClasses();
            oRenderManager.write('>');
            var iConnectorWidth = 2;
            var iConnectorGap = 2;
            oRenderManager.write('<rect');
            oRenderManager.addClass('groupConnector');
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute('x', -20 + (12 - (iConnectorWidth * 2 + iConnectorGap)) / 2);
            oRenderManager.writeAttribute('y', 4);
            oRenderManager.writeAttribute('width', iConnectorWidth);
            oRenderManager.writeAttribute('height', oControl.getHeight() <= 0 ? 0 : oControl.getHeight() - 4);
            oRenderManager.writeAttribute('fill', '#aaaaaa');
            oRenderManager.write('></rect>');
            oRenderManager.write('<rect');
            oRenderManager.addClass('groupConnector');
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute('x', -20 + (12 - (iConnectorWidth * 2 + iConnectorGap)) / 2 + iConnectorWidth + iConnectorGap);
            oRenderManager.writeAttribute('y', 4);
            oRenderManager.writeAttribute('width', iConnectorWidth);
            oRenderManager.writeAttribute('height', oControl.getHeight() <= 0 ? 0 : oControl.getHeight() - 4);
            oRenderManager.writeAttribute('fill', '#aaaaaa');
            oRenderManager.write('></rect>');
            oRenderManager.write('</g>');
            oRenderManager.write('<g');
            oRenderManager.writeControlData(oControl);
            oRenderManager.write('>');
            var aUpdatedSubTracks = oControl.getAggregation('_tracks');
            if (aUpdatedSubTracks) {
                $.each(aUpdatedSubTracks, function (i, oTrack) {
                    oRenderManager.write('<g');
                    oRenderManager.addClass('track');
                    oRenderManager.writeClasses();
                    if (oControl.getMinimized()) {
                        oRenderManager.writeAttribute('height', '0px');
                        oRenderManager.writeStyles();
                    } else {
                        oRenderManager.writeAttributeEscaped('height', oControl.getHeight() + 'px');
                    }
                    oRenderManager.writeAttribute('transform', 'translate(0, ' + (oControl.mCurrentTrackHeight + 24) * i + ')');
                    oRenderManager.write('>');
                    oRenderManager.renderControl(oTrack);
                    oTrack.renderDecoration(oRenderManager, i === 0);
                    oRenderManager.write('</g>');
                });
            }
            oRenderManager.write('</g>');
        }
    },
    /**
	 * Update track decorations
	 */
    onAfterRendering: function () {
        var oTitles = d3.selectAll('#' + this.getId() + ' > g.track > g.header text ');
        var aEyecatchers = d3.selectAll('#' + this.getId() + ' rect.eyecatcher');
        var aTitleBackgrounds = d3.selectAll('#' + this.getId() + ' > g.track g.header rect.bg');
        var iTrackCount = $.isEmptyObject(this.getModel().getData()) ? 0 : this.getModel().getData().length;
        var oThis = this;
        if (this.getMinimized()) {
            oTitles.text(function (oText, i) {
                return i === 0 ? oThis.getTitlePrefix() + ': ' + iTrackCount + ' track' + (iTrackCount === 1 ? '' : 's') : oThis.getAggregation('_tracks')[i].getName();
            }).attr('visibility', function (oText, i) {
                return i === 0 ? 'visible' : 'hidden';
            });
            aEyecatchers.attr('visibility', 'hidden');
            aTitleBackgrounds.attr('visibility', 'hidden');
        }
        if (this.mMessage !== undefined) {
            d3.selectAll('#' + this.getId() + ' rect.eyecatcher').attr('visibility', 'hidden');
        }
    },
    triggerRedraw: function () {
        if (!$.isEmptyObject(this.getAggregation('_tracks'))) {
            var aTracks = this.getAggregation('_tracks');
            d3.selectAll('#' + this.getId() + " > g.track > g.header > text").data(aTracks).text(function (oTrack) {
                return oTrack.getName();
            });
            $.each(aTracks, function (i, track) {
                track.triggerRedraw();
            });
        }
    },
    triggerPan: function (iBegin) {
        if (!$.isEmptyObject(this.getAggregation('_tracks'))) {
            $.each(this.getAggregation('_tracks'), function (i, track) {
                track.triggerPan(iBegin);
            });
        }
    },
    setZoom: function (iChromosomeIndex, oChromosomeInfo, begin, width, windowWidth) {
        if (!$.isEmptyObject(this.getAggregation('_tracks'))) {
            $.each(this.getAggregation('_tracks'), function (i, oTrack) {
                oTrack.setZoom(iChromosomeIndex, oChromosomeInfo, begin, width, windowWidth);
            });
        }
        this.getAggregation('templateTrack').setZoom(iChromosomeIndex, oChromosomeInfo, begin, width, windowWidth);
    },
    renderDecoration: function (oRenderManager) {
    },
    _updateConnectors: function () {
        var oConnectorGroup = d3.select('g.trackGroup > g.connectors');
        oConnectorGroup.selectAll('rect').attr('height', this.getHeight() <= 0 ? 0 : this.getCompleteTrackHeight() - 8);
    },
    getColor: function (iIndex) {
        return this.getColors()[iIndex % this.getColors().length];
    },
    getCompleteTrackHeight: function () {
        if (!$.isEmptyObject(this.getAggregation('_tracks'))) {
            return this.getMinimized() ? '24' : this.getAggregation('_tracks').length * (this.mCurrentTrackHeight + 24);
        } else {
            return 0;
        }
    },
    getHeight: function () {
        return this.getCompleteTrackHeight();
    },
    getName: function () {
        return this.getTitlePrefix();
    },
    setMinimized: function (bMinimized) {
        this.setProperty('minimized', bMinimized, true);
        var aSubTracks = d3.selectAll('#' + this.getId() + ' g.track');
        var aTitles = d3.selectAll('#' + this.getId() + ' > g.track g.header text');
        var aTitleBackgrounds = aSubTracks.selectAll('g.header rect.bg');
        var iTrackCount = $.isEmptyObject(this.getModel().getData()) ? 0 : this.getModel().getData().length;
        var aGroupConnectors = d3.select(d3.select('#' + this.getId()).node().parentNode).selectAll('g.connectors rect.groupConnector');
        var aTracks = this.getAggregation('_tracks');
        var oThis = this;
        if (aTracks) {
            $.each(aTracks, function (i, oTrack) {
                oTrack.setMinimized(bMinimized);
            });
        }
        if (bMinimized) {
            aSubTracks.transition().attr('height', '0px');
            aSubTracks.selectAll('rect.eyecatcher').transition().attr('height', '0px');
            aGroupConnectors.transition().attr('height', 20);
            aTitles.transition().delay(250).text(function (d, i) {
                if (i === 0) {
                    return oThis.getTitlePrefix() + ': ' + iTrackCount + ' track' + (iTrackCount === 1 ? '' : 's') + ' ' + (oThis.mMessage ? oThis.mMessage : '');
                } else {
                    return aTracks[i].getName();
                }
            }).attr('visibility', function (d, i) {
                return i === 0 ? 'visible' : 'hidden';
            });
            aTitleBackgrounds.attr('visibility', 'hidden');
        } else {
            aSubTracks.transition().attr('height', this.mCurrentTrackHeight + 20 + 'px');
            aSubTracks.selectAll('rect.eyecatcher').transition().attr('height', this.mCurrentTrackHeight + 20 + 'px').attr('visibility', this.mMessage !== undefined ? 'hidden' : 'visible');
            aGroupConnectors.transition().attr('height', this.getHeight() - (this.mMessage !== undefined ? 4 : 8));
            aTitles.text(function (d, i) {
                return aTracks[i].getName() + ' ' + aTracks[i].getSampleCount();
            }).attr('visibility', 'visible');
            aTitleBackgrounds.attr('visibility', 'visible');
        }
    },
    getInitRequest: function () {
        var oInitRequest = this.getAggregation('templateTrack').getInitRequest();
        if (oInitRequest.pluginFunction) {
            return {
                pluginFunction: this.mPluginId,
                isInit: true,
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
    getUpdateRequest: function () {
        var oUpdateRequest = this.getAggregation('templateTrack').getUpdateRequest();
        if (oUpdateRequest.pluginFunction) {
            return {
                pluginFunction: this.mPluginId,
                isInit: oUpdateRequest.isInit,
                parameters: {
                    groupsRequest: this.getPluginId(),
                    groupsParameters: this.getParameters(),
                    trackRequest: oUpdateRequest.pluginFunction,
                    trackParameters: oUpdateRequest.parameters,
                    maxCount: this.getMaxCount()
                }
            };
        } else {
            return {};
        }
    },
    _clear: function () {
        var aUpdatedSubTracks = this.getAggregation('_tracks');
        if (!$.isEmptyObject(aUpdatedSubTracks)) {
            $.each(aUpdatedSubTracks, function (i, oTrack) {
                oTrack._clear();
            });
        }
    },
    _removeTracks: function () {
        if (this.getAggregation('_tracks')) {
            var iTrackCount = this.getAggregation('_tracks').length;
            for (var i = 0; i < iTrackCount; i++) {
                this.getAggregation('_tracks')[0].destroy();
            }
        }
        this.removeAllAggregation('_tracks');
    },
    setBusy: function (bLoad) {
        var aUpdatedSubTracks = this.getAggregation('_tracks');
        if (!$.isEmptyObject(aUpdatedSubTracks)) {
            $.each(aUpdatedSubTracks, function (i, oTrack) {
                oTrack.setBusy(bLoad);
            });
        }
    },
    setHasInitialData: function (bHasInitialData) {
        this.getAggregation('templateTrack').setHasInitialData(bHasInitialData);
        var aSubTracks = this.getAggregation('_tracks');
        if (!$.isEmptyObject(aSubTracks)) {
            $.each(aSubTracks, function (i, oTrack) {
                oTrack.setHasInitialData(bHasInitialData);
            });
        }
    }
});