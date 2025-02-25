jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.Track');
sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.chromosome.Track', {
    metadata: {
        properties: {
            type: { type: 'string' },
            name: { type: 'string' },
            height: { type: 'int' },
            minimized: {
                type: 'boolean',
                defaultValue: false
            },
            color: {
                type: 'string',
                defaultValue: '#aaaaaa'
            },
            dataPlugin: { type: 'string' },
            initPlugin: { type: 'string' },
            parameters: {
                type: 'object',
                defaultValue: {}
            },
            binSize: {
                type: 'float',
                defaultValue: 0
            },
            minValue: {
                type: 'float',
                defaultValue: 0
            },
            maxValue: { type: 'float' },
            showSampleCount: {
                type: 'boolean',
                defaultValue: false
            }
        },
        events: { 'redraw': { allowPreventDefault: true } },
        associations: {
            browser: {
                type: 'hc.hph.genomics.ui.lib.VariantBrowser',
                multiple: false
            }
        }
    },
    init: function () {
        this.mChromosome = null;
        this.mChromosomeIndex = null;
        this.mSVG = null;
        this.mBackgroundContent = null;
        this.mDynamicContent = null;
        this.mForegroundContent = null;
        this.mBegin = 0;
        this.mDrawBegin = 0;
        this.mWidth = 0;
        this.mPxPerBp = 0;
        this.mPositionScale = null;
        this.mOrigin = 0;
        this.mRequest = null;
        this.mRequestURL = null;
        this.mClearEvent = null;
        this.mInitial = true;
        this.setModel(new sap.ui.model.json.JSONModel());
    },
    setBrowser: function (oBrowser) {
        this.setAssociation('browser', oBrowser, true);
    },
    //Needs to return max value
    setData: function (oData, bNoRedraw) {
        this.mInitial = false;
        if (!bNoRedraw) {
            this.getModel().setData(oData);
            this.triggerRedraw();
        } else {
            this.getModel().setData(oData);
        }
    },
    _clear: function () {
        if (this.mDynamicContent) {
            this.mDynamicContent.selectAll('*').remove();
        }
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            oRenderManager.write('<svg');
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass('sapUiGen-Track');
            if (oControl.getType()) {
                oRenderManager.addClass(oControl.getType());
            }
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute('y', '24px');
            oRenderManager.writeAttribute('width', '100%');
            if (oControl.getMinimized()) {
                oRenderManager.writeAttribute('height', '0px');
                oRenderManager.addStyle('visibility', 'hidden');
                oRenderManager.writeStyles();
            } else {
                oRenderManager.writeAttributeEscaped('height', oControl.getHeight() + 'px');
            }
            oRenderManager.write('></svg>');
        }
    },
    renderDecoration: function (oRenderManager, bNoHeader) {
        oRenderManager.write('<g');
        oRenderManager.addClass('header');
        oRenderManager.writeClasses();
        oRenderManager.write('>');
        if (!bNoHeader) {
            oRenderManager.write('<rect');
            oRenderManager.addClass('bg');
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute('width', '100%');
            oRenderManager.writeAttribute('height', '24px');
            oRenderManager.write('/>');
        }
        if (this.getName()) {
            oRenderManager.write('<text');
            oRenderManager.writeAttribute('y', 14);
            oRenderManager.write('>');
            oRenderManager.writeEscaped(this.getName() + ' ' + this.getSampleCount());
            oRenderManager.write('</text>');
        }
        oRenderManager.write('</g><rect');
        oRenderManager.addClass('eyecatcher');
        oRenderManager.writeClasses();
        oRenderManager.writeAttribute('x', -20);
        oRenderManager.writeAttribute('y', 4);
        oRenderManager.writeAttribute('width', 12);
        oRenderManager.writeAttribute('fill', this.getColor());
        oRenderManager.write('/>');
    },
    updateDecoration: function () {
        if (d3.select('#' + this.getId()).node()) {
            var oGroup = d3.select(d3.select('#' + this.getId()).node().parentNode);
            this.updateObject(oGroup.select('g.track > rect.eyecatcher'), 'height', (this.getMinimized() ? 20 : this.getHeight() + 20) + 'px');
            oGroup.select('g.track > g.header text').text(this.getName() + ' ' + this.getSampleCount());
        }
    },
    onAfterRendering: function () {
        this.mSVG = d3.select('#' + this.getId()).attr('width', sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').mZoomWidth).attr('height', this.getHeight());
        this.updateDecoration();
        if (sap.ui.getCore().byId(this.getBrowser()).isInDetailMode()) {
            this.triggerRedraw();
        }
    },
    updateObject: function (oObject, sAttr, sValue) {
        if (!oObject.attr(sAttr)) {
            oObject.attr(sAttr, sValue);
        } else if (oObject.attr(sAttr) !== sValue) {
            oObject.transition().duration(250).attr(sAttr, sValue);
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
    setProperties: function (oParameters) {
    },
    getUpdateRequest: function () {
        return {
            pluginFunction: this.getDataPlugin(),
            parameters: this.getParameters(true),
            merge: false
        };
    },
    /**
	 * isInit property will be evaluated by VariantBrowser when it sets  
	 * data for this track. Introduced to trigger a reload for tracks
	 * which return an empty object in getUpdateRequest.
	 * The aforementioned behavior led to an inconsistent track state
	 * when getUpdateRequest was called although the initial call
	 * was not completed yet. 
	 */
    getInitRequest: function () {
        this.mHasInitialData = false;
        //Wil be set to true once data by this request was received
        return {
            pluginFunction: this.getInitPlugin(),
            isInit: true,
            parameters: this.getParameters(true),
            merge: false
        };
    },
    getCompleteTrackHeight: function () {
        return this.getHeight() + 24;
    },
    setMinimized: function (bMinimized) {
        this.setProperty('minimized', bMinimized, true);
        var oTrack = d3.select('#' + this.getId());
        var oEyecatcher = d3.select(oTrack.node().parentNode).select('rect.eyecatcher');
        if (oTrack && oEyecatcher) {
            if (bMinimized) {
                oTrack.transition().duration(250).attr('height', '0px').each('end', function () {
                    oTrack.style('visibility', 'hidden');
                });
                oEyecatcher.transition().duration(250).attr('height', '20px').each('end', function () {
                    oTrack.style('visibility', 'hidden');
                });
            } else {
                oTrack.style('visibility', 'visible').transition().duration(250).attr('height', this.getHeight() + 'px');
                oEyecatcher.transition().duration(250).attr('height', this.getHeight() + 20 + 'px').each('end', function () {
                    oTrack.style('visibility', 'visible');
                });
            }
        }
    },
    createColorScale: function (minValue, maxValue, startColor, endColor) {
        return d3.scale.linear().domain([
            minValue,
            maxValue
        ]).range([
            startColor,
            endColor
        ]);
    },
    setZoom: function (iChromosomeIndex, oChromosomeInfo, begin, width, windowWidth) {
        // update track info
        this.mChromosome = oChromosomeInfo;
        this.mChromosomeIndex = iChromosomeIndex;
        this.old = this.mBegin;
        this.mBegin = begin;
        this.mDrawBegin = Math.max(0, Math.floor(begin - width));
        this.mWidth = width;
        this.mPxPerBp = windowWidth / this.mWidth;
        this.mSVG = d3.select('#' + this.getId()).attr('width', windowWidth).attr('height', this.getHeight());
        this.mPositionScale = d3.scale.linear().domain([
            this.mBegin,
            this.mBegin + this.mWidth
        ]).range([
            0,
            this.mWidth * this.mPxPerBp
        ]);
        this.mOrigin = Number(this.mPositionScale(this.mBegin));
        this.mBinCount = Math.ceil(this.mWidth / Math.max(1, this.mPxPerBp) * this.mPxPerBp * 3);
    },
    triggerRedraw: function () {
        // clear existing content
        if (this.mBackgroundContent) {
            this.mBackgroundContent.remove();
        }
        this.mBackgroundContent = this.mSVG.append('g').attr('class', 'bg');
        if (this.mDynamicContent) {
            this.mDynamicContent.remove();
        }
        this.mDynamicContent = this.mSVG.append('g').attr('class', 'content').attr('transform', 'translate(0,0)');
        if (this.mForegroundContent) {
            this.mForegroundContent.remove();
        }
        this.mForegroundContent = this.mSVG.append('g').attr('class', 'fg');
        // render initial content
        this.redraw();
        this.updateDecoration();
    },
    redraw: function () {
    },
    triggerPan: function (begin) {
        var fShift = this.mOrigin - this.mPositionScale(begin);
        this.mBegin = begin;
        this.mDrawBegin = Math.max(0, Math.floor(begin - this.mWidth));
        this.mDynamicContent.attr('transform', 'translate(' + fShift + ',0)');
        this.triggerRedrawAfterPan();
    },
    triggerRedrawAfterPan: function () {
    },
    getMaxData: function () {
    },
    setBusy: function (bLoad) {
        var oForeground = d3.select('#' + this.getId() + ' g.fg');
        if (bLoad) {
            var iDelay = 1700;
            oForeground.append('rect').attr('width', '100%').attr('height', '100%').attr('visibility', 'hidden');
            d3.select('#' + this.getId() + ' g.content').attr('opacity', 0.4);
            if ($('#' + this.getId() + ' g.fg').get(0)) {
                var oRectGroup = oForeground.append('g').attr('class', 'busyIndicatorRectGroup').attr('transform', 'translate(' + ($('#' + this.getId() + ' g.fg').get(0).getBBox().width / 2 - 20) + ',' + ($('#' + this.getId() + ' g.fg').get(0).getBBox().height / 2 - 4) + ')');
                oRectGroup.append('rect').transition().delay(iDelay).attr('class', 'busyRect1').attr('width', '8px').attr('height', '8px').attr('fill', '#dddddd').attr('rx', '1').attr('ry', '1');
                oRectGroup.append('rect').transition().delay(iDelay).attr('class', 'busyRect2').attr('width', '8px').attr('height', '8px').attr('fill', '#dddddd').attr('rx', '1').attr('ry', '1').attr('x', '16');
                oRectGroup.append('rect').transition().delay(iDelay).attr('class', 'busyRect3').attr('width', '8px').attr('height', '8px').attr('fill', '#dddddd').attr('rx', '1').attr('ry', '1').attr('x', '32');
                oForeground.append('rect').attr('class', 'busyIndicator');
            }
        } else {
            d3.select('#' + this.getId() + ' g.content').attr('opacity', 1);
            oForeground.select('g.busyIndicatorRectGroup').remove();
        }
    },
    getSampleCount: function () {
        if (this.getShowSampleCount()) {
            var iSampleCount = this.getModel().getData().sampleCount;
            if (iSampleCount) {
                if (iSampleCount > 1) {
                    return '(' + this.getModel("i18n.vb").getResourceBundle().getText("common.MultipleSamplesInTrack", [iSampleCount]) + ')';
                } else if (iSampleCount < 1) {
                    return '(' + this.getModel("i18n.vb").getResourceBundle().getText("common.NoSamplesInTrack") + ')';
                } else {
                    return '(' + this.getModel("i18n.vb").getResourceBundle().getText("common.OneSampleInTrack") + ')';
                }
            } else {
                return '';
            }
        } else {
            return '';
        }
    },
    /**
	 * Will be set by VariantBrowser after the data of getInitRequest was received. 
	 */
    setHasInitialData: function (bHasInitialData) {
        this.mHasInitialData = bHasInitialData;
    },
    isInteractive: function () {
        return this.mPxPerBp <= 1;
    }
});