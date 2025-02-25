jQuery.sap.require("sap.ui.core.Control");
jQuery.sap.require("hc.hph.genomics.ui.icons.sap-hc-hph-genomics-icons");
jQuery.sap.declare("hc.hph.genomics.ui.lib.VariantBrowser");
jQuery.sap.includeStyleSheet("/hc/hph/genomics/ui/styles/VariantBrowser.css", "hc.hph.genomics.ui.styles.VariantBrowser.css");
sap.ui.define([
    "hc/hph/core/ui/AjaxUtils",
    "sap/ui/core/IconPool",
    "hc/hph/genomics/ui/lib/vb/overview/TrackGroup",
    "hc/hph/genomics/ui/lib/vb/overview/Center",
    "sap/ui/thirdparty/d3"
], function (AjaxUtils, IconPool, TrackGroup, Center, D3) {
    var VariantBrowser = sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.VariantBrowser', {
        metadata: {
            properties: {
                allowRemove: {
                    type: 'bool',
                    defaultValue: false
                },
                autoResize: {
                    type: 'boolean',
                    defaultValue: true
                },
                preRequestPlugin: { type: 'string' },
                validationPlugin: { type: 'string' },
                validationParameters: {
                    type: 'object',
                    defaultValue: null
                },
                parameters: {
                    type: 'object',
                    defaultValue: {}
                },
                overviewArcBinSize: {
                    type: 'float',
                    defaultValue: 0.5
                },
                enableSettings: {
                    type: 'boolean',
                    defaultValue: true
                },
                variantConfiguration: {
                    type: 'object',
                    defaultValue: {}
                },
                preferredColors: {
                    type: 'string[]',
                    defaultValue: [
                        '#F34235',
                        '#E91D62',
                        '#9C26AF',
                        '#6739B7',
                        '#3E50B5',
                        '#2095F3',
                        '#02A9F4',
                        '#00BCD4',
                        '#009688',
                        '#4BAF4F',
                        '#8AC349',
                        '#CDDC38',
                        '#FFEB3A',
                        '#FFC106',
                        '#FF9800',
                        '#FF5721',
                        '#795447',
                        '#9D9D9D',
                        '#607D8B'
                    ]
                },
                application: { type: 'string' },
                geneticFilterCardConfig: {
                    type: 'object',
                    defaultValue: {}
                }
            },
            aggregations: {
                overviewTracks: {
                    type: 'hc.hph.genomics.ui.lib.vb.overview.Track',
                    multiple: true
                },
                overviewCenter: {
                    type: 'hc.hph.genomics.ui.lib.vb.overview.Center',
                    multiple: false
                },
                chromosomeTracks: {
                    type: 'hc.hph.genomics.ui.lib.vb.chromosome.Track',
                    multiple: true
                },
                siteSections: {
                    type: 'hc.hph.genomics.ui.lib.vb.site.Section',
                    multiple: true
                },
                _chromosomeDetails: {
                    type: 'hc.hph.genomics.ui.lib.ChromosomeDetails',
                    multiple: false,
                    visibility: 'hidden'
                }
            },
            events: { error: { allowPreventDefault: true } }
        },
        init: function () {
            "use strict";
            this.mMargin = {
                top: 8,
                left: 8,
                bottom: 8,
                right: 8
            };
            this.mOverviewMargin = $.extend(true, {}, this.mMargin);
            this.mOverviewWidth = 0;
            this.mOverviewHeight = 0;
            this.mOverviewRadius = 0;
            this.mSelectedChromosome = null;
            this.mOverviewLayouts = [];
            this.mGapSize = null;
            this.mOverviewTrackGapSize = 0.015;
            this.mArcScale = null;
            this.mLinearScale = null;
            this.mSvOpacity = 0.5;
            this.mInnerTrackRadius = 0.70;
            this.mOuterTrackRadius = 0.95;
            this.mOverviewTracks = [];
            this.mInitialized = false;
            this.mTotalTrackHeightMax = 0.90;
            this.mCurrentTotalTrackHeight = 0;
            this.mOverviewStatus = 'overview';
            this.mDetailStatus = 'detail';
            this.mCurrentStatus = 'overview';
            this.mLastMovePosition = 0;
            var oThis = this;
            this.mResizeHandlerID = null;
            this.mResizeTimer = null;
            this.mInitial = true;
            this.mSampleConfig = "sampleConfig";
            this.mVariantConfig = "groupConfig";
            this.mTrackConfig = "trackConfig";
            // Resize handling
            sap.ui.getCore().attachInit(function () {
                oThis.mResizeHandlerID = sap.ui.core.ResizeHandler.register(oThis, function () {
                    if (oThis.getAutoResize() && this.iWidth > 0 && this.iHeight > 0) {
                        clearTimeout(oThis.mResizeTimer);
                        oThis.mResizeTimer = setTimeout(function () {
                            oThis.rerender();
                            oThis.mResizeTimer = null;
                        }, 250);
                    }
                });
            });
            this.setAggregation('_chromosomeDetails', new ChromosomeDetails({ browser: this }), true);
            this.setModel(new sap.ui.model.resource.ResourceModel({
                bundleUrl: "/hc/hph/genomics/ui/i18n/vb/messagebundle.properties",
                bundleLocale: sap.ui.getCore().getConfiguration().getLanguage()
            }), "i18n.vb");
        },
        exit: function () {
            if (this.mResizeTimer) {
                clearTimeout(this.mResizeTimer);
            }
            if (this.mResizeHandlerID) {
                sap.ui.core.ResizeHandler.deregister(this.mResizeHandlerID);
            }
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                "use strict";
                oRenderManager.write('<div');
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass('sapUiGen-VariantBrowser');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                oRenderManager.write('<div');
                oRenderManager.addClass('sapUiGen-PopUpOverlay');
                oRenderManager.writeClasses();
                oRenderManager.write('></div>');
                // render legend panel
                oRenderManager.write('<div');
                oRenderManager.addClass('sapUiGen-LegendPanel');
                if (oControl.mLegendShown) {
                    oRenderManager.addClass('show');
                } else {
                    oRenderManager.addClass('hide');
                }
                oRenderManager.writeClasses();
                if (oControl.mCurrentStatus === oControl.mDetailStatus) {
                    oRenderManager.addStyle('display', 'none');
                    oRenderManager.writeStyles();
                }
                oRenderManager.write('>');
                var overviewTracks = oControl.getOverviewTracks();
                if (!$.isEmptyObject(oControl.getOverviewCenter())) {
                    overviewTracks.push(oControl.getOverviewCenter());
                }
                for (var i = 0; i < overviewTracks.length; i++) {
                    // Write standard legend
                    var trackStandardLegend = overviewTracks[i].getAggregation('_standardLegend');
                    if (trackStandardLegend) {
                        trackStandardLegend.setProperty('name', overviewTracks[i].getName(), true);
                        trackStandardLegend.setProperty('color', overviewTracks[i].getColor(), true);
                        oRenderManager.renderControl(trackStandardLegend);
                    }
                    // Write advanced legends
                    var trackLegends = overviewTracks[i].getLegends();
                    for (var y = 0; y < trackLegends.length; y++) {
                        trackLegends[y].setProperty('name', overviewTracks[i].getName(), true);
                        trackLegends[y].setProperty('color', overviewTracks[i].getColor(), true);
                        oRenderManager.renderControl(trackLegends[y]);
                    }    // End legend Track
                         // oRenderManager.write('</div>');
                }
                // render legend arrow
                oRenderManager.write('<div');
                oRenderManager.addClass('sapUiGen-LegendArrow');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                if (oControl.mLegendShown) {
                    oRenderManager.write(IconPool.getIconInfo('navigation-right-arrow').content);
                } else {
                    oRenderManager.write(IconPool.getIconInfo('navigation-left-arrow').content);
                }
                oRenderManager.write('</div>');
                oRenderManager.write('</div>');
                // end render legend
                // render config
                if (oControl.getEnableSettings()) {
                    oRenderManager.write('<div');
                    oRenderManager.addClass('sapUiGen-ConfigIcon');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oRenderManager.write(IconPool.getIconInfo('action-settings').content);
                    oRenderManager.write('</div>');    // end render config
                }
                oRenderManager.renderControl(oControl.getAggregation('_chromosomeDetails'));
                oRenderManager.write('</div>');
            }
        },
        getParameters: function () {
            var oParams = {};
            $.extend(oParams, this.getProperty("parameters"));
            var oConfigParams = this.getConfigParameters();
            if (oParams.annotationConfig) {
                oParams.annotationConfig = undefined;
            }
            if (!$.isEmptyObject(oConfigParams)) {
                oParams.annotationConfig = oConfigParams;
            }
            return oParams;
        },
        getI18nModel: function () {
            return this.getModel("i18n.vb");
        },
        getConfigParameters: function () {
            var oConfig = {};
            var oBrowserConfig = this.getVariantConfiguration();
            var oAnnotation = {};
            function retrieveCategories(aCategories) {
                for (var n = 0; n < aCategories.length; n++) {
                    if (aCategories[n].enabled) {
                        var aMappedCategories = {};
                        aMappedCategories.values = aCategories[n].values.map(function (d) {
                            return d.value;
                        });
                        aMappedCategories.name = aCategories[n].categoryName;
                        oAnnotation.categories.push(aMappedCategories);
                    }
                }
                oConfig[sConfig] = oAnnotation;
            }
            for (var sConfig in oBrowserConfig) {
                if (oBrowserConfig[sConfig][0]) {
                    switch (sConfig) {
                    case this.mVariantConfig:
                        oAnnotation = {
                            table: oBrowserConfig[sConfig][0].table,
                            attribute: oBrowserConfig[sConfig][0].attribute,
                            categories: [],
                            binSize: this.mArcBinSize
                        };
                        break;
                    case this.mSampleConfig:
                        oAnnotation = {
                            sampleCategory: oBrowserConfig[sConfig][0].sampleCategory,
                            categories: []
                        };
                        break;
                    }
                    retrieveCategories(oBrowserConfig[sConfig][0].categories, sConfig);
                }
            }
            return oConfig;
        },
        /**
	 * In case the variant browser is configured regarding color coding returns color of category, null if not configured
	 * 
	 * @params sCategory name of category of which color has to be returned
	 * @returns {string|null} color of category in rgb(redVal, greenVal, blueValue) format
	 */
        getCategoryColor: function (iIndex) {
            var oBrowserConfig = this.getVariantConfiguration();
            if (oBrowserConfig.groupConfig && oBrowserConfig.groupConfig.length > 0 && !$.isEmptyObject(oBrowserConfig.groupConfig[0].categories)) {
                return this.getConfigColors()[iIndex];
            } else {
                return null;
            }
        },
        /**
	 * In case the variant browser is configured regarding color coding returns an array of all category colors, null if not configured
	 * 
	 * @return {array|null} of colors for each category in rgb(redVal, greenVal, blueValue) format
	 */
        getConfigColors: function () {
            var oBrowserConfig = this.getVariantConfiguration();
            if (oBrowserConfig.groupConfig && oBrowserConfig.groupConfig.length > 0 && !$.isEmptyObject(oBrowserConfig.groupConfig[0].categories)) {
                return oBrowserConfig.groupConfig[0].categories.filter(function (category) {
                    return category.enabled;
                }).map(function (cat) {
                    return cat.color;
                });
            } else {
                return null;
            }
        },
        getSampleConfigColor: function () {
            var oBrowserConfig = this.getVariantConfiguration();
            var oAnnotation = {};
            if (oBrowserConfig && oBrowserConfig[this.mSampleConfig] && oBrowserConfig[this.mSampleConfig].length > 0) {
                var aCategories = oBrowserConfig[this.mSampleConfig][0].categories;
                oAnnotation.categories = [];
                for (var n = 0; n < aCategories.length; n++) {
                    if (aCategories[n].enabled) {
                        var aMappedCategories = {};
                        aMappedCategories.color = aCategories[n].color;
                        oAnnotation.categories.push(aMappedCategories);
                    }
                }
            }
            return oAnnotation;
        },
        /**
	 * Return whether the VB is configured. It is considered configures if there are any enabled categories.
	 * 
	 * @return {true|false}
	 */
        isConfigured: function () {
            var oBrowserConfig = this.getVariantConfiguration();
            if (oBrowserConfig[this.mVariantConfig] && oBrowserConfig[this.mVariantConfig].length > 0 && !$.isEmptyObject(oBrowserConfig[this.mVariantConfig][0].categories)) {
                return oBrowserConfig[this.mVariantConfig][0].categories.filter(function (category) {
                    return category.enabled;
                }).length > 0 ? true : false;
            } else {
                return false;
            }
        },
        _drawLegend: function (delay, duration) {
            var aOverviewTracks = this.getOverviewTracks();
            aOverviewTracks.push(this.getOverviewCenter());
            if (!$.isEmptyObject(aOverviewTracks)) {
                // add legend div
                var oBrowser = d3.select('#' + this.getId());
                var oLegendPanel = oBrowser.select('div.sapUiGen-LegendPanel');
                var oLegendArrow = oLegendPanel.select('div.sapUiGen-LegendArrow');
                if (oLegendPanel && oLegendArrow) {
                    oLegendPanel.style('display', 'block').transition().delay(delay).duration(duration).style('opacity', 1);
                    oLegendArrow.style('display', 'block').transition().delay(delay).duration(duration).style('opacity', 1);
                } else {
                    oLegendPanel = oBrowser.insert('div', 'div.overview').attr('class', 'sapUiGen-LegendPanel hide').style('opacity', 0).transition().delay(delay).duration(duration).style('opacity', 1);
                    // Add legend Arrow with text
                    oLegendArrow = oLegendPanel.append('div').attr('class', 'sapUiGen-LegendArrow').style('opacity', 0).text(IconPool.getIconInfo('navigation-left-arrow').content);
                    oLegendArrow.transition().delay(delay).duration(duration).style('opacity', 1);
                }
            }
        },
        cancelAndReset: function () {
        },
        onBeforeRendering: function () {
            if (this.mInitial) {
                this._updateVBConfig();
                this.mInitial = false;
            }
            var aChromosomeTracks = this.getChromosomeTracks();
            for (var trackIndex = 0; trackIndex < aChromosomeTracks.length; ++trackIndex) {
                aChromosomeTracks[trackIndex].setBrowser(this);
            }
            var aOverviewTracks = this.getOverviewTracks();
            for (trackIndex = 0; trackIndex < aOverviewTracks.length; ++trackIndex) {
                aOverviewTracks[trackIndex].setBrowser(this);
            }
        },
        onAfterRendering: function () {
            var oThis = this;
            // Set toggle legend
            d3.select('#' + this.getId() + ' .sapUiGen-LegendArrow').on('click', function () {
                oThis.toggleLegend();
            });
            // Set vb config
            if (this.getEnableSettings()) {
                d3.select('#' + this.getId() + ' .sapUiGen-ConfigIcon').on('click', function () {
                    var oDialog = sap.ui.xmlview({
                        viewName: 'hc.hph.genomics.ui.lib.vb.browserConfig.view.BrowserConfig',
                        viewData: oThis
                    });
                    sap.ui.getCore().byId(oThis.getId()).addDependent(oDialog);
                    oDialog.getContent()[0].open();
                });
            }
            function onSuccess() {
                if ($.isEmptyObject(this.mData)) {
                    AjaxUtils.ajax({
                        url: '/hc/hph/genomics/services/',
                        method: 'POST',
                        cache: false,
                        data: JSON.stringify({
                            initRequests: oThis.getPreRequestPlugin() ? [ { name: oThis.getPreRequestPlugin(), suppressResult: true } ] : null,
                            request: "vb.General.getChromosomes",
                            parameters: oThis.getParameters(),
                            validationPlugin: oThis.getValidationPlugin(),
                            validationParameters: oThis.getValidationParameters(),
                            //name: oThis.getPreRequestPlugin(),
                            directResult: true
                        }),
                        contentType: 'application/json;charset=utf-8',
                        dataType: 'json'
                    }).done(function (oData) {
                        if (!oData.list || oData.list.length === 0) {
                            var oError = { errorCode: "error.NoData" };
                            oThis._handleError(oError);
                        } else {
                            oThis._create(oData);
                        }
                    }).fail(function (oResponse, sReason) {
                        if (sReason !== "abort") {
                            var oError = {
                                errorCode: "error.HTTP",
                                parameters: [
                                    oResponse.status,
                                    oResponse.statusText
                                ],
                                message: oResponse.responseText
                            };
                            oThis._handleError(oError);
                        }
                    });
                } else {
                    oThis._create(this.mData);
                }
                var bForceLegend = false;
                var aOverviewTracks = oThis.getOverviewTracks();
                $.each(aOverviewTracks, function (i, oTrack) {
                    if (!$.isEmptyObject(oTrack.getAllLegends())) {
                        $.each(oTrack.getAllLegends(), function (y, oLegend) {
                            bForceLegend |= !$.isEmptyObject(oTrack.mMessage);
                            oLegend._update(oTrack.mMessage);
                        });
                    }
                });
                if (bForceLegend) {
                    oThis.showLegend(true);
                }
            }
            if (!this.getProperty("parameters").reference) {
                this.setReferenceGenome(onSuccess);
            } else {
                onSuccess();
            }
        },
        _updateVBConfig: function () {
            var oTrackConfig;
            var oThis = this;
            AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                method: 'POST',
                cache: false,
                data: JSON.stringify({
                    request: "vb.General.getBrowserConfiguration",
                    parameters: {
                        application: this.getApplication(),
                        config: [this.mTrackConfig]
                    },
                    directResult: false
                }),
                contentType: 'application/json;charset=utf-8',
                dataType: 'json'
            }).done(function (oData) {
                if (oData.result[oThis.mTrackConfig]) {
                    oTrackConfig = oData.result[oThis.mTrackConfig];
                }
                if (!$.isEmptyObject(oTrackConfig)) {
                    oThis.removeAllAggregation("chromosomeTracks");
                    oThis.removeAllAggregation("overviewTracks");
                    oThis.removeAllAggregation("siteSections");
                    for (var i = 0; i < oTrackConfig.length; i++) {
                        oThis._instantiateControl(oTrackConfig[i].control, oThis);
                    }
                    var aChromosomeTracks = oThis.getChromosomeTracks();
                    for (var trackIndex = 0; trackIndex < aChromosomeTracks.length; ++trackIndex) {
                        aChromosomeTracks[trackIndex].setBrowser(oThis);
                    }
                    var aOverviewTracks = oThis.getOverviewTracks();
                    for (trackIndex = 0; trackIndex < aOverviewTracks.length; ++trackIndex) {
                        aOverviewTracks[trackIndex].setBrowser(oThis);
                    }
                }
            }).fail(function (oResponse, sReason) {
                if (sReason !== "abort") {
                    var oError = {
                        errorCode: "error.HTTP",
                        parameters: [
                            oResponse.status,
                            oResponse.statusText
                        ],
                        message: oResponse.responseText
                    };
                    oThis._handleError(oError);
                }
            });
        },
        _instantiateControl: function (aControl, oParent) {
            for (var j = 0; j < aControl.length; j++) {
                var oControlConfig = aControl[j];
                var oController = oParent;
                while (oController && !(oController instanceof sap.ui.core.mvc.View)) {
                    oController = oController.getParent();
                }
                if (oController) {
                    oController = oController.getController();
                }
                // instantiate control and set properties
                var oControl;
                try {
                    oControl = new (oControlConfig.controlName.split(".").reduce(function (oBase, sElement) {
                        return oBase[sElement];
                    }, window))(oControlConfig.properties, oController);
                } catch (exception) {
                    jQuery.sap.require(oControlConfig.controlName);
                    oControl = new (oControlConfig.controlName.split(".").reduce(function (oBase, sElement) {
                        return oBase[sElement];
                    }, window))(oControlConfig.properties, oController);
                }
                // attach Events
                if (oControlConfig.events) {
                    this._attachEvent(oControlConfig.events, oControl, oController);
                }
                // add or set aggregation
                if (oControlConfig.aggrName) {
                    var sFnName = oParent.getMetadata().getAllAggregations()[oControlConfig.aggrName]._sMutator;
                    oParent[sFnName](oControl);
                }
                if (oControlConfig.control) {
                    this._instantiateControl(oControlConfig.control, oControl);
                }
            }
        },
        _attachEvent: function (oEvents, oControl, oController) {
            for (var sParameter in oEvents) {
                if (oController.hasOwnProperty(oEvents[sParameter])) {
                    oControl.attachEvent(sParameter, oController[oEvents[sParameter]]);
                } else if (Object.getPrototypeOf(oController).hasOwnProperty(oEvents[sParameter])) {
                    oControl.attachEvent(sParameter, Object.getPrototypeOf(oController)[oEvents[sParameter]]);
                }
            }
        },
        setReferenceGenome: function (fnOnSuccess) {
            if (this.getValidationParameters()) {
               // var referenceIndex = 0;
                var oThis = this;
               /* var aRequests = [];
                if (this.getPreRequestPlugin()) {
                    aRequests.push({
                        name: this.getPreRequestPlugin(),
                        parameters: {},
                        exceptionsFatal: true
                    });
                    referenceIndex++;
                }
                aRequests.push({
                    name: 'vb.General.getGenomeReference',
                    dataset: this.getParameters().dataset
                }); */
                AjaxUtils.ajax({
                    type: 'POST',
                    url: '/hc/hph/genomics/services/',
                    dataType: 'json',
                    cache: false,
                    data: JSON.stringify({
                        initRequests: this.getPreRequestPlugin()?[{name:this.getPreRequestPlugin(), suppressResult: true}]:null,
                        requests: [ { name: 'vb.General.getGenomeReference', parameters: { dataset: this.getParameters().dataset } } ],
                        validationPlugin: this.getValidationPlugin(),
                        validationParameters: this.getValidationParameters(),
                        parameters: this.getParameters()
                    }),
                    contentType: 'application/json;charset=utf-8'
                }).done(function (oData) {
                    if (oData[0].result) {
                        oThis.getProperty("parameters").reference = oData[0].result.reference;
                        if (fnOnSuccess instanceof Function) {
                            fnOnSuccess();
                        }
                    } else {
                        oThis._handleError(oData[0].error);
                    }
                }).fail(function (oResponse, sReason) {
                    if (sReason !== "abort") {
                        oThis.setBusy(false);
                        var oError = {
                            errorCode: "error.HTTP",
                            parameters: [
                                oResponse.status,
                                oResponse.statusText
                            ],
                            message: oResponse.responseText
                        };
                        oThis._handleError(oError);
                    }
                });
            }
        },
        update: function (bReload) {
            if (this.isInOverviewMode()) {
                this.mSelectedChromosome = null;
                this._redrawOverviewData(bReload);
            } else if (this.isInDetailMode()) {
                this.getAggregation('_chromosomeDetails').update();
                this._redrawOverviewData(bReload);
            }
        },
        isInDetailMode: function () {
            return this.mCurrentStatus === this.mDetailStatus && this.mSelectedChromosome;
        },
        isInOverviewMode: function () {
            return this.mCurrentStatus === this.mOverviewStatus;
        },
        setBusy: function (bBusy) {
            this.mOverviewBusy = bBusy;
            // Indicates whether or not there is a backend request for the overview running
            if (this.isInOverviewMode()) {
                if (bBusy === false) {
                    // Circle load indicator
                    // d3.selectAll( '#' + this.getId() + '-overview > g.overview g.fg circle' ).classed('loading', false);
                    // Track segments
                    d3.selectAll('#' + this.getId() + '-overview > g.overview path:not(.chrom):not(.centromere)').classed('loading', false);
                    // Center track
                    d3.selectAll('#' + this.getId() + '-overview > g.overview g.sapUiGen-Center').classed('loading', false);
                    d3.selectAll('#' + this.getId() + '-overview > g.overview g.fg *').remove();
                } else {
                    // Circle load indicator
                    // d3.selectAll( '#' + this.getId() + '-overview > g.overview g.fg circle' ).classed('loading', true);
                    // Create loading indicator
                    var iRad = this.mOverviewWidth / 50;
                    var oForeground = d3.select('#' + this.getId() + '-overview > g.overview g.fg');
                    if (oForeground.select('g.busyIndicatorGroup').empty()) {
                        var oIndicatorGroup = oForeground.append('g').attr('class', 'busyIndicatorGroup').style('opacity', 1);
                        oIndicatorGroup.append('circle').attr('r', iRad + iRad / 5).attr('fill', 'white');
                        oIndicatorGroup.append('path').attr('class', 'busyIndicator').attr('d', 'M0,-' + iRad + ' A' + iRad + ' ' + iRad + ' 0 1 0 ' + iRad + ',0').attr('stroke', '#aaaaaa').attr('fill', 'none').attr('stroke-width', '0.7%').classed('loading', true);
                    }
                    // Track segments
                    d3.selectAll('#' + this.getId() + '-overview > g.overview path:not(.chrom):not(.centromere):not(.busyIndicator)').classed('loading', true);
                    // Center track
                    d3.selectAll('#' + this.getId() + '-overview > g.overview g.sapUiGen-Center').classed('loading', true);
                }
            }
        },
        goto: function (sQuery) {
            var bSuccess = null;
            var oThis = this;
            AjaxUtils.ajax({
                type: 'POST',
                url: '/hc/hph/genomics/services/',
                async: false,
                dataType: 'json',
                cache: false,
                data: JSON.stringify({
                    request: 'vb.General.searchFeature',
                    parameters: {
                        reference: this.getParameters().reference,
                        query: sQuery.trim()
                    },
                    directResult: true
                }),
                contentType: 'application/json;charset=utf-8'
            }).done(function (oData) {
                bSuccess = false;
                var oList = oThis.mData.list;
                for (var iChromIndex = 0; iChromIndex < oList.length; iChromIndex++) {
                    if (oList[iChromIndex].index === oData.chromosomeIndex) {
                        oThis.selectChromosome(oList[iChromIndex], oData.begin, oData.end - oData.begin);
                        bSuccess = true;
                        break;
                    }
                }
            }).fail(function () {
                bSuccess = false;
            });
            return bSuccess;
        },
        download: function (sFileName) {
            var oThis = this;
            AjaxUtils.ajax({
                type: 'GET',
                url: '/hc/hph/genomics/ui/icons/sap-hc-hph-genomics-icons.svg',
                dataType: 'xml'
            }).done(function (oFontData) {
                if (!sFileName) {
                    sFileName = encodeURIComponent(oThis.getParameters().reference + '_' + (oThis.mSelectedChromosome ? +oThis.mSelectedChromosome.name : 'overview')) + '.svg';
                }
                var oSVGExport = oThis.generateSVGExport();
                var oFontDOM = $(oFontData);
                oSVGExport.children('defs').append(oFontDOM.find('font'));
                var sCSS = '<style type="text/css" ><![CDATA[\n';
                for (var styleIndex = 0; styleIndex < document.styleSheets.length; ++styleIndex) {
                    var cssRules = document.styleSheets[styleIndex].cssRules;
                    for (var ruleIndex = 0; ruleIndex < cssRules.length; ++ruleIndex) {
                        var rule = cssRules[ruleIndex];
                        if (rule.hasOwnProperty('selectorText') && rule.hasOwnProperty('style')) {
                            if (rule.selectorText.substr(0, 10) === '.sapUiGen-') {
                                sCSS += rule.selectorText + '{' + rule.style.cssText + '}\n';
                            }
                        }
                    }
                }
                sCSS += ']]></style>';
                oSVGExport.children('defs').append(sCSS);
                var oAnchor = document.createElement('a');
                oAnchor.href = 'data:application/octet-stream;base64,' + window.btoa(unescape(encodeURIComponent(oSVGExport.get(0).outerHTML)));
                oAnchor.download = sFileName;
                oAnchor.click();
            }).fail(function (oResponse) {
                var oError = {
                    errorCode: "error.LoadingFont",
                    message: oResponse.responseText
                };
                oThis._handleError(oError);
            });
        },
        generateSVGExport: function () {
            var oSVG = this.$().find(this.mSelectedChromosome ? 'div.details svg' : 'div.overview svg');
            var oSVGExport = $('<svg class="sapUiGen-VariantBrowser" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><title></title><defs></defs></svg>');
            oSVGExport.children('title').text(this.mSelectedChromosome ? this.getParameters().reference + ' Chromosome ' + this.mSelectedChromosome.name : this.getParameters().reference);
            oSVGExport.attr('width', oSVG.width()).attr('height', oSVG.height()).append(oSVG.children().clone());
            return oSVGExport;
        },
        _create: function (data) {
            this.mData = data;
            this.mData.nameMap = {};
            for (var index = 0; index < this.mData.list.length; ++index) {
                var oChromosomeInfo = this.mData.list[index];
                oChromosomeInfo.index = index;
                this.mData.nameMap[oChromosomeInfo.name.trim().toUpperCase()] = index;
            }
            d3.select('#' + this.getId() + ' div.overview').remove();
            var oControl = $('#' + this.getId());
            this.mZoomWidth = oControl.width() - this.mMargin.left - this.mMargin.right;
            this.mOverviewMargin = $.extend(true, {}, this.mMargin);
            this.mOverviewWidth = oControl.width() - this.mOverviewMargin.left - this.mOverviewMargin.right;
            this.mOverviewHeight = oControl.height() - this.mOverviewMargin.top - this.mOverviewMargin.bottom;
            if (this.mOverviewWidth < this.mOverviewHeight) {
                this.mOverviewMargin.top += (this.mOverviewHeight - this.mOverviewWidth) / 2;
                this.mOverviewMargin.bottom += (this.mOverviewHeight - this.mOverviewWidth) / 2;
                this.mOverviewHeight = this.mOverviewWidth;
                this.mOverviewRadius = this.mOverviewWidth / 2;
            } else {
                this.mOverviewMargin.left += (this.mOverviewWidth - this.mOverviewHeight) / 2;
                this.mOverviewMargin.right += (this.mOverviewWidth - this.mOverviewHeight) / 2;
                this.mOverviewWidth = this.mOverviewHeight;
                this.mOverviewRadius = this.mOverviewHeight / 2;
            }
            // get scaling
            var iTotalSize = 0;
            var iVisibleChromosomes = 0;
            for (var iChromosomeIndex = 0; iChromosomeIndex < this.mData.list.length; ++iChromosomeIndex) {
                if (this.mData.list[iChromosomeIndex].visible) {
                    iTotalSize += this.mData.list[iChromosomeIndex].size;
                    ++iVisibleChromosomes;
                }
            }
            if (iTotalSize <= 0) {
                return;
            }
            if (iVisibleChromosomes !== 0) {
                this.mGapSize = iTotalSize * 0.1 / iVisibleChromosomes;
            }
            this.mLinearScale = (oControl.width() - this.mMargin.left - this.mMargin.right - 48) / (iTotalSize - this.mGapSize) / 1.1;
            if (iTotalSize !== 0) {
                this.mArcScale = 2 * Math.PI / iTotalSize / 1.1;
            }
            this.mArcBinSize = iTotalSize * this.getOverviewArcBinSize() / 360 / 1.1;
            var begin = 0;
            this.mOverviewLayouts = [];
            for (var iChromosomeIndex = 0; iChromosomeIndex < this.mData.list.length; ++iChromosomeIndex) {
                var oChromosomeInfo = this.mData.list[iChromosomeIndex];
                var iEnd = begin + oChromosomeInfo.size;
                var fBeginAngle = (begin + this.mGapSize / 2) * this.mArcScale - Math.PI;
                var fEndAngle = (iEnd + this.mGapSize / 2) * this.mArcScale - Math.PI;
                var fCenterAngle = (fBeginAngle + fEndAngle) / 2;
                var oLayout = {
                    index: iChromosomeIndex,
                    name: oChromosomeInfo.name,
                    info: oChromosomeInfo,
                    beginAngle: fBeginAngle,
                    endAngle: fEndAngle,
                    position: begin * this.mLinearScale,
                    width: oChromosomeInfo.size * this.mLinearScale,
                    rotationAngle: fCenterAngle * 180 / Math.PI,
                    cos: Math.cos(Math.PI / 2 - fCenterAngle),
                    sin: -Math.sin(Math.PI / 2 - fCenterAngle),
                    radialScale: d3.scale.linear().domain([
                        0,
                        oChromosomeInfo.size
                    ]).range([
                        fBeginAngle,
                        fEndAngle
                    ]),
                    centromere: null
                };
                if (this.mData.list[iChromosomeIndex].visible) {
                    // centromere
                    if (oChromosomeInfo.centromere && oLayout.centromere === null) {
                        oLayout.centromere = {
                            beginAngle: (begin + oChromosomeInfo.centromere.begin) * this.mArcScale - Math.PI,
                            position: (begin + oChromosomeInfo.centromere.begin) * this.mLinearScale,
                            endAngle: (begin + oChromosomeInfo.centromere.end) * this.mArcScale - Math.PI,
                            width: (oChromosomeInfo.centromere.end - oChromosomeInfo.centromere.begin) * this.mLinearScale
                        };
                    }
                    this.mOverviewLayouts.push(oLayout);
                    begin = iEnd + this.mGapSize;
                } else {
                    this.mOverviewLayouts.push(null);
                }
            }
            // prepare initial visualization
            if (this.mCurrentStatus === this.mOverviewStatus) {
                this._createOverview();
                this.update(!this.mInitialized);
                this.showLegend(this.mLegendShown);
                this.mInitialized = true;
            } else {
                this.selectChromosome(this.mCurrentChromInfo, this.mCurrentBegin, this.mCurrentWidth);
            }
            if (this._setCallbackGeneLink) {
                this._setCallbackGeneLink = false;
                this.goto(this._callBackGeneValue);
            }
        },
        selectChromosome: function (chromosomeInfo, begin, width) {
            var oChromosomeDetails = this.getAggregation('_chromosomeDetails');
            var bChromHasChanged = false;
            if (begin !== undefined && width !== undefined && chromosomeInfo === null) {
                chromosomeInfo = this.mCurrentChromInfo;
            }
            if (this.mCurrentChromInfo && chromosomeInfo) {
                if (this.mCurrentChromInfo.name !== chromosomeInfo.name) {
                    bChromHasChanged = true;
                }
            }
            width = Math.max(oChromosomeDetails.mZoomWidth / 24, width);
            this.mCurrentChromInfo = chromosomeInfo;
            this.mCurrentBegin = oChromosomeDetails.mBegin;
            this.mCurrentWidth = oChromosomeDetails.mWidth;
            if (chromosomeInfo !== null) {
                // chromosome was selected
                if (begin !== undefined && begin !== null) {
                    this.mBegin = begin;
                    if (width !== undefined && width !== null) {
                        this.mWidth = width;
                    } else {
                        this.mWidth = 1;
                    }
                } else {
                    // Selected for the first time
                    this.mBegin = 0;
                    this.mWidth = chromosomeInfo.size;
                }
                if (this.mSelectedChromosome === null) {
                    // From overview to detail view
                    this.mCurrentStatus = this.mDetailStatus;
                    this._animateOverview2Chromosome(chromosomeInfo);
                } else {
                    if (!bChromHasChanged) {
                        if (begin && width) {
                            this.mBegin = begin;
                            this.mWidth = width;
                        }
                        this._createChromosome(chromosomeInfo, false, true);
                    } else {
                        // Remove data in detail tracks
                        this._animateChromosome2Chromosome(chromosomeInfo);
                    }
                }
                this.mSelectedChromosome = chromosomeInfo;
            } else {
                // chromosome overview was selected
                this.mCurrentStatus = this.mOverviewStatus;
                // Remove data in detail tracks
                $.each(this.getChromosomeTracks(), function (i, track) {
                    track._clear();
                });
                oChromosomeDetails.mLastShift = 0;
                oChromosomeDetails.mCurrentShift = 0;
                this._animateChromosome2Overview();
                this.mSelectedChromosome = null;
            }
        },
        showPositionInformation: function (position) {
            var oChromosomeDetails = this.getAggregation('_chromosomeDetails');
            oChromosomeDetails.mCoordinate = position;
            oChromosomeDetails._showPositionInformation();
        },
        indexOfOverviewTrack: function (sTrackId) {
            var index = 0;
            var aOverviewTracks = this.getOverviewTracks();
            for (var i = 0; i < aOverviewTracks.length; i++) {
                var oTrack = aOverviewTracks[i];
                if (oTrack instanceof TrackGroup) {
                    if (oTrack.mTracksDisplayable && !$.isEmptyObject(oTrack.getAggregation('_tracks'))) {
                        for (var y = 0; y < oTrack.getAggregation('_tracks').length; y++) {
                            var subTrack = oTrack.getAggregation('_tracks')[y];
                            if (subTrack.getId() === sTrackId) {
                                return index;
                            } else {
                                index = index + 1;
                            }
                        }
                    }
                } else {
                    if (oTrack.getId() === sTrackId) {
                        return index;
                    } else {
                        index = index + 1;
                    }
                }
            }
            return index;
        },
        // Returns the sum of the height of all tracks in front of the given sTrackId
        getTrackHeightSum: function (sTrackId) {
            var fTrackHeightSum = 0;
            var aOverviewTracks = this.getOverviewTracks();
            for (var i = 0; i < aOverviewTracks.length; i++) {
                var oTrack = aOverviewTracks[i];
                if (oTrack instanceof TrackGroup) {
                    if (oTrack.mTracksDisplayable !== false && !$.isEmptyObject(oTrack.getAggregation('_tracks'))) {
                        for (var y = 0; y < oTrack.getAggregation('_tracks').length; y++) {
                            // Iterate throguh all tracks of group
                            var subTrack = oTrack.getAggregation('_tracks')[y];
                            if (subTrack.getId() === sTrackId) {
                                return fTrackHeightSum;
                            } else {
                                fTrackHeightSum += subTrack.getHeight() / 100;
                            }
                        }
                    }
                } else {
                    if (oTrack.getId() === sTrackId) {
                        return fTrackHeightSum;
                    } else {
                        fTrackHeightSum += oTrack.getHeight() / 100;
                    }
                }
            }
        },
        showLegend: function (show) {
            this.mLegendShown = show;
            var oPanel = this.$().find('.sapUiGen-LegendPanel');
            if (show !== oPanel.hasClass('show')) {
                var oArrow = this.$().find('.sapUiGen-LegendArrow');
                if (show) {
                    oArrow.html(IconPool.getIconInfo('navigation-right-arrow').content);
                    oPanel.removeClass('hide').addClass('show');
                } else {
                    oArrow.html(IconPool.getIconInfo('navigation-left-arrow').content);
                    oPanel.removeClass('show').addClass('hide');
                }
            }
        },
        toggleLegend: function () {
            var oPanel = this.$().find('.sapUiGen-LegendPanel');
            this.showLegend(oPanel.hasClass('hide'));
        },
        _clearContent: function () {
            d3.select('#' + this.getId() + ' > div.overview').remove();
            d3.select('#' + this.getAggregation('_chromosomeDetails').getId()).style('display', 'none');
        },
        _createOverview: function () {
            this._createHeader(null);
            if (!this.mData) {
                return;
            }
            var oThis = this;
            var oContent = d3.select('#' + this.getId()).insert('div', 'div.details').attr('class', 'overview').style('position', 'absolute');
            var svg = oContent.append('svg').attr('id', this.getId() + '-overview').attr('width', this.mOverviewWidth + this.mOverviewMargin.left + this.mOverviewMargin.right).attr('height', this.mOverviewHeight + this.mOverviewMargin.top + this.mOverviewMargin.bottom);
            var overview = svg.append('g').attr('class', 'overview').attr('transform', 'translate(' + (this.mOverviewMargin.left + this.mOverviewWidth / 2) + ',' + (this.mOverviewMargin.top + this.mOverviewHeight / 2) + ')');
            var arc = d3.svg.arc().innerRadius(function (interval) {
                return oThis.mOverviewRadius * interval.innerRadius - 20;
            }).outerRadius(function (interval) {
                return oThis.mOverviewRadius * interval.outerRadius - 20;
            }).startAngle(function (interval) {
                return interval.beginAngle;
            }).endAngle(function (interval) {
                return interval.endAngle;
            });
            var sectorArc = d3.svg.arc().innerRadius(function () {
                return oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20;
            }).outerRadius(function () {
                return oThis.mOverviewRadius - 20;
            }).startAngle(function (interval) {
                return interval.beginAngle;
            }).endAngle(function (interval) {
                return interval.endAngle;
            });
            var aFilteredLayouts = this.mOverviewLayouts.filter(function (oLayout) {
                return oLayout !== null;
            });
            var chromosomeGroups = overview.selectAll('g.sapUiGen-Chrom').data(aFilteredLayouts).enter().append('g').attr('class', 'sapUiGen-Chrom');
            // chromosome sectors
            chromosomeGroups.append('path').attr('class', 'invisible').style('pointer-events', 'all').attr('d', function (item) {
                return sectorArc(item);
            }).on('tap', function (item) {
                oThis.selectChromosome(item.info);
            }).on('click', function (item) {
                oThis.selectChromosome(item.info);
            }).on('mouseenter', function (item) {
                oThis.mSelectedChrom = -1;
                d3.selectAll('g.overview g.sapUiGen-Chrom').classed('fakeHover', false);
                var pointer = d3.mouse(this);
                var distance = Math.sqrt(pointer[0] * pointer[0] + pointer[1] * pointer[1]);
                overview.append('path').attr('class', 'cursor').style('pointer-events', 'none').attr('d', oThis._generateRayFromRatios(oThis.mOverviewRadius - 20, oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20, pointer[0] / distance, pointer[1] / distance));
                overview.select('g.sapUiGen-Center').selectAll('path').filter(function (data) {
                    return data.source.index != item.index && data.target.index != item.index;
                }).transition().duration(250).style('opacity', 0.1);
                overview.select('g.sapUiGen-Center').selectAll('path').filter(function (data) {
                    return data.source.index === item.index || data.target.index === item.index;
                }).transition().duration(250).style('opacity', 1);
            }).on('mousemove', function () {
                var pointer = d3.mouse(this);
                var distance = Math.sqrt(pointer[0] * pointer[0] + pointer[1] * pointer[1]);
                overview.select('path.cursor').attr('d', oThis._generateRayFromRatios(oThis.mOverviewRadius * oThis.mOuterTrackRadius - 20, oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20, pointer[0] / distance, pointer[1] / distance));
            }).on('mouseleave', function () {
                overview.select('path.cursor').remove();
                overview.select('g.sapUiGen-Center').selectAll('path').transition().duration(250).style('opacity', oThis.mSvOpacity);
            });
            // Draw overview chromosome marker
            chromosomeGroups.append('path').attr('class', 'chrom').style('pointer-events', 'none').attr('d', function (item) {
                return arc({
                    beginAngle: item.beginAngle,
                    endAngle: item.endAngle,
                    innerRadius: 0.95,
                    outerRadius: 1.0
                });
            });
            // label
            chromosomeGroups.append('text').attr('class', 'label').style('pointer-events', 'none').attr('text-anchor', 'middle').attr('x', 0).attr('y', -this.mOverviewRadius + 12).attr('transform', function (item) {
                return 'rotate(' + item.rotationAngle + ')';
            }).text(function (item) {
                return item.name;
            });
            // centromere
            chromosomeGroups.filter(function (item) {
                return item.centromere !== null;
            }).append('path').attr('class', 'centromere').style('pointer-events', 'none').attr('d', function (item) {
                return arc({
                    beginAngle: item.centromere.beginAngle,
                    endAngle: item.centromere.endAngle,
                    innerRadius: 0.96,
                    outerRadius: 0.99
                });
            });
            // Foreground for loading indicator
            var oForeground = overview.append('g').attr('class', 'fg');
            var iRad = this.mOverviewWidth / 50;
            if (this.mInitialized) {
                oContent.style('opacity', 1);
            } else {
                oContent.style('opacity', 1);
            }
            // Overview-Tracks
            oThis = this;
            this.mOverviewLeftSpace = this.mOuterTrackRadius;
            // Overview-Center
            var requests = [];
            var overviewCenter = this.getOverviewCenter();
            if (overviewCenter !== null) {
                if (!overviewCenter.getBrowser()) {
                    overviewCenter.addAssociation('browser', this, true);
                }
                var params = overviewCenter.getInitRequest();
                var requests = [];
                requests.push({
                    name: params.pluginFunction,
                    parameters: params.parameters
                });
                if (params.defaultData) {
                    overviewCenter.getModel().setData(params.defaultData);
                    overviewCenter.triggerRedraw(overview);
                }
                if (params.pluginFunction) {
                    this.requestCenterData({
                        track: overviewCenter,
                        merge: params.merge
                    }, requests, {}, overview);
                }
                requests = [];
            }
            oContent.style('opacity', 1);
        },
        getChromosomeGroups: function () {
            var oContent = d3.select('#' + this.getId() + ' div.overview');
            var svg = oContent.select('#' + this.getId() + '-overview');
            var overview = svg.select('g.overview');
            return overview.selectAll('g.sapUiGen-Chrom');
        },
        _redrawOverviewData: function (bReload) {
            var oThis = this;
            this.mOverviewLeftSpace = this.mOuterTrackRadius;
            var iTrackHeights = 0;
            if (bReload) {
                var oContent = d3.select('#' + this.getId() + ' div.overview');
                var svg = oContent.select('#' + this.getId() + '-overview');
                var overview = svg.select('g.overview');
                var updatingTracks = [];
                var requests = [];
               /* if (this.getPreRequestPlugin()) {
                    requests.push({
                        name: this.getPreRequestPlugin(),
                        parameters: {},
                        exceptionsFatal: true
                    });
                    updatingTracks.push(null);
                }*/
                for (var i = 0; i < this.getOverviewTracks().length; i++) {
                    var params = this.getOverviewTracks()[i].getInitRequest();
                    if (params.defaultData && iTrackHeights < oThis.mTotalTrackHeightMax) {
                        this.getOverviewTracks()[i].getModel().setData(params.defaultData);
                    }
                    if (params.pluginFunction) {
                        updatingTracks.push({
                            track: this.getOverviewTracks()[i],
                            merge: params.merge
                        });
                        requests.push({
                            name: params.pluginFunction,
                            parameters: params.parameters
                        });
                    }
                }
                if (!$.isEmptyObject(requests)) {
                    this.requestOverviewTracks(updatingTracks, requests, { binSize: this.mArcBinSize });
                    requests = [];
                } else {
                    this._updateDecorations();
                }
                // Overview-Center
                var overviewCenter = this.getOverviewCenter();
                if (overviewCenter !== null) {
                    if (!overviewCenter.getBrowser()) {
                        overviewCenter.addAssociation('browser', this, true);
                    }
                    var params = overviewCenter.getInitRequest();
                    requests.push({
                        name: params.pluginFunction,
                        parameters: params.parameters
                    });
                    if (params.defaultData) {
                        overviewCenter.getModel().setData(params.defaultData);
                        overviewCenter.triggerRedraw(overview);
                    }
                    if (params.pluginFunction) {
                        this.requestCenterData({
                            track: overviewCenter,
                            merge: params.merge
                        }, requests, {}, overview);
                    }
                    requests = [];
                }
            } else {
                var aOverviewTracks = this.getOverviewTracks();
                oThis.mOverviewLeftSpace = oThis.calculateOverviewLeftSpace(aOverviewTracks);
                for (var i = 0; i < aOverviewTracks.length; i++) {
                    aOverviewTracks[i]._clearTrack();
                    aOverviewTracks[i].draw();
                }
                this._updateDecorations();
                // Set visualization to busy mode if there is a request still running
                if (this.mOverviewBusy) {
                    this.setBusy(true);
                }
            }
        },
        calculateOverviewLeftSpace: function (aOverviewTracks) {
            var iTrackHeights = 0;
            for (var i = 0; i < aOverviewTracks.length; i++) {
                aOverviewTracks[i].mOuterRadius = this.mOverviewRadius * (this.mOuterTrackRadius - iTrackHeights - this.mOverviewTrackGapSize) - 20;
                aOverviewTracks[i].mInnerRadius = this.mOverviewRadius * (this.mOuterTrackRadius - iTrackHeights - aOverviewTracks[i].getHeight() / 100) - 20;
                iTrackHeights += aOverviewTracks[i].getHeight() / 100 + this.mOverviewTrackGapSize;
                if (iTrackHeights >= this.mTotalTrackHeightMax) {
                    aOverviewTracks[i].mMessage = this.getModel("i18n.vb").getResourceBundle().getText("error.NotEnoughSpace", [aOverviewTracks[i].getName()]);
                    aOverviewTracks[i].mNotVisualizable = true;
                    aOverviewTracks[i].mTracksDisplayable = false;
                    iTrackHeights -= aOverviewTracks[i].getHeight() / 100 + this.mOverviewTrackGapSize;
                }
            }
            return this.mOuterTrackRadius - iTrackHeights + this.mOverviewTrackGapSize;
        },
        requestOverviewTracks: function (aUpdatingTracks, aRequests, aParameters) {
            var oThis = this;
            var oSVG = d3.select("#" + this.getId() + " div.overview > svg");
            this.setBusy(true);
            if (this.mRequestContent && this.mRequest) {
                this.mRequestContent = null;
                this.mRequest.abort();
                this.mRequest = null;
            }
            // add genetic variant data to parameters
            if (this.getGeneticFilterCardConfig() && this.getGeneticFilterCardConfig().instance && this.getGeneticFilterCardConfig().instance !== 'All') {
                aParameters.filterCardQuery = this.getGeneticFilterCardConfig();
            } else {
                delete aParameters.filterCardQuery;
            }
            this.mRequestContent = JSON.stringify({
                initRequests: this.getPreRequestPlugin() ? [ { name: this.getPreRequestPlugin(), suppressResult: true } ] : null,
                requests: aRequests,
                validationPlugin: this.getValidationPlugin(),
                validationParameters: this.getValidationParameters(),
                parameters: $.extend({}, this.getParameters(), aParameters)
            });
            this.mRequest = AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                cache: false,
                data: this.mRequestContent,
                contentType: 'application/json;charset=utf-8',
                method: 'POST',
                process: false,
                dataType: 'json'
            }).done(function (oData) {
                oThis.setBusy(false);
                oThis.showLegend(true);
                var aTracks = oThis.getOverviewTracks();
                if (oThis.mRequestContent === this.data) {
                    oThis.mRequest = null;
                    oThis.mRequestContent = null;
                    // Remove all tracks which were already drawn
                    $.each(aTracks, function (i, oTrack) {
                        oTrack._clearTrack();
                    });
                    $.each(aUpdatingTracks, function (i, data) {
                        if (oData[i].result && data) {
                            if (oData[i].result.hasOwnProperty('message')) {
                                if (oData[i].result.message.substring(0, 'error.'.length) === 'error.') {
                                    data.track.mMessage = oThis.getModel("i18n.vb").getResourceBundle().getText(oData[i].result.message);
                                } else {
                                    data.track.mMessage = oData[i].result.message;
                                }
                                data.track.mTracksDisplayable = false;
                            } else {
                                data.track.mMessage = undefined;
                                data.track.mTracksDisplayable = true;
                                data.track.setData(oData[i].result);
                            }
                        } else if (data) {
                            oThis._handleError(oData[i].error);
                        }
                    });
                    oThis.mOverviewLeftSpace = oThis.calculateOverviewLeftSpace(aTracks);
                    var oDefs = oSVG.selectAll("defs");
                    if (oDefs.empty()) {
                        oDefs = oSVG.append("defs");
                    }
                    var oTrackPaths = oDefs.selectAll("path.track").data(aTracks);
                    oTrackPaths.enter().append("path").attr("class", "track");
                    oTrackPaths.exit().remove();
                    oTrackPaths.attr("id", function (oTrack, iTrack) {
                        return "track-path" + iTrack;
                    }).attr("d", function (oTrack) {
                        return oThis._generateArc(-0.5 * Math.PI, +0.5 * Math.PI, 0.5 * (oTrack.mInnerRadius + oTrack.mOuterRadius));
                    });
                }
                $.each(aUpdatingTracks, function (i, data) {
                    if (data) {
                        if (data.track.mNotVisualizable !== true) {
                            data.track.draw();
                        } else {
                            oThis.setBusy(false);
                            var oError = {
                                errorCode: "error.NotEnoughSpace",
                                parameters: [data.track.getName()]
                            };
                            oThis._handleError(oError);
                        }
                    }
                });
                oThis._updateDecorations();
            }).fail(function (oResponse, sReason) {
                if (oThis.mRequestContent === this.data) {
                    oThis.mRequest = null;
                    oThis.mRequestContent = null;
                }
                if (sReason !== "abort") {
                    oThis.setBusy(false);
                    var oError = {
                        errorCode: "error.HTTP",
                        parameters: [
                            oResponse.status,
                            oResponse.statusText
                        ],
                        message: oResponse.responseText
                    };
                    oThis._handleError(oError);
                }
            });
        },
        _updateDecorations: function () {
            // Update left space to draw center correctly
            var aOverviewTracks = this.getOverviewTracks();
            var oThis = this;
            // Update center
            if (this.getOverviewCenter()) {
                if (this.getOverviewCenter().mOverviewLeftSpace.toFixed(4) !== this.mOverviewLeftSpace.toFixed(4)) {
                    this.getOverviewCenter().triggerRedraw(d3.select('#' + this.getId() + '-overview > g'));
                }
            }
            // Update layout
            var begin = 0;
            this.mOverviewLayouts = [];
            for (var chromosomeIndex = 0; chromosomeIndex < this.mData.list.length; ++chromosomeIndex) {
                var chromosomeInfo = this.mData.list[chromosomeIndex];
                var end = begin + chromosomeInfo.size;
                var beginAngle = (begin + this.mGapSize / 2) * this.mArcScale - Math.PI;
                var endAngle = (end + this.mGapSize / 2) * this.mArcScale - Math.PI;
                var centerAngle = (beginAngle + endAngle) / 2;
                var layout = {
                    index: chromosomeIndex,
                    name: chromosomeInfo.name,
                    info: chromosomeInfo,
                    beginAngle: beginAngle,
                    endAngle: endAngle,
                    position: begin * this.mLinearScale,
                    width: chromosomeInfo.size * this.mLinearScale,
                    rotationAngle: centerAngle * 180 / Math.PI,
                    cos: Math.cos(Math.PI / 2 - centerAngle),
                    sin: -Math.sin(Math.PI / 2 - centerAngle),
                    radialScale: d3.scale.linear().domain([
                        0,
                        chromosomeInfo.size
                    ]).range([
                        beginAngle,
                        endAngle
                    ]),
                    centromere: null
                };
                if (this.mData.list[chromosomeIndex].visible) {
                    // centromere
                    if (chromosomeInfo.centromere && layout.centromere === null) {
                        layout.centromere = {
                            beginAngle: (begin + chromosomeInfo.centromere.begin) * this.mArcScale - Math.PI,
                            position: (begin + chromosomeInfo.centromere.begin) * this.mLinearScale,
                            endAngle: (begin + chromosomeInfo.centromere.end) * this.mArcScale - Math.PI,
                            width: (chromosomeInfo.centromere.end - chromosomeInfo.centromere.begin) * this.mLinearScale
                        };
                    }
                    this.mOverviewLayouts.push(layout);
                    begin = end + this.mGapSize;
                } else {
                    this.mOverviewLayouts.push(null);
                }
            }
            // Update chromosome hover
            var oThis = this;
            var svg = d3.select('#' + this.getId() + '-overview');
            var overview = svg.select('g.overview');
            var sectorArc = d3.svg.arc().innerRadius(function () {
                return oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20;
            }).outerRadius(function () {
                return oThis.mOverviewRadius - 20;
            }).startAngle(function (interval) {
                return interval.beginAngle;
            }).endAngle(function (interval) {
                return interval.endAngle;
            });
            var aFilteredLayouts = this.mOverviewLayouts.filter(function (oLayout) {
                return oLayout !== null;
            });
            var chromosomeGroups = overview.selectAll('g.sapUiGen-Chrom path.invisible');
            // chromosome sectors
            chromosomeGroups.attr('d', function (item) {
                return sectorArc(item);
            }).on('tap', function (item) {
                oThis.selectChromosome(item.info);
            }).on('click', function (item) {
                oThis.selectChromosome(item.info);
            }).on('mouseenter', function (item) {
                oThis.mSelectedChrom = -1;
                d3.selectAll('g.overview g.sapUiGen-Chrom').classed('fakeHover', false);
                var pointer = d3.mouse(this);
                var distance = Math.sqrt(pointer[0] * pointer[0] + pointer[1] * pointer[1]);
                overview.append('path').attr('class', 'cursor').style('pointer-events', 'none').attr('d', oThis._generateRayFromRatios(oThis.mOverviewRadius - 20, oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20, pointer[0] / distance, pointer[1] / distance));
                overview.select('g.sapUiGen-Center').selectAll('path').filter(function (data) {
                    return data.source.index !== item.index && data.target.index !== item.index;
                }).transition().duration(250).style('opacity', 0.1);
                overview.select('g.sapUiGen-Center').selectAll('path').filter(function (data) {
                    return data.source.index === item.index || data.target.index === item.index;
                }).transition().duration(250).style('opacity', 1);
            }).on('mousemove', function () {
                var pointer = d3.mouse(this);
                var distance = Math.sqrt(pointer[0] * pointer[0] + pointer[1] * pointer[1]);
                overview.select('path.cursor').attr('d', oThis._generateRayFromRatios(oThis.mOverviewRadius * oThis.mOuterTrackRadius - 20, oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20, pointer[0] / distance, pointer[1] / distance));
            }).on('mouseleave', function () {
                overview.select('path.cursor').remove();
                overview.select('g.sapUiGen-Center').selectAll('path').transition().duration(250).style('opacity', oThis.mSvOpacity);
            });
            // Draw most inner grid lines
            overview.selectAll('g.sapUiGen-Chrom path.grid').remove();
            overview.selectAll('g.sapUiGen-Chrom').append('path').attr('class', 'grid').style('pointer-events', 'none').attr('d', function (item) {
                return oThis._generateArc(item.beginAngle, item.endAngle, oThis.mOverviewLeftSpace * oThis.mOverviewRadius - 20);
            }).style('opacity', 0).transition().duration(250).style('opacity', 0.5);
            // Update legends
            var bForceLegend = false;
            $.each(aOverviewTracks, function (i, oTrack) {
                if (!$.isEmptyObject(oTrack.getAllLegends())) {
                    $.each(oTrack.getAllLegends(), function (y, oLegend) {
                        bForceLegend |= !$.isEmptyObject(oTrack.mMessage);
                        oLegend._update(oTrack.mMessage);
                    });
                }
            });
            if (bForceLegend) {
                this.showLegend(true);
            }
        },
        requestCenterData: function (oCenterTrack, aRequests, aParameters, oOverview) {
            this.setBusy(true);
            var oThis = this;
            AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                cache: false,
                data: JSON.stringify({
                    initRequests: this.getPreRequestPlugin() ? [ { name: this.getPreRequestPlugin(), suppressResult: true } ] : null,
                    requests: aRequests,
                    validationPlugin: this.getValidationPlugin(),
                    validationParameters: this.getValidationParameters(),
                    parameters: aParameters
                }),
                contentType: 'application/json;charset=utf-8',
                method: 'POST',
                process: false,
                dataType: 'json'
            }).done(function (oData) {
                oThis.setBusy(false);
                if (oData[0].result) {
                    oCenterTrack.track.getModel().setData(oData[0].result, oCenterTrack.merge);
                    oCenterTrack.track.triggerRedraw(oOverview);
                } else {
                    oThis._handleError(oData[0].error);
                }
            }).fail(function (oResponse, sReason) {
                if (sReason !== "abort") {
                    oThis.setBusy(false);
                    var oError = {
                        errorCode: "error.HTTP",
                        parameters: [
                            oResponse.status,
                            oResponse.statusText
                        ],
                        message: oResponse.responseText
                    };
                    oThis._handleError(oError);
                }
            });
        },
        _animateOverview2Chromosome: function (chromosomeInfo) {
            var fadeOutDuration = 250;
            var morphDuration = 500;
            var fadeInDuration = 250;
            var oThis = this;
            // remove legend
            this._removeLegend(fadeOutDuration);
            // add animation group
            var oControl = $('#' + this.getId());
            var animation = d3.select('#' + this.getId()).append('svg').attr('width', oControl.width() + 100).attr('height', oControl.height() + 100).attr('class', 'animation');
            // add labels
            var aFilteredLayouts = this.mOverviewLayouts.filter(function (oLayout) {
                return oLayout !== null;
            });
            animation.selectAll('text.label').data(aFilteredLayouts).enter().append('text').attr('class', 'label').classed('selected', function (item) {
                return item.index === chromosomeInfo.index;
            }).attr('text-anchor', 'middle').attr('transform', function (item) {
                return 'translate(' + (oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2 + (oThis.mOverviewRadius - 12) * item.cos) + ',' + (oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2 + (oThis.mOverviewRadius - 12) * item.sin) + ') rotate(' + item.rotationAngle + ')';
            }).text(function (item) {
                return item.name;
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('transform', function (item) {
                return 'translate(' + (oThis.mMargin.left + 48 + item.position + item.width / 2) + ',' + (oThis.mMargin.top + 6) + ') rotate(0)';
            });
            // add chromosome arcs
            animation.selectAll('path.chrom').data(aFilteredLayouts).enter().append('path').attr('class', 'chrom').classed('selected', function (item) {
                return item.index === chromosomeInfo.index;
            }).attr('d', function (item) {
                return oThis._generateAnimationArc(oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2, oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2, item.beginAngle, item.endAngle, 0.95 * oThis.mOverviewRadius - 20, 0.05 * oThis.mOverviewRadius);
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('d', function (item) {
                return oThis._generateAnimationRect(oThis.mMargin.left + 48 + item.position, oThis.mMargin.top + 12, item.width, 12);
            });
            // add centromeres
            animation.selectAll('path.centromere').data(aFilteredLayouts.filter(function (item) {
                return item.centromere !== null;
            })).enter().append('path').attr('class', 'centromere').attr('d', function (item) {
                return oThis._generateAnimationArc(oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2, oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2, item.centromere.beginAngle, item.centromere.endAngle, 0.96 * oThis.mOverviewRadius - 20, 0.03 * oThis.mOverviewRadius);
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('d', function (item) {
                return oThis._generateAnimationRect(oThis.mMargin.left + 48 + item.centromere.position, oThis.mMargin.top + 14, item.centromere.width, 8);
            });
            // add overview button
            animation.append('circle').attr('class', 'overview outer').attr('cx', 28).attr('cy', 26).attr('r', 20).attr('opacity', 0).transition().delay(fadeOutDuration).duration(morphDuration).attr('opacity', 1);
            animation.append('circle').attr('class', 'overview inner').attr('cx', 28).attr('cy', 26).attr('r', 14).attr('opacity', 0).transition().delay(fadeOutDuration).duration(morphDuration).attr('opacity', 1);
            // fade out old visualization and remove it
            d3.select('#' + this.getId() + ' div.overview').transition().duration(fadeOutDuration).style('opacity', 0).remove();
            // remove animation in the end
            animation.transition().delay(fadeOutDuration + morphDuration).each('end', function () {
                oThis._createChromosome(chromosomeInfo, !oThis.mIsInitialized);
                oThis.getAggregation('_chromosomeDetails').mIsInitialized = true;
            }).remove();
        },
        _removeLegend: function (fadeOutDuration) {
            // fade out and remove legend
            var legendPanel = d3.select('#' + this.getId() + ' .sapUiGen-LegendPanel');
            legendPanel.transition().duration(fadeOutDuration + 200).style('opacity', 0).each("end", function () {
                d3.select(this).style("display", "none");
            });
            d3.select('#' + this.getId() + ' .sapUiGen-LegendArrow').transition().duration(fadeOutDuration + 200).style('opacity', 0).each("end", function () {
                d3.select(this).style("display", "none");
            });
        },
        _animateChromosome2Overview: function () {
            var fadeOutDuration = 250;
            var morphDuration = 500;
            var fadeInDuration = 250;
            var oThis = this;
            // Draw Legend
            this._drawLegend(fadeOutDuration + morphDuration, fadeInDuration);
            // add animation group
            var oControl = $('#' + this.getId());
            var animation = d3.select('#' + this.getId()).append('svg').attr('width', oControl.width() + 100).attr('height', oControl.height() + 100).attr('class', 'animation');
            // add labels
            var aFilteredLayouts = this.mOverviewLayouts.filter(function (oLayout) {
                return oLayout !== null;
            });
            animation.selectAll('text.label').data(aFilteredLayouts).enter().append('text').attr('class', 'label').attr('text-anchor', 'middle').attr('transform', function (item) {
                return 'translate(' + (oThis.mMargin.left + 48 + item.position + item.width / 2) + ',' + (oThis.mMargin.top + 6) + ') rotate(0)';
            }).text(function (item) {
                return item.name;
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('transform', function (item) {
                return 'translate(' + (oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2 + (oThis.mOverviewRadius - 12) * item.cos) + ',' + (oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2 + (oThis.mOverviewRadius - 12) * item.sin) + ') rotate(' + item.rotationAngle + ')';
            });
            // add chromosome arcs
            animation.selectAll('path.chrom').data(aFilteredLayouts).enter().append('path').attr('class', 'chrom').attr('d', function (item) {
                return oThis._generateAnimationRect(oThis.mMargin.left + 48 + item.position, oThis.mMargin.top + 12, item.width, 12);
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('d', function (item) {
                return oThis._generateAnimationArc(oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2, oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2, item.beginAngle, item.endAngle, 0.95 * oThis.mOverviewRadius - 20, 0.05 * oThis.mOverviewRadius);
            });
            // add centromeres
            animation.selectAll('path.centromere').data(aFilteredLayouts.filter(function (item) {
                return item.centromere !== null;
            })).enter().append('path').attr('class', 'centromere').attr('d', function (item) {
                return oThis._generateAnimationRect(oThis.mMargin.left + 48 + item.centromere.position, oThis.mMargin.top + 14, item.centromere.width, 8);
            }).transition().delay(fadeOutDuration).duration(morphDuration).attr('d', function (item) {
                return oThis._generateAnimationArc(oThis.mOverviewMargin.left + oThis.mOverviewWidth / 2, oThis.mOverviewMargin.top + oThis.mOverviewHeight / 2, item.centromere.beginAngle, item.centromere.endAngle, 0.96 * oThis.mOverviewRadius - 20, 0.03 * oThis.mOverviewRadius);
            });
            // fade out overview button
            animation.append('circle').attr('class', 'overview outer').attr('cx', 28).attr('cy', 26).attr('r', 20).attr('opacity', 1).transition().delay(fadeOutDuration).duration(morphDuration).attr('opacity', 0);
            animation.append('circle').attr('class', 'overview inner').attr('cx', 28).attr('cy', 26).attr('r', 14).attr('opacity', 1).transition().delay(fadeOutDuration).duration(morphDuration).attr('opacity', 0);
            // fade out old visualization and remove it
            d3.select('#' + this.getId() + ' svg.header').style('opacity', 0).transition().delay(fadeOutDuration).remove();
            d3.select('#' + this.getId() + ' > div.overview').transition().duration(fadeOutDuration).style('opacity', 0).remove();
            d3.select('#' + this.getAggregation('_chromosomeDetails').getId()).transition().duration(fadeOutDuration).style('opacity', 0).style('display', 'none');
            // remove animation in the end
            animation.transition().delay(fadeOutDuration + morphDuration).each('end', function () {
                oThis._createOverview();
                oThis.update(false);
                oThis.showLegend(oThis.mLegendShown);
            }).remove();
        },
        _animateChromosome2Chromosome: function (chromosomeInfo) {
            var fadeOutDuration = 250;
            var oThis = this;
            d3.select('#' + this.getAggregation('_chromosomeDetails').getId()).transition().duration(fadeOutDuration).style('opacity', 0).each('end', function () {
                oThis._createChromosome(chromosomeInfo, true);
            });
        },
        _createHeader: function (chromosomeInfo) {
            var oThis = this;
            var header = d3.select('#' + this.getId() + ' svg.header');
            if (header.empty() && chromosomeInfo) {
                header = d3.select('#' + this.getId()).insert('svg', 'div.details').attr('class', 'header').attr('width', '100%').attr('height', 48);
                // add overview button
                header.append('circle').attr('class', 'overview outer').style('pointer-events', 'all').attr('cx', 28).attr('cy', 26).attr('r', 20).on('click', function () {
                    oThis.selectChromosome(null);
                }).on('tap', function () {
                    oThis.selectChromosome(null);
                });
                header.append('circle').attr('class', 'overview inner').style('pointer-events', 'none').attr('cx', 28).attr('cy', 26).attr('r', 14);
                // add chromosomes
                var chromosomes = header.append('g').attr('class', 'chromosomes');
                var aFilteredLayouts = this.mOverviewLayouts.filter(function (oLayout) {
                    return oLayout !== null;
                });
                var chromosomeGroups = chromosomes.selectAll('g').data(aFilteredLayouts).enter().append('g').classed('selected', function (item) {
                    return item.index === chromosomeInfo.index;
                }).attr('transform', function (item) {
                    return 'translate(' + (oThis.mMargin.left + 48 + item.position) + ',' + oThis.mMargin.top + ')';
                });
                chromosomeGroups.append('rect').attr('class', 'invisible').style('pointer-events', 'all').attr('width', function (item) {
                    return item.width;
                }).attr('height', 24).on('click', function (item) {
                    oThis.selectChromosome(oThis.mData.list[item.index]);
                }).on('tap', function (item) {
                    oThis.selectChromosome(oThis.mData.list[item.index]);
                });
                chromosomeGroups.append('text').attr('class', 'label').style('pointer-events', 'none').attr('text-anchor', 'middle').attr('x', function (item) {
                    return item.width / 2;
                }).attr('y', 6).text(function (item) {
                    return item.name;
                });
                chromosomeGroups.append('rect').attr('class', 'chrom').style('pointer-events', 'none').attr('y', 12).attr('width', function (item) {
                    return item.width;
                }).attr('height', 12);
                chromosomeGroups.filter(function (item) {
                    return item.centromere !== null;
                }).append('rect').attr('class', 'centromere').style('pointer-events', 'none').attr('x', function (item) {
                    return item.centromere.position - item.position;
                }).attr('y', 14).attr('width', function (item) {
                    return item.centromere.width;
                }).attr('height', 8);
            } else if (chromosomeInfo) {
                header.select('g.chromosomes').selectAll('g').classed('selected', function (item) {
                    return item.index === chromosomeInfo.index;
                });
            } else {
                header.remove();
            }
        },
        _createChromosome: function (oChromosomeInfo, bInitial, bNoChromosomeChange) {
            this._clearContent();
            this._createHeader(this.mChromosomeInfo);
            if (!oChromosomeInfo) {
                return;
            }
            var oDetails = d3.select('#' + this.getAggregation('_chromosomeDetails').getId()).style('opacity', 0).style('display', 'block');
            this.getAggregation('_chromosomeDetails').updateView(oChromosomeInfo.index, oChromosomeInfo, this.mBegin, this.mWidth, bInitial, bNoChromosomeChange);
            if (bInitial) {
                oDetails.transition().duration(250).style('opacity', 1);
            } else {
                oDetails.style('opacity', 1);
            }
        },
        _generateArc: function (startAngle, endAngle, radius, height) {
            var beginCos = Math.cos(Math.PI / 2 - startAngle);
            var endCos = Math.cos(Math.PI / 2 - endAngle);
            var beginSin = -Math.sin(Math.PI / 2 - startAngle);
            var endSin = -Math.sin(Math.PI / 2 - endAngle);
            var path = 'M' + beginCos * radius + ',' + beginSin * radius + 'A' + radius + ',' + radius + ',0,0,1,' + endCos * radius + ',' + endSin * radius;
            if (height) {
                var outerRadius = radius + height;
                path += 'L' + endCos * outerRadius + ',' + endSin * outerRadius + 'A' + outerRadius + ',' + outerRadius + ',0,0,0,' + beginCos * outerRadius + ',' + beginSin * outerRadius + 'Z';
            }
            return path;
        },
        _completeWithArc: function (startAngle, endAngle, radius) {
            var beginCos = Math.cos(Math.PI / 2 - startAngle);
            var endCos = Math.cos(Math.PI / 2 - endAngle);
            var beginSin = -Math.sin(Math.PI / 2 - startAngle);
            var endSin = -Math.sin(Math.PI / 2 - endAngle);
            return 'L' + endCos * radius + ',' + endSin * radius + 'A' + radius + ',' + radius + ',0,0,0,' + beginCos * radius + ',' + beginSin * radius + 'Z';
        },
        _generateAnimationArc: function (x, y, startAngle, endAngle, radius, height) {
            var beginCos = Math.cos(Math.PI / 2 - startAngle);
            var endCos = Math.cos(Math.PI / 2 - endAngle);
            var beginSin = -Math.sin(Math.PI / 2 - startAngle);
            var endSin = -Math.sin(Math.PI / 2 - endAngle);
            var outerRadius = radius + height;
            return 'M' + (x + beginCos * radius) + ',' + (y + beginSin * radius) + 'A' + radius + ',' + radius + ',0,0,1,' + (x + endCos * radius) + ',' + (y + endSin * radius) + 'L' + (x + endCos * outerRadius) + ',' + (y + endSin * outerRadius) + 'A' + radius + ',' + radius + ',0,0,0,' + (x + beginCos * outerRadius) + ',' + (y + beginSin * outerRadius) + 'Z';
        },
        _generateAnimationRect: function (x, y, width, height) {
            return 'M' + x + ',' + (y + height) + 'A' + 50000 + ',' + 50000 + ',0,0,1,' + (x + width) + ',' + (y + height) + 'L' + (x + width) + ',' + y + 'A' + 50000 + ',' + 50000 + ',0,0,0,' + x + ',' + y + 'Z';
        },
        _generateRay: function (startRadius, endRadius, angle) {
            var cos = Math.cos(Math.PI / 2 - angle);
            var sin = -Math.sin(Math.PI / 2 - angle);
            return 'M' + cos * startRadius + ',' + sin * startRadius + 'L' + cos * endRadius + ',' + sin * endRadius;
        },
        _generateRayFromRatios: function (startRadius, endRadius, cos, sin) {
            return 'M' + cos * startRadius + ',' + sin * startRadius + 'L' + cos * endRadius + ',' + sin * endRadius;
        },
        _handleError: function (oError) {
            if (!oError) {
                oError = {};
            }
            if (oError.errorCode === "error.HTTP" && (oError.parameters && oError.parameters.length > 0 && (oError.parameters[0] === 200 || oError.parameters[0] === 500 || oError.parameters[0] === 403))) {
                if (oError.parameters && oError.parameters[0] === 403) {
                    oError.errorCode = "error.Unauthorized";
                } else {
                    var sOriginalMessage = oError.message;
                    if (sOriginalMessage) {
                        var errorMsg = typeof sOriginalMessage === 'string' ? JSON.parse(sOriginalMessage) : sOriginalMessage;
                        if (errorMsg) {
                            oError.errorCode = errorMsg.errorCode;
                            oError.parameters = errorMsg.parameters;
                        } else {
                            oError.errorCode = "error.Internal";
                        }
                    } else {
                        oError.errorCode = "error.Internal";
                    }
                }
            }
            if (!oError.errorCode) {
                oError = { errorCode: "error.Internal" };
            }
            if (!oError.parameters) {
                oError.parameters = [];
            }
            oError.message = this.getModel("i18n.vb").getResourceBundle().getText(oError.errorCode, oError.parameters);
            if (this.fireError(oError)) {
                console.error(oError.message);
                sap.m.MessageToast.show(oError.message);
            }
        },
        _hasString: function (srcStr, compStr) {
            var bHasStr = false;
            var index = srcStr.indexOf(compStr);
            if (index !== -1) {
                var isValidMatch = false;
                if (index !== 0) {
                    var tempIndex = index;
                    do {
                        // to verify if its chr01, chr201, 01
                        --tempIndex;
                        var prevChar = parseInt(srcStr.substr(tempIndex, 1), 10);
                        if (tempIndex === 0 && prevChar === 0) {
                            isValidMatch = true;
                            break;
                        }
                        if (!isNaN(prevChar) && prevChar === 0) {
                            continue;
                        }
                        if (isNaN(prevChar)) {
                            isValidMatch = true;
                        }
                        break;
                    } while (tempIndex > 0);
                    if (isValidMatch) {
                        // check if previous character is not a number
                        if (srcStr.substr(index) === compStr) {
                            bHasStr = true;
                        }
                    }
                }
            }
            return bHasStr;
        }
    });
    var ChromosomeDetails = sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.ChromosomeDetails', {
        metadata: {
            properties: {
                minTickDistance: {
                    type: 'int',
                    defaultValue: 12
                },
                minLabelDistance: {
                    type: 'int',
                    defaultValue: 100
                }
            },
            aggregations: {
                _detailsPopoverAnchor: {
                    type: 'sap.ui.core.Control',
                    multiple: false,
                    visibility: 'hidden'
                },
                _detailsPopover: {
                    type: 'sap.m.Dialog',
                    multiple: false,
                    visibility: 'hidden'
                },
                _trackConfigDialog: {
                    type: 'sap.m.Dialog',
                    multiple: false,
                    visibility: 'hidden'
                }
            },
            associations: {
                browser: {
                    type: 'hc.hph.genomics.ui.lib.VariantBrowser',
                    multiple: false
                }
            }
        },
        init: function () {
            this.mMargin = {
                top: 4,
                left: 2,
                bottom: 0,
                right: 2
            };
            this.mIsInitialized = false;
            this.mChromosomeIndex = null;
            this.mChromosome = null;
            this.mBegin = 0;
            this.mDrawBegin = 0;
            this.mWidth = 0;
            this.mControlWidth = 0;
            this.mPxPerBp = 1.0;
            this.mZoomWidth = 0;
            this.mZoom = null;
            this.mIdeogram = null;
            this.mRangeSelectArea = null;
            this.mPanAndZoomArea = null;
            this.mCursor = null;
            this.mMouseCoordinate = null;
            this.mCoordinate = null;
            this.mRangeBegin = null;
            this.mTickSteps = [
                2,
                5,
                10
            ];
            this.mLogTickSteps = this.mTickSteps.map(function (value) {
                return Math.log(value) / Math.log(10.0);
            });
            this.mLeftmostTickPosition = 0;
            this.mLeftmostLabelPosition = 0;
            this.mTickDistance = 0;
            this.mLabelDistance = 0;
            this.mPositionRequest = null;
            this.mChromCurrentTrackRanges = {};
            this.mLastShift = 0;
            this.mCurrentShift = 0;
            this.mScrollTimer = null;
            this.setAggregation('_detailsPopoverAnchor', new sap.ui.core.HTML({ content: '<div style="width: 100%; height: 4px; visibility: hidden;"></div>' }), true);
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                "use strict";
                var oTextBundle = oControl.getModel("i18n.vb").getResourceBundle();
                oRenderManager.write('<div');
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass('details');
                oRenderManager.writeClasses();
                oRenderManager.addStyle('display', 'none');
                oRenderManager.writeStyles();
                oRenderManager.write('><div');
                oRenderManager.addClass('interaction');
                oRenderManager.writeClasses();
                oRenderManager.write('><div');
                oRenderManager.addClass('ideogram');
                oRenderManager.writeClasses();
                oRenderManager.writeAttribute("title", oTextBundle.getText("common.DragDropZoomTooltip"));
                oRenderManager.write('></div><div');
                oRenderManager.addClass('zoom');
                oRenderManager.writeClasses();
                oRenderManager.write('><div');
                oRenderManager.addClass('rangeSelect');
                oRenderManager.writeClasses();
                oRenderManager.writeAttribute('title', oTextBundle.getText("common.DragDropZoomTooltip"));
                oRenderManager.write('></div></div></div><svg');
                oRenderManager.addClass('details');
                oRenderManager.writeClasses();
                oRenderManager.write('><svg');
                oRenderManager.addClass('ideogram');
                oRenderManager.writeClasses();
                oRenderManager.write('></svg><svg');
                oRenderManager.addClass('grid');
                oRenderManager.writeClasses();
                oRenderManager.writeAttribute('x', '20px');
                oRenderManager.writeAttribute('y', '48px');
                oRenderManager.writeAttribute('width', '100%');
                oRenderManager.writeAttribute('height', '100%');
                oRenderManager.write('></svg><svg');
                oRenderManager.addClass('tracks');
                oRenderManager.writeClasses();
                oRenderManager.writeAttribute('y', '68');
                oRenderManager.writeAttribute('width', '100%');
                oRenderManager.write('><rect width="100%" height="100%" style="fill:white;fill-opacity:0;pointer-events:all;"/>');
                var aTracks = sap.ui.getCore().byId(oControl.getBrowser()).getChromosomeTracks();
                var iHeight = 0;
                oRenderManager.write('<g');
                oRenderManager.addClass('trackWrapper');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                for (var trackIndex = 0; trackIndex < aTracks.length; ++trackIndex) {
                    var oTrack = aTracks[trackIndex];
                    oRenderManager.write('<g');
                    oRenderManager.addClass('track');
                    oRenderManager.writeAttribute('transform', 'translate(20,' + iHeight + ')');
                    if (oTrack.getType()) {
                        oRenderManager.addClass(oTrack.getType());
                    }
                    iHeight += oTrack.getMinimized() ? 24 : oTrack.getCompleteTrackHeight() > 0 ? oTrack.getCompleteTrackHeight() : 0;
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oRenderManager.renderControl(oTrack);
                    oTrack.renderDecoration(oRenderManager);
                    oRenderManager.write('</g>');
                }
                oRenderManager.write('<g');
                oRenderManager.addClass('scrollIndicator');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                oRenderManager.write('</g>');
                oRenderManager.write('</g>');
                oRenderManager.write('</svg></svg><div');
                oRenderManager.addClass('overlay');
                oRenderManager.writeClasses();
                oRenderManager.write('><div');
                oRenderManager.addClass('cursor');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                oRenderManager.renderControl(oControl.getAggregation('_detailsPopoverAnchor'));
                oRenderManager.write('</div><ul');
                oRenderManager.addClass('rangeMenu');
                oRenderManager.writeClasses();
                oRenderManager.addStyle('display', 'none');
                oRenderManager.writeStyles();
                oRenderManager.write('></ul>');
                oRenderManager.write('</div></div>');
            }
        },
        onBeforeRendering: function () {
            this.createPopover();
        },
        onAfterRendering: function () {
            this.lastPos = 0;
            var oThis = this;
            this.mSelectedChrom = -1;
            this.mControlWidth = this.$().parent().width() - 16;
            this.mIdeogramWidth = this.mControlWidth - this.mMargin.left - this.mMargin.right;
            this.mZoomWidth = this.mControlWidth - 20;
            this.mGrid = d3.select('#' + this.getId() + ' svg.details svg.grid');
            this.mCursor = d3.select('#' + this.getId() + ' div.overlay div.cursor');
            var oTracks = d3.selectAll('#' + this.getId() + ' svg.tracks > g.trackWrapper > g.track ');
            var oTrackWrapper = d3.selectAll('#' + this.getId() + ' svg.tracks > g.trackWrapper');
            this.mIdeogram = d3.select('#' + this.getId() + ' svg.ideogram');
            this._drawGrid();
            // forward events that were not processed earlier to interaction layer
            this.$().children('svg.details').children('svg.tracks').on('mousemove mousedown mouseup mouseenter mouseleave click dblclick wheel mousewheel MozMousePixelScroll', this._forwardEvent);
            if (typeof window.Event !== "function")
                // ie 10 workaround
                {
                    this.$().children('div.overlay').children('div.cursor').on('mousemove mousedown mouseup mouseenter mouseleave click dblclick wheel mousewheel MozMousePixelScroll', this._forwardEvent);
                }
            this.mZoom = d3.behavior.zoom().on('zoom', function () {
                if (d3.event.sourceEvent.type === 'touchmove' || d3.event.sourceEvent.type === 'mousemove') {
                    var zoomHeight = $('#' + oThis.getId() + ' > div.interaction > div.zoom').height();
                    var iMaxHeight = $("#" + oThis.getBrowser()).height() - oThis.$().position().top;
                    var visibleZoomHeight = Math.min(oThis.mWindowHeight, iMaxHeight - 16) - 52;
                    oTrackWrapper.attr('transform', function () {
                        var t = d3.transform(d3.select(this).attr('transform'));
                        var iShift = parseInt(oThis.mLastShift + d3.event.translate[1], 10);
                        oThis._updateScrollIndicator(d3.event);
                        if (iShift <= 0) {
                            if (iShift < visibleZoomHeight - zoomHeight) {
                                // Too far down
                                // Set shift to maximal shift
                                oThis.mCurrentShift = visibleZoomHeight - zoomHeight;
                                return 'translate(' + t.translate[0] + ',' + (visibleZoomHeight - zoomHeight) + ')';
                            }
                            // Set shift
                            oThis.mCurrentShift = parseInt(oThis.mLastShift + d3.event.translate[1], 10);
                            return 'translate(' + t.translate[0] + ',' + iShift + ')';
                        } else {
                            // Too high up
                            // Set shift to minimal shift
                            oThis.mCurrentShift = 0;
                            return 'translate(' + t.translate[0] + ',' + 0 + ')';
                        }
                    });
                }
                var pxPerBp = d3.event.scale;
                var begin = Math.max(Math.min(-d3.event.translate[0], oThis.mChromosome.size * pxPerBp - oThis.mZoomWidth), 0);
                oThis._panAndZoom(begin / pxPerBp, oThis.mZoomWidth / pxPerBp, pxPerBp, false);
                oThis.mZoom.translate([
                    -begin,
                    oThis.lastPos
                ]);
            }    // Add a down arrow if there few tracks at the bottom are beyond visible area
);
            this.mPanAndZoomArea = d3.select('#' + this.getId() + ' > div.interaction > div.zoom').call(this.mZoom).on('click', function () {
                if (d3.mouse(this)[1] >= 24) {
                    oThis.mMouseCoordinate = d3.mouse(this)[0];
                    var coordinate = Math.floor(oThis.mMouseCoordinate / oThis.mPxPerBp + oThis.mBegin);
                    if (coordinate !== oThis.mCoordinate) {
                        oThis.mCoordinate = coordinate;
                        oThis._refreshCursor();
                    }
                    if (oThis.mMouseCoordinateX === oThis.mMouseCoordinate) {
                        if (oThis.mPxPerBp > 1) {
                            oThis._showPositionInformation();
                        }
                        d3.event.stopPropagation();
                    }
                }
            }).on('tap', function () {
                oThis.mMouseCoordinate = d3.event.touches[0].clientX - 20;
                var coordinate = Math.floor(oThis.mMouseCoordinate / oThis.mPxPerBp + oThis.mBegin);
                if (coordinate !== oThis.mCoordinate) {
                    oThis.mCoordinate = coordinate;
                    oThis._refreshCursor();
                }
                if (oThis.mPxPerBp > 1) {
                    oThis._showPositionInformation();
                }
                d3.event.stopPropagation();
            }).on('mousemove', function () {
                var oPopover = oThis.getAggregation('_detailsPopover');
                if (oPopover && !oPopover.isOpen()) {
                    oThis.mMouseCoordinate = d3.mouse(this)[0];
                    var iCoordinate = Math.floor(oThis.mMouseCoordinate / oThis.mPxPerBp + oThis.mBegin);
                    if (iCoordinate !== oThis.mCoordinate) {
                        oThis.mCoordinate = iCoordinate;
                        oThis._refreshCursor();
                    }
                }
            }).on('mouseleave', function () {
                var oPopover = oThis.getAggregation('_detailsPopover');
                if (!oPopover.isOpen()) {
                    oThis.mMouseCoordinate = null;
                    oThis.mCoordinate = null;
                    oThis._refreshCursor();
                }
            }).on('mousedown', function () {
                oThis.mMouseCoordinateX = d3.mouse(this)[0];
            }).on('mouseup', function () {
                oThis.mLastShift = parseInt(oThis.mCurrentShift, 10);
                oThis.mMouseCoordinate = d3.mouse(this)[0];
                if (oThis.mRangeBegin !== null) {
                    var iCoordinate = Math.floor(oThis.mBegin + oThis.mMouseCoordinate / oThis.mPxPerBp);
                    if (oThis.mRangeBegin !== iCoordinate) {
                        oThis.setZoom(Math.min(oThis.mRangeBegin, iCoordinate), Math.min(oThis.mZoomWidth / (Math.abs(iCoordinate - oThis.mRangeBegin) + 1), 24));
                        oThis._panAndZoom(Math.min(oThis.mRangeBegin, iCoordinate), oThis.mZoomWidth / Math.min(oThis.mZoomWidth / (Math.abs(iCoordinate - oThis.mRangeBegin) + 1), 24), Math.min(oThis.mZoomWidth / (Math.abs(iCoordinate - oThis.mRangeBegin) + 1), 24), false);
                        oThis.mRangeBegin = null;
                        oThis.mCoordinate = Math.floor(oThis.mBegin + oThis.mMouseCoordinate / oThis.mPxPerBp);
                        oThis._refreshCursor();
                        d3.event.stopPropagation();
                    } else if (d3.mouse(this)[1] < 24) {
                        if (iCoordinate !== oThis.mCoordinate) {
                            oThis.mCoordinate = iCoordinate;
                        }
                        oThis.mRangeBegin = null;
                    }
                    d3.event.stopPropagation();
                }
            });
            this.mRangeSelectArea = this.mPanAndZoomArea.select('div.rangeSelect').on('mousedown', function () {
                var oPopover = oThis.getAggregation('_detailsPopover');
                oThis.mRangeBegin = Math.floor(oThis.mBegin + d3.mouse(this)[0] / oThis.mPxPerBp);
                $(document).on('mouseup.sapUiGen-VariantBrowser', function (oEvent) {
                    oThis.mRangeBegin = null;
                    $(this).off('mouseup.sapUiGen-VariantBrowser');
                });
                d3.event.stopPropagation();
            });
            var oTextBundle = this.getModel("i18n.vb").getResourceBundle();
            oTracks.select('g.header').data(sap.ui.getCore().byId(this.getBrowser()).getChromosomeTracks()).each(function (oTrack) {
                var oHeaderGroup = d3.select(this);
                var iX = oThis.mZoomWidth - 10;
                var oMinMaxIcon = oHeaderGroup.append('g').attr('class', 'icon minmax');
                oMinMaxIcon.append('circle').attr('cx', iX).attr('cy', 12).attr('r', 8).on('click', function () {
                    oTrack.setMinimized(!oTrack.getMinimized());
                    oThis.arrangeTracks();
                    d3.event.stopPropagation();
                }).append('title').text(oTextBundle.getText("common.MinimizeTrackTooltip"));
                oMinMaxIcon.append('text').attr('x', iX).attr('y', 11);
                iX -= 20;
            });
            oTracks.selectAll('g.header g.icon circle').on('mousemove', function () {
                var oPopover = oThis.getAggregation('_detailsPopover');
                if (!oPopover.isOpen()) {
                    oThis.mMouseCoordinate = null;
                    oThis.mCoordinate = null;
                    oThis._refreshCursor();
                }
                d3.event.stopPropagation();
            });
            if (this.mChromosome && sap.ui.getCore().byId(this.getBrowser()).mCurrentStatus === sap.ui.getCore().byId(this.getBrowser()).mDetailStatus) {
                sap.ui.getCore().byId(this.getBrowser())._createHeader(oThis.mChromosome);
                this._updateIdeogram();
                this.mZoom.scaleExtent([
                    this.mZoomWidth / this.mChromosome.size,
                    24
                ]);
                this.setZoom(this.mBegin, this.mZoomWidth / this.mWidth, true);
                this._refreshCursor();
                this.$().hide().show();
            }
            this.arrangeTracks();
            this._setShift();
            this._updateScrollIndicator();
        },
        _updateScrollIndicator: function (oD3Event) {
            var iCurrentShift = 0;
            if (oD3Event === parseInt(oD3Event, 10)) {
                iCurrentShift = oD3Event;
            } else if (oD3Event) {
                iCurrentShift = oD3Event.translate[1];
            }
            var oThis = this;
            var visibleTrackHeight = this.mWindowHeight + 68;
            var zoomHeight = $('#' + this.getId() + ' > div.interaction > div.zoom').height();
            var iMaxHeight = $("#" + this.getBrowser()).height() - this.$().position().top;
            var availableWindowHeight = Math.min(this.mWindowHeight, iMaxHeight - 68);
            var iShift = parseInt(this.mLastShift + iCurrentShift, 10);
            var iRectHeight = 20;
            var oNavUpArrowInfo = IconPool.getIconInfo('navigation-up-arrow');
            var oNavdownArrowInfo = IconPool.getIconInfo('navigation-down-arrow');
            var sScrollUpClass = 'scrollUp';
            var sScrollDownClass = 'scrollDown';
            var oScrollIndicator = d3.selectAll('#' + this.getId() + ' svg.tracks > g.trackWrapper > g.scrollIndicator ');
            function scroll(iScrollShift) {
                var oTrackWrapper = d3.selectAll('#' + oThis.getId() + ' svg.tracks > g.trackWrapper');
                oTrackWrapper.attr('transform', function () {
                    var t = d3.transform(d3.select(this).attr('transform'));
                    var iScroll = parseInt(oThis.mLastShift + iScrollShift, 10);
                    if (iScroll <= 0) {
                        if (iScroll < availableWindowHeight - zoomHeight) {
                            // Too far down
                            oThis.mCurrentShift = availableWindowHeight - zoomHeight;
                            return 'translate(' + t.translate[0] + ',' + (availableWindowHeight - zoomHeight) + ')';
                        }
                        // Set shift
                        oThis.mCurrentShift = parseInt(oThis.mLastShift + iScrollShift, 10);
                        return 'translate(' + t.translate[0] + ',' + iScroll + ')';
                    } else {
                        // Too high up
                        oThis.mCurrentShift = 0;
                        return 'translate(' + t.translate[0] + ',' + 0 + ')';
                    }
                });
                oThis._updateScrollIndicator(iScrollShift);
                oThis.mLastShift += iScrollShift;
                zoomHeight = $('#' + oThis.getId() + ' > div.interaction > div.zoom').height();
                if (availableWindowHeight - zoomHeight > oThis.mLastShift) {
                    oThis.mCurrentShift = availableWindowHeight - zoomHeight;
                    oThis.mLastShift = availableWindowHeight - zoomHeight;
                } else {
                    oThis.mCurrentShift = oThis.mLastShift;
                }
            }
            function appendScrollIndicator(oNavArrowInfo, iRectY, sClass) {
                var iRectWidth = 12;
                var iScrollPx = 48;
                oScrollIndicator.append('rect').attr('x', 0).attr('y', iRectY).attr('width', iRectWidth).attr('height', iRectHeight).classed(sClass, true);
                oScrollIndicator.append('text').attr('x', iRectWidth / 2).attr('y', iRectY + iRectHeight / 2).style('font-family', oNavArrowInfo.fontFamily).text(oNavArrowInfo.content);
                d3.selectAll('#' + oThis.getId() + ' svg.tracks > g.trackWrapper > g.scrollIndicator > rect.' + sClass).on('mousedown', function () {
                    oThis.mScrollTimer = setInterval(scroll, 100, sClass === 'scrollUp' ? iScrollPx : -iScrollPx);
                    d3.event.stopPropagation();
                }).on('mouseup', function () {
                    clearInterval(oThis.mScrollTimer);
                    d3.event.stopPropagation();
                }).on('touchstart', function () {
                    oThis.mScrollTimer = setInterval(scroll, 100, sClass === 'scrollUp' ? iScrollPx : -iScrollPx);
                    d3.event.stopPropagation();
                }).on('touchend', function () {
                    clearInterval(oThis.mScrollTimer);
                    d3.event.stopPropagation();
                });
            }
            oScrollIndicator.selectAll("rect").remove();
            oScrollIndicator.selectAll("text").remove();
            if (iShift <= 0) {
                if (iShift < availableWindowHeight - zoomHeight) {
                    // Too far down - add up arrow
                    if (zoomHeight < availableWindowHeight || this.mLastShift < availableWindowHeight - zoomHeight) {
                        // minimized tracks height is lesser than
                        // availableWindowHeight
                        if (this.mLastShift < 0) {
                            appendScrollIndicator(oNavUpArrowInfo, Math.abs(this.mLastShift), sScrollUpClass);
                        }
                    } else {
                        appendScrollIndicator(oNavUpArrowInfo, Math.abs(availableWindowHeight - zoomHeight), sScrollUpClass);
                    }
                    clearInterval(oThis.mScrollTimer);
                } else {
                    // both the arrows
                    if (iShift < 0) {
                        appendScrollIndicator(oNavUpArrowInfo, Math.abs(this.mLastShift + iCurrentShift), sScrollUpClass);
                    }
                    if (availableWindowHeight < visibleTrackHeight) {
                        appendScrollIndicator(oNavdownArrowInfo, Math.abs(this.mLastShift + iCurrentShift) + availableWindowHeight - iRectHeight, sScrollDownClass);
                    }
                }
            } else {
                // Too high up - add down arrow
                clearInterval(oThis.mScrollTimer);
                appendScrollIndicator(oNavdownArrowInfo, availableWindowHeight - iRectHeight, sScrollDownClass);
            }
        },
        _setShift: function () {
            var oTrackWrapper = d3.selectAll('#' + this.getId() + ' svg.tracks > g.trackWrapper');
            var zoomHeight = $('#' + this.getId() + ' > div.interaction > div.zoom').height();
            var windowHeight = $(window).height();
            var top = $('#' + this.getId() + ' > div.interaction > div.zoom')[0].getBoundingClientRect().top;
            var visibleZoomHeight = Math.min(zoomHeight, windowHeight - top) - 4;
            if (visibleZoomHeight - zoomHeight > this.mLastShift) {
                this.mCurrentShift = visibleZoomHeight - zoomHeight;
                this.mLastShift = visibleZoomHeight - zoomHeight;
                oTrackWrapper.attr('transform', 'translate(0,' + (visibleZoomHeight - zoomHeight) + ')');
            } else {
                this.mCurrentShift = this.mLastShift;
                oTrackWrapper.attr('transform', 'translate(0,' + this.mLastShift + ')');
            }
        },
        update: function () {
            if (this.mChromosome) {
                this.loadAndSetTrackData(true, this.mBegin, this.mWidth, this.mPxPerBp, true, false);
            }
        },
        updateView: function (iChromosomeIndex, oChromosomeInfo, iBegin, iWidth, bInitial, bNoChromosomeChange) {
            // update dimensions
            this.mChromosomeIndex = iChromosomeIndex;
            this.mChromosome = oChromosomeInfo;
            this.mBegin = iBegin;
            this.mDrawBegin = Math.max(0, Math.floor(iBegin - this.mWidth));
            this.mZoomWidth = $('#' + this.getId()).width() - 20;
            this.mWindowHeight = $('#' + this.getId()).height();
            this.mWidth = Math.max(this.mZoomWidth / 24, iWidth);
            var bSizeChanged = this.mPxPerBp !== this.mZoomWidth / this.mWidth;
            this.mPxPerBp = this.mZoomWidth / this.mWidth;
            // create header and ideogram
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            oBrowser._createHeader(oChromosomeInfo);
            this._updateIdeogram();
            this.mZoom.scaleExtent([
                this.mZoomWidth / oChromosomeInfo.size,
                24
            ]);
            this.setZoom(this.mBegin, this.mPxPerBp, true);
            this.loadAndSetTrackData(bInitial, iBegin, this.mWidth, this.mPxPerBp, bNoChromosomeChange, bSizeChanged);
            this._drawGrid();
            this._refreshCursor();
            this._setShift();
        },
        loadAndSetTrackData: function (bInitial, iBegin, iWidth, dPxPerBp, bNoChromosomeChange, bSizeChanged) {
            var oBrowser = sap.ui.getCore().byId(this.getAssociation('browser'));
            var that = this;
            var request = function (aUpdatingTracks, aRequests, aParameters, oChromosomeDetails) {
                oBrowser.mDetailBusy = true;
                for (var iTrackIndex in aUpdatingTracks) {
                    if (aUpdatingTracks[iTrackIndex]) {
                        aUpdatingTracks[iTrackIndex].track.triggerRedraw();
                        aUpdatingTracks[iTrackIndex].track.setBusy(true);
                    }
                }
                if (that.mRequestContent && that.mRequest) {
                    that.mRequestContent = null;
                    that.mRequest.abort();
                    that.mRequest = null;
                }
                // add genetic variant data to parameters
                if (oBrowser.getGeneticFilterCardConfig() && oBrowser.getGeneticFilterCardConfig().instance && oBrowser.getGeneticFilterCardConfig().instance !== 'All') {
                    aParameters.filterCardQuery = oBrowser.getGeneticFilterCardConfig();
                } else {
                    delete aParameters.filterCardQuery;
                }
                that.mRequestContent = JSON.stringify({
                    initRequests: oBrowser.getPreRequestPlugin() ? [ { name: oBrowser.getPreRequestPlugin(), suppressResult: true } ] : null,
                    requests: aRequests,
                    validationPlugin: oBrowser.getValidationPlugin(),
                    validationParameters: oBrowser.getValidationParameters(),
                    parameters: $.extend({}, oBrowser.getParameters(), aParameters)
                });
                that.mRequest = AjaxUtils.ajax({
                    url: '/hc/hph/genomics/services/',
                    data: that.mRequestContent,
                    contentType: 'application/json;charset=utf-8',
                    method: 'POST',
                    process: false,
                    dataType: 'json',
                    cache: false,
                    delay: 50
                }).done(function (oData) {
                    // Set remove busy indicators of ALL tracks
                    var aChromTracks = sap.ui.getCore().byId(oChromosomeDetails.getBrowser()).getChromosomeTracks();
                    for (var iIndex in aChromTracks) {
                        aChromTracks[iIndex].setBusy(false);
                    }
                    if (that.mRequestContent === this.data) {
                        that.mRequest = null;
                        that.mRequestContent = null;
                        oBrowser.mDetailBusy = false;
                        // Set data of tracks which requested data
                        $.each(aUpdatingTracks, function (i, data) {
                            if (oData[i].result) {
                                if (data) {
                                    data.track.setData(oData[i].result);
                                    if (data.isInitialData) {
                                        data.track.setHasInitialData(true);
                                    }
                                    oChromosomeDetails.mChromCurrentTrackRanges[data.track.getId()] = {
                                        begin: oChromosomeDetails.mBegin,
                                        end: oChromosomeDetails.mBegin + oChromosomeDetails.mWidth
                                    };
                                }
                            } else {
                                sap.ui.getCore().byId(that.getBrowser())._handleError(oData[i].error);
                            }
                        });
                    }
                }).fail(function (oResponse, sReason) {
                    if (that.mRequests === that.data) {
                        that.mRequest = null;
                        that.mRequestContent = null;
                    }
                    if (sReason !== "abort") {
                        // Set remove busy indicators of ALL tracks
                        var aChromTracks = sap.ui.getCore().byId(oChromosomeDetails.getBrowser()).getChromosomeTracks();
                        for (var iIndex in aChromTracks) {
                            aChromTracks[iIndex].setBusy(false);
                        }
                        var oError = {
                            errorCode: "error.HTTP",
                            parameters: [
                                oResponse.status,
                                oResponse.statusText
                            ],
                            message: oResponse.responseText
                        };
                        sap.ui.getCore().byId(that.getBrowser())._handleError(oError);
                    }
                    oBrowser.mDetailBusy = false;
                });
            };
            // Get data for detail tracks
            var oChromTracks = oBrowser.getChromosomeTracks();
            var requests = [];
            var updatingTracks = [];
            var oThis = this;
           /* if (oBrowser.getPreRequestPlugin()) {
                requests.push({
                    name: oBrowser.getPreRequestPlugin(),
                    parameters: {},
                    exceptionsFatal: true
                });
                updatingTracks.push(null);
            }*/
            if (bInitial) {
                $.each(oChromTracks, function (i, oTrack) {
                    oThis.mChromCurrentTrackRanges[oTrack.getId()] = {
                        begin: iBegin,
                        end: iBegin + iWidth
                    };
                    oTrack.setZoom(oThis.mChromosomeIndex, oThis.mChromosome, iBegin, iWidth, oThis.mZoomWidth);
                    var params = oTrack.getInitRequest();
                    if (params.defaultData) {
                        oTrack.setData(params.defaultData, false);
                    }
                    if (params.pluginFunction) {
                        updatingTracks.push({
                            track: oTrack,
                            isInitialData: true,
                            merge: params.merge
                        });
                        requests.push({
                            name: params.pluginFunction,
                            parameters: params.parameters
                        });
                    }
                });
                this._updateScrollIndicator();
            } else {
                // Iterate through all tracks to check whether they need an data update, redraw or pan
                if (oThis.mPxPerBp === dPxPerBp && !bSizeChanged && !bNoChromosomeChange) {
                    // Pan
                    $.each(oChromTracks, function (i, oTrack) {
                        // Check if data needs be reloaded
                        if ((oThis.mChromCurrentTrackRanges[oTrack.getId()].end - oThis.mChromCurrentTrackRanges[oTrack.getId()].begin).toFixed(4) !== iWidth.toFixed(4) || iBegin <= oThis.mChromCurrentTrackRanges[oTrack.getId()].begin - iWidth || iBegin >= oThis.mChromCurrentTrackRanges[oTrack.getId()].begin + iWidth) {
                            var params = oTrack.getUpdateRequest();
                            if (params) {
                                if ($.isEmptyObject(params)) {
                                    oTrack.setZoom(oThis.mChromosomeIndex, oThis.mChromosome, iBegin, iWidth, oThis.mZoomWidth);
                                    oTrack.triggerRedraw();
                                } else {
                                    oTrack.setZoom(oThis.mChromosomeIndex, oThis.mChromosome, iBegin, iWidth, oThis.mZoomWidth);
                                    if (params.defaultData) {
                                        oTrack.setData(params.defaultData, false);
                                    }
                                    if (params.pluginFunction) {
                                        updatingTracks.push({
                                            track: oTrack,
                                            isInitialData: params.isInit,
                                            merge: params.merge
                                        });
                                        requests.push({
                                            name: params.pluginFunction,
                                            parameters: params.parameters
                                        });
                                    }
                                }
                            }
                        } else {
                            oTrack.triggerPan(iBegin);
                        }
                    });
                }    // Rescale
                else {
                    $.each(oChromTracks, function (i, oTrack) {
                        oTrack.setZoom(oThis.mChromosomeIndex, oThis.mChromosome, iBegin, iWidth, oThis.mZoomWidth);
                        var params = oTrack.getUpdateRequest();
                        if (!$.isEmptyObject(params)) {
                            if (params.defaultData) {
                                oThis.mChromCurrentTrackRanges[oTrack.getId()] = {
                                    begin: oThis.mBegin,
                                    end: oThis.mBegin + oThis.mWidth
                                };
                                oTrack.setData(params.defaultData, false);
                            }
                            if (params.pluginFunction) {
                                updatingTracks.push({
                                    track: oTrack,
                                    isInitialData: params.isInit,
                                    merge: params.merge
                                });
                                requests.push({
                                    name: params.pluginFunction,
                                    parameters: params.parameters
                                });
                            }
                        } else {
                            oTrack.triggerRedraw();
                        }
                    });
                }
            }
            if (!$.isEmptyObject(requests)) {
                request(updatingTracks, requests, {
                    chrom: oThis.mChromosomeIndex,
                    begin: Math.max(0, Math.floor(iBegin - iWidth)),
                    end: Math.ceil(iBegin + 2 * iWidth)
                }, oThis);
            }
        },
        getChromosomeRequestParameters: function () {
            return $.extend({}, sap.ui.getCore().byId(this.getBrowser()).getParameters(), {
                chrom: this.mChromosomeIndex,
                begin: this.mDrawBegin,
                end: Math.ceil(this.mBegin + 2 * this.mWidth)
            });
        },
        arrangeTracks: function () {
            var oThis = this;
            function update(oObject, sAttr, sValue) {
                if (!oObject.attr(sAttr)) {
                    oObject.attr(sAttr, sValue);
                } else if (oObject.attr(sAttr) !== sValue) {
                    oObject.transition().duration(250).attr(sAttr, sValue).each("end", function () {
                        oThis._updateScrollIndicator();
                    });
                }
            }
            var iHeight = 0;
            d3.selectAll('#' + this.getId() + ' > svg.details > svg.tracks > g.trackWrapper > g.track').data(sap.ui.getCore().byId(this.getBrowser()).getChromosomeTracks()).each(function (oTrack) {
                var oGroup = d3.select(this);
                update(oGroup, 'transform', 'translate(20,' + iHeight + ')');
                var oMinMaxIconInfo = IconPool.getIconInfo(oTrack.getMinimized() ? 'expand-group' : 'collapse-group');
                oGroup.select('g.icon.minmax > text').style('font-family', oMinMaxIconInfo.fontFamily).text(oMinMaxIconInfo.content);
                oGroup.select("g.icon.minmax > circle > title").text(oThis.getModel("i18n.vb").getResourceBundle().getText(oTrack.getMinimized() ? "common.ShowTrackTooltip" : "common.MinimizeTrackTooltip"));
                iHeight += oTrack.getMinimized() ? 24 : oTrack.getCompleteTrackHeight();
            });
            // Update height of grid
            this.mWindowHeight = iHeight;
            this._drawGrid();
            update(d3.select('#' + this.getId() + ' > svg.details'), 'height', iHeight + 48 + 'px');
            update(d3.select('#' + this.getId() + ' > svg.details > svg.tracks'), 'height', iHeight + 'px');
        },
        createPopover: function () {
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            var oThis = this;
            function formatLocation(oLocation) {
                if (oLocation) {
                    var sPrefix = oThis.getModel("i18n.vb").getResourceBundle().getText("common.Chromosome") + "\u0020";
                    sPrefix += oLocation.chromosome + "\u200a:\u2009";
                    var sFormattedPosition = String(oLocation.position);
                    for (var iIndex = sFormattedPosition.length - 3; iIndex >= 0; iIndex -= 3) {
                        sFormattedPosition = sFormattedPosition.substr(0, iIndex) + "\u2009" + sFormattedPosition.substr(iIndex);
                    }
                    return sPrefix + sFormattedPosition;
                } else {
                    return oThis.getModel("i18n.vb").getResourceBundle().getText("common.Unknown");
                }
            }
            var aSiteSections = sap.ui.getCore().byId(oThis.getBrowser()).getSiteSections().map(function (oSection) {
                return oSection.clone();
            });
            var oSectionMap = aSiteSections.reduce(function (oMap, oSection) {
                oMap[oSection.getKey()] = oSection;
                return oMap;
            }, {});
            var oNavContainer = new sap.m.NavContainer({
                pages: aSiteSections,
                height: "100%"
            });
            var oPopover = new sap.m.Dialog({
                contentWidth: "100%",
                contentHeight: "100%",
                showHeader: true,
                customHeader: new sap.m.Toolbar({
                    content: [
                        new sap.m.ToolbarSpacer(),
                        new sap.m.Label({
                            text: {
                                path: "/location",
                                formatter: formatLocation
                            }
                        }),
                        new sap.m.ToolbarSpacer(),
                        new sap.m.Button({
                            icon: "sap-icon://decline",
                            press: function (oEvent) {
                                oPopover.close();
                                document.removeEventListener("click", oPopover.mEventListener);
                            }
                        })
                    ]
                })
            });
            var oTabList = new sap.m.SelectList({
                width: "10rem",
                selectedKey: "alleles",
                items: aSiteSections.map(function (oSection) {
                    return new sap.ui.core.Item({
                        text: oSection.getTitle() ? oSection.getTitle() : oSection.getBindingInfo("title"),
                        key: oSection.getKey()
                    });
                }),
                selectionChange: function (oEvent) {
                    var oSection = oSectionMap[oEvent.oSource.getSelectedKey()];
                    var iSection = aSiteSections.indexOf(oSection);
                    oNavContainer.to(oSection);
                    if (oSection.getLazyLoading() && $.isEmptyObject(oPopover.getModel().getProperty("/sections/" + iSection))) {
                        oSection.setBusy(true);
                     /*   var requests = [];
                        var firstTrackRequest = 0;
                        if (oBrowser.getPreRequestPlugin()) {
                            requests.push({
                                name: oBrowser.getPreRequestPlugin(),
                                parameters: {},
                                exceptionsFatal: true
                            });
                            firstTrackRequest = 1;
                        }
                        requests = requests.concat(oSection.getRequests()); */
                        AjaxUtils.ajax({
                            url: '/hc/hph/genomics/services/',
                            cache: false,
                            data: JSON.stringify({
                                initRequests: oBrowser.getPreRequestPlugin()?[{name:oBrowser.getPreRequestPlugin(), suppressResult: true}]:null,
                                requests: oSection.getRequests(),
                                validationPlugin: oBrowser.getValidationPlugin(),
                                validationParameters: oBrowser.getValidationParameters(),
                                parameters: $.extend({}, oBrowser.getParameters(), {
                                    chrom: oThis.mChromosomeIndex,
                                    position: oThis.mCoordinate
                                })
                            }),
                            contentType: 'application/json;charset=utf-8',
                            method: 'POST',
                            process: false,
                            dataType: 'json'
                        }).done(function (aData) {
                            oSection.setBusy(false);
                            oSection.bindElement("/sections/" + iSection);
                            //var aSectionData = oData.slice(firstTrackRequest);
                            oPopover.getModel().setProperty("/sections/" + iSection, aData);
                        }).fail(function (oResponse, sReason) {
                            oSection.setBusy(false);
                            if (sReason !== "abort") {
                                var oError = {
                                    errorCode: "error.HTTP",
                                    parameters: [
                                        oResponse.status,
                                        oResponse.statusText
                                    ],
                                    message: oResponse.responseText
                                };
                                sap.ui.getCore().byId(oThis.getBrowser())._handleError(oError);
                            }
                        });
                    }
                }
            }).addStyleClass("sapUiGen-SitePopover-List");
            oPopover.addContent(new sap.ui.layout.HorizontalLayout({
                width: "100%",
                content: [
                    oTabList,
                    oNavContainer
                ]
            }).addStyleClass("sapUiGen-SitePopoverLayout"));
            oPopover.addStyleClass('sapUiGen-SitePopover');
            oPopover.setModel(new sap.ui.model.json.JSONModel());
            oPopover.attachAfterClose('', function () {
                d3.select('div.sapUiGen-PopUpOverlay').style('display', 'none').style('background-color', 'rgba( 0,0,0,0.0 )');
            });
            oPopover.attachBeforeOpen('', function () {
                d3.select('div.sapUiGen-PopUpOverlay').style('display', 'block').style('overflow-y', 'hidden').style('background-color', 'rgba( 0,0,0,0.2 )');
                var iCoordinate = oThis.mCoordinate;
                oPopover.getModel().setData({
                    location: {
                        chromosome: oThis.mChromosome.name,
                        position: iCoordinate + 1
                    },
                    sections: []
                });
                if (oThis.mPositionRequest) {
                    oThis.mPositionRequest.abort();
                    oThis.mPositionRequest = null;
                }
            /*    var requests = [];
                var firstTrackRequest = 0;
                if (oBrowser.getPreRequestPlugin()) {
                    requests.push({
                        name: oBrowser.getPreRequestPlugin(),
                        parameters: {},
                        exceptionsFatal: true
                    });
                    firstTrackRequest = 1;
                }*/
                var requests = aSiteSections.reduce(function (aRequests, oSiteSection) {
                    if (oSiteSection.getLazyLoading()) {
                        return aRequests;
                    } else {
                        return aRequests.concat(oSiteSection.getRequests());
                    }
                }, []);
                // Plugin call
                var aPages = oNavContainer.getPages();
                for (var i = 0; i < aPages.length; i++) {
                    if (!aPages[i].getLazyLoading()) {
                        aPages[i].setBusy(true);
                    }
                    aPages[i].clearDetails();
                }
                oTabList.fireSelectionChange({ selectedItem: oPopover.getContent()[0].getContent()[0].getSelectedKey() ? oSectionMap[oPopover.getContent()[0].getContent()[0].getSelectedKey()] : aSiteSections[0] });
                AjaxUtils.ajax({
                    url: '/hc/hph/genomics/services/',
                    cache: false,
                    data: JSON.stringify({
                        initRequests: oBrowser.getPreRequestPlugin() ? [ { name: oBrowser.getPreRequestPlugin(), suppressResult: true } ] : null,
                        requests: requests,
                        validationPlugin: oBrowser.getValidationPlugin(),
                        validationParameters: oBrowser.getValidationParameters(),
                        parameters: $.extend({}, oBrowser.getParameters(), {
                            chrom: oThis.mChromosomeIndex,
                            position: oThis.mCoordinate
                        })
                    }),
                    contentType: 'application/json;charset=utf-8',
                    method: 'POST',
                    process: false,
                    dataType: 'json'
                }).done(function (oData) {
                    for (var i = 0; i < aPages.length; i++) {
                        if (!aPages[i].getLazyLoading()) {
                            aPages[i].setBusy(false);
                        }
                    }
                    var iRequest = 0;
                    var aSectionData = aSiteSections.map(function (oSection, iSection) {
                        if (!oSection.getLazyLoading()) {
                            oSection.bindElement("/sections/" + iSection);
                            var iTrackCount = oSection.getTracks().length;
                            var iFirstRequest = iRequest;
                            iRequest += iTrackCount;
                            return oData.slice(iFirstRequest, iRequest);
                        } else {
                            return oPopover.getModel().getProperty("/sections/" + iSection);
                        }
                    });
                    oPopover.getModel().setProperty("/sections", aSectionData);
                }).fail(function (oResponse, sReason) {
                    for (var i = 0; i < aPages.length; i++) {
                        aPages[i].setBusy(false);
                    }
                    if (sReason !== "abort") {
                        oPopover.removeAllContent();
                        var oError = {
                            errorCode: "error.HTTP",
                            parameters: [
                                oResponse.status,
                                oResponse.statusText
                            ],
                            message: oResponse.responseText
                        };
                        sap.ui.getCore().byId(oThis.getBrowser())._handleError(oError);
                    }
                });
            });
            this.setAggregation('_detailsPopover', oPopover);
        },
        _forwardEvent: function (oEvent) {
            var oSVG = $(this);
            var oEventCopy;
            var oZoomArea = oSVG.parent().parent().children('div.interaction').children('div.zoom');
            function dispatchEvent() {
                var oRangeSelectArea = oZoomArea.children('div.rangeSelect');
                var oScrollUpArea = oSVG.children('g.trackWrapper').children('g.scrollIndicator').children('rect.scrollUp');
                var oScrollDownArea = oSVG.children('g.trackWrapper').children('g.scrollIndicator').children('rect.scrollDown');
                if (oEvent.clientX >= oRangeSelectArea.offset().left && oEvent.clientX < oRangeSelectArea.offset().left + oRangeSelectArea.width() && oEvent.clientY >= oRangeSelectArea.offset().top && oEvent.clientY < oRangeSelectArea.offset().top + oRangeSelectArea.height()) {
                    oRangeSelectArea[0].dispatchEvent(oEventCopy);
                }
                if (oEvent.clientX >= oZoomArea.offset().left && oEvent.clientX < oZoomArea.offset().left + oZoomArea.width() && oEvent.clientY >= oZoomArea.offset().top && oEvent.clientY < oZoomArea.offset().top + oZoomArea.height()) {
                    oZoomArea[0].dispatchEvent(oEventCopy);
                }
                if (oScrollUpArea.length === 1 && (oEvent.type === 'mousedown' || oEvent.type === 'mouseup') && (oEvent.clientX < oScrollUpArea.offset().left + parseInt(oScrollUpArea.attr('width'), 10) && oEvent.clientY >= oScrollUpArea.offset().top && oEvent.clientY < oScrollUpArea.offset().top + parseInt(oScrollUpArea.attr('height'), 10))) {
                    oScrollUpArea[0].dispatchEvent(oEventCopy);
                }
                if (oScrollDownArea.length === 1 && (oEvent.type === 'mousedown' || oEvent.type === 'mouseup') && (oEvent.clientX < oScrollDownArea.offset().left + parseInt(oScrollDownArea.attr('width'), 10) && oEvent.clientY >= oScrollDownArea.offset().top && oEvent.clientY < oScrollDownArea.offset().top + parseInt(oScrollUpArea.attr('height'), 10))) {
                    oScrollDownArea[0].dispatchEvent(oEventCopy);
                }
            }
            if (oEvent.type === 'mousewheel' || oEvent.originalEvent instanceof WheelEvent) {
                if (typeof window.Event === "function") {
                    oEventCopy = new WheelEvent(oEvent.type, oEvent.originalEvent);
                } else {
                    oEventCopy = document.createEvent("MouseWheelEvent");
                    oEventCopy.initMouseWheelEvent(oEvent.type, oEvent.bubbles, oEvent.cancelable, oEvent.view, oEvent.detail, oEvent.screenX, oEvent.screenY, oEvent.clientX, oEvent.clientY, oEvent.button, oEvent.target, oEvent.originalEvent.modifiersList, oEvent.originalEvent.wheelDelta);
                }
                oZoomArea[0].dispatchEvent(oEventCopy);
            } else {
                if (oEvent.originalEvent instanceof MouseEvent) {
                    if (typeof window.Event === "function") {
                        oEventCopy = new MouseEvent(oEvent.type, oEvent.originalEvent);
                    } else {
                        oEventCopy = document.createEvent("MouseEvent");
                        oEventCopy.initMouseEvent(oEvent.type, oEvent.bubbles, oEvent.cancelable, oEvent.view, oEvent.originalEvent.detail, oEvent.screenX, oEvent.screenY, oEvent.clientX, oEvent.clientY, oEvent.ctrlKey, oEvent.altKey, oEvent.shiftKey, oEvent.metaKey, oEvent.button, oEvent.originalEvent.relatedTarget);
                        oEventCopy.buttons = oEvent.buttons;
                    }
                    dispatchEvent();
                } else if (oEvent.originalEvent instanceof TouchEvent) {
                    oEventCopy = new TouchEvent(oEvent.type, oEvent.originalEvent);
                    dispatchEvent();
                }
            }
        },
        _updateIdeogram: function () {
            var oThis = this;
            this.mIdeogram.selectAll('*').remove();
            if (this.mBegin < 0) {
                this.mBegin = 0;
                this.mDrawBegin = 0;
            }
            if (this.mWidth < 0) {
                this.mBegin += this.mWidth;
                this.mWidth *= -1;
            }
            if (this.mBegin + this.mWidth > this.mChromosome.size) {
                this.mWidth = this.mChromosome.size - this.mBegin;
            }
            if (this.mBegin < 0 || this.mWidth < 0 || this.mBegin + this.mWidth > this.mChromosome.size) {
                this.mBegin = 0;
                this.mDrawBegin = 0;
                this.mWidth = this.mChromosome.size;
            }
            var fBasesPerPixel = this.mChromosome.size / this.mIdeogramWidth;
            var iSelectionPixelBegin = null;
            var oDrag = d3.behavior.drag().on('dragstart', function () {
                iSelectionPixelBegin = d3.mouse(this)[0] - oThis.mMargin.left;
                iSelectionPixelBegin = iSelectionPixelBegin > oThis.mIdeogramWidth ? oThis.mIdeogramWidth : iSelectionPixelBegin > 0 ? iSelectionPixelBegin : 0;
                var oRect = oThis.mIdeogram.select('rect.selection');
                if (oRect.empty()) {
                    oRect = oThis.mIdeogram.append('rect').attr('class', 'selection').attr('x', iSelectionPixelBegin - 2).attr('y', 29).attr('rx', 2).attr('ry', 2).attr('width', 5).attr('height', 4);
                } else {
                    oRect.attr('x', iSelectionPixelBegin - 2).attr('width', 5);
                }
                d3.event.sourceEvent.stopPropagation();
            }).on('drag', function () {
                var iX = d3.mouse(this)[0] - oThis.mMargin.left;
                iX = iX > oThis.mIdeogramWidth ? oThis.mIdeogramWidth : iX > 0 ? iX : 0;
                if (iX === iSelectionPixelBegin) {
                    oThis.mIdeogram.select('rect.selection').attr('x', iSelectionPixelBegin - 2).attr('width', 5);
                } else if (iX > iSelectionPixelBegin) {
                    oThis.mIdeogram.select('rect.selection').attr('x', iSelectionPixelBegin - 2).attr('width', iX - iSelectionPixelBegin + 4);
                } else {
                    oThis.mIdeogram.select('rect.selection').attr('x', iX - 2).attr('width', iSelectionPixelBegin - iX + 5);
                }
                d3.event.sourceEvent.stopPropagation();
            }).on('dragend', function () {
                iSelectionPixelBegin = null;
                var oRect = oThis.mIdeogram.select('rect.selection');
                var fPxPerBp = oThis.mIdeogramWidth / (parseInt(oRect.attr('width'), 10) - 4) / fBasesPerPixel;
                oThis.setZoom((parseInt(oRect.attr('x'), 10) + 2) * fBasesPerPixel, fPxPerBp);
                oThis._panAndZoom((parseInt(oRect.attr('x'), 10) + 2) * fBasesPerPixel, oThis.mZoomWidth / fPxPerBp, fPxPerBp, false);
                d3.event.sourceEvent.stopPropagation();
            });
            d3.select('#' + this.getId() + ' > div.interaction > div.ideogram').call(oDrag);
            this.mIdeogram.attr('width', this.mIdeogramWidth + this.mMargin.left + this.mMargin.right).attr('height', 32 + this.mMargin.top + this.mMargin.bottom);
            var oChromosome = this.mIdeogram.append('g').attr('class', 'ideogram').attr('transform', 'translate(' + this.mMargin.left + ',' + this.mMargin.top + ')');
            var oChromosomeOutline = this.mChromosome.centromere ? this._generateChromosomeOutlineWithCentromere(this.mIdeogramWidth, Math.floor(this.mChromosome.centromere.begin / fBasesPerPixel), Math.floor(this.mChromosome.centromere.center / fBasesPerPixel), Math.floor(this.mChromosome.centromere.end / fBasesPerPixel)) : this._generateChromosomeOutline(this.mIdeogramWidth);
            var oDefs = this.mIdeogram.append('defs');
            // cytobands with clipping
            oDefs.append('clipPath').attr('id', this.getId() + '-outlineClip').append('path').attr('d', oChromosomeOutline);
            var oCytobandsGroup = oChromosome.append('g').attr('class', 'cytobands').attr('clip-path', 'url(#' + this.getId() + '-outlineClip)');
            // background
            oCytobandsGroup.append('rect').attr('class', 'bg').attr('x', 0).attr('y', 0).attr('width', this.mIdeogramWidth).attr('height', 24);
            // cytobands
            var oCytobands = oCytobandsGroup.selectAll('rect.cyto').data(this.mChromosome.cytobands);
            oCytobands.enter().append('rect').attr('class', 'cyto');
            oCytobands.exit().remove();
            oCytobands.style('opacity', function (oItem) {
                return oItem.score;
            }).attr('x', function (oItem) {
                return Math.floor(oItem.begin / fBasesPerPixel);
            }).attr('width', function (oItem) {
                return Math.ceil((oItem.end - oItem.begin) / fBasesPerPixel);
            }).attr('height', 24).filter(function (oItem) {
                return oItem.name;
            }).append('title').text(function (oItem) {
                return oItem.name;
            });
            if (this.mChromosome.centromere) {
                oCytobandsGroup.append('rect').attr('class', 'centromere').attr('x', this.mChromosome.centromere.begin / fBasesPerPixel).attr('y', 0).attr('width', (this.mChromosome.centromere.end - this.mChromosome.centromere.begin) / fBasesPerPixel).attr('height', 24);
            }
            // outline
            oChromosome.append('path').attr('class', 'outline').attr('d', oChromosomeOutline);
        },
        _generateChromosomeOutline: function (width) {
            return 'M0,8Q0,0,8,0H' + (width - 8) + 'Q' + width + ',0,' + width + ',8V16Q' + width + ',24,' + (width - 8) + ',24' + 'H8Q0,24,0,16Z';
        },
        _generateChromosomeOutlineWithCentromere: function (width, centromereBegin, centromereCenter, centromereEnd) {
            var centromereLeftSupport = centromereBegin + Math.floor((centromereCenter - centromereBegin) / 2);
            var centromereRightSupport = centromereCenter + Math.floor((centromereEnd - centromereCenter) / 2);
            return 'M0,8Q0,0,8,0H' + centromereBegin + 'C' + centromereLeftSupport + ',0,' + centromereLeftSupport + ',10,' + centromereCenter + ',10C' + centromereRightSupport + ',10,' + centromereRightSupport + ',0,' + centromereEnd + ',0H' + (width - 8) + 'Q' + width + ',0,' + width + ',8V16Q' + width + ',24,' + (width - 8) + ',24' + 'H' + centromereEnd + 'C' + centromereRightSupport + ',24,' + centromereRightSupport + ',14,' + centromereCenter + ',14C' + centromereLeftSupport + ',14,' + centromereLeftSupport + ',24,' + centromereBegin + ',24H' + '8' + 'Q0,24,0,16Z';
        },
        setSelection: function (iBegin, iWidth) {
            var oSelectionRect = this.mIdeogram.select('g.ideogram rect.selection');
            if (oSelectionRect.empty()) {
                oSelectionRect = this.mIdeogram.select('g.ideogram').append('rect').attr('class', 'selection').attr('y', 29).attr('rx', 2).attr('ry', 2).attr('height', 4);
            }
            oSelectionRect.attr('x', iBegin * this.mIdeogramWidth / this.mChromosome.size - 2).attr('width', iWidth * this.mIdeogramWidth / this.mChromosome.size + 4);
        },
        setZoom: function (begin, pxPerBp, initial) {
            this.mZoom.translate([
                -begin * pxPerBp,
                0
            ]).scale(pxPerBp);
            sap.ui.getCore().byId(this.getBrowser()).mCurrentBegin = begin;
            sap.ui.getCore().byId(this.getBrowser()).mCurrentWidth = this.mZoomWidth / pxPerBp;
            this.$().children("svg.details").children("svg.tracks").children("rect").attr("cursor", pxPerBp > 1 ? "cell" : null);
            this.setSelection(begin, this.mZoomWidth / pxPerBp);
        },
        _panAndZoom: function (begin, width, pxPerBp, initial) {
            // update internals and selection
            this.mBegin = begin;
            this.mWidth = width;
            this.mDrawBegin = Math.max(0, Math.floor(begin - width));
            // update tracks
            this.loadAndSetTrackData(initial, begin, width, pxPerBp);
            this.mPxPerBp = pxPerBp;
            this.$().children("svg.details").children("svg.tracks").children("rect").attr("cursor", pxPerBp > 1 ? "cell" : null);
            this._drawGrid();
            this.setSelection(begin, width);
            this._refreshCursor();
        },
        _drawGrid: function () {
            var oThis = this;
            this.mTickDistance = this._computeDistance(this.getMinTickDistance());
            this.mLabelDistance = this._computeDistance(this.getMinLabelDistance());
            this.mLeftmostTickPosition = Math.ceil((this.mBegin + 1) / this.mTickDistance) * this.mTickDistance - 1;
            this.mLeftmostLabelPosition = Math.ceil((this.mBegin + 1) / this.mLabelDistance) * this.mLabelDistance - 1;
            // update labels
            var oLabels = this.mGrid.selectAll('text').data(Array.apply(null, Array(Math.ceil(this.mWidth / this.mLabelDistance))).map(function (dummy, index) {
                return oThis.mLeftmostLabelPosition + index * oThis.mLabelDistance;
            }));
            oLabels.enter().append('text').attr('y', 12);
            oLabels.exit().remove();
            oLabels.attr('x', function (position) {
                return (position - oThis.mBegin) * oThis.mPxPerBp + 4;
            }).text(function (position) {
                return position + 1;
            }).html(function (position) {
                return oThis._formatPosition(position + 1);
            });
            // update ticks
            var oTicks = this.mGrid.selectAll('path').data(Array.apply(null, Array(Math.ceil(this.mWidth / this.mTickDistance))).map(function (dummy, index) {
                return oThis.mLeftmostTickPosition + index * oThis.mTickDistance;
            }));
            oTicks.enter().append('path');
            oTicks.exit().remove();
            oTicks.attr('class', function (position) {
                return Math.abs((position + 1) / oThis.mLabelDistance - Math.round((position + 1) / oThis.mLabelDistance)) < 1e-3 ? 'majorTick' : 'minorTick';
            }).attr('d', function (position) {
                return 'M' + (position - oThis.mBegin) * oThis.mPxPerBp + ',' + (Math.abs((position + 1) / oThis.mLabelDistance - Math.round((position + 1) / oThis.mLabelDistance)) < 1e-3 ? 0 : 16) + 'V' + (oThis.mWindowHeight - 4);
            });
        },
        _refreshCursor: function () {
            if (this.mCursor && !this.mCursor.empty()) {
                if (this.mRangeBegin !== null && this.mCoordinate !== null) {
                    this.mCursor.style('display', 'block').style('left', (Math.min(this.mRangeBegin, this.mCoordinate) - this.mBegin) * this.mPxPerBp - 1 + 'px').style('width', Math.max(Math.ceil(Math.abs(this.mRangeBegin - this.mCoordinate) + 1), 1) * this.mPxPerBp + 'px');
                } else if (this.mCoordinate !== null && this.mCoordinate >= 0) {
                    this.mCursor.style('display', 'block').style('left', (this.mCoordinate - this.mBegin) * this.mPxPerBp - 1 + 'px').style('width', this.mPxPerBp + 'px');
                } else {
                    this.mCursor.style('display', 'none');
                }
            }
        },
        _showPositionInformation: function () {
            if (this.mPositionRequest) {
                this.mPositionRequest.abort();
                this.mPositionRequest = null;
            }
            var oPopover = this.getAggregation('_detailsPopover');
            oPopover.open();
            oPopover.mEventListener = function (oEvent) {
                if (oEvent.target.id === "sap-ui-blocklayer-popup") {
                    oPopover.close();
                    document.removeEventListener("click", oPopover.mEventListener);
                }
            };
            document.addEventListener("click", oPopover.mEventListener);
        },
        _computeDistance: function (minPxDistance) {
            var logDistance = Math.log(minPxDistance / this.mPxPerBp) / Math.log(10);
            for (var index = 0; index < this.mTickSteps.length; ++index) {
                if (Math.floor(logDistance) + this.mLogTickSteps[index] >= logDistance) {
                    return Math.max(1, Math.pow(10, Math.floor(logDistance)) * this.mTickSteps[index]);
                }
            }
            return Math.max(1, Math.pow(10, Math.ceil(logDistance)));
        },
        _formatPosition: function (position) {
            var formatted = String(position);
            for (var index = formatted.length - 3; index >= 0; index -= 3) {
                formatted = formatted.substr(0, index) + '&thinsp;' + formatted.substr(index);
            }
            return formatted;
        }
    });
    return VariantBrowser;
});