jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.require('hc.hph.genomics.ui.lib.vb.VariantDensityLegend');
jQuery.sap.require('hc.hph.genomics.ui.lib.vb.StandardLegend');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.VariantDensityTrack');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.VariantDensityTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 5
            },
            color: {
                type: 'string[]',
                defaultValue: ['#aaaaaa']
            }
        },
        aggregations: {
            legends: {
                type: 'hc.hph.genomics.ui.lib.vb.StandardLegend',
                multiple: true
            }
        },
        defaultAggregation: "legends"
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.overview.Track.prototype.init.call(this);
        this.setAggregation('_standardLegend', new hc.hph.genomics.ui.lib.vb.StandardLegend());
        this.mBrowser = null;
    },
    getInitRequest: function () {
        var oData = this.getModel().getData();
        var oParams = this.getParameters();
        $.extend(oParams, { binSize: sap.ui.getCore().byId(this.getBrowser()).mArcBinSize });
        if (!$.isEmptyObject(oData)) {
            return {
                defaultData: oData,
                pluginFunction: this.getInitPlugin(),
                parameters: oParams,
                merge: false
            };
        } else {
            return {
                pluginFunction: this.getInitPlugin(),
                parameters: oParams,
                merge: false
            };
        }
    },
    _drawGroupedDensities: function (oThis) {
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        var aLayouts = oBrowser.mOverviewLayouts;
        var binSize = oBrowser.mArcBinSize;
        var oData = this.getModel().getData().categories;
        this.getAggregation('_standardLegend').setProperty('color', oBrowser.getConfigColors(), true);
        //Draw area
        var fMinValue = this.getMinValue() ? this.getMinValue() : 0;
        var fMaxValue = this.getMaxValue() ? this.getMaxValue() : this.getModel().getData().maxValue;
        var oVariantDensityScale = d3.scale.linear()    //Get the right array of variant density values by filtering on index for each item
                             // For the domain max value: Either take the maximum of the the data for this track or any given max value
.domain([
            fMinValue,
            fMaxValue
        ]).range([
            oThis.mOuterRadius,
            oThis.mInnerRadius
        ]);
        oBrowser.getChromosomeGroups().each(function (oChromosome, iChromosome) {
            if (oData[oChromosome.index]) {
                var oChromosomeGroup = d3.select('#' + oThis.getId() + '-' + iChromosome);
                if (oChromosomeGroup.empty()) {
                    oChromosomeGroup = d3.select(this).append('g').attr('id', oThis.getId() + '-' + iChromosome);
                }
                var oStack = d3.layout.stack().values(function (d) {
                    return d ? d.values : 0;
                });
                var oDensity = oChromosomeGroup.selectAll("path.variantDensity").data(oStack(oData[oChromosome.index].filter(function (d) {
                    return d;
                })));
                var oRadialArea = d3.svg.area.radial().interpolate('linear').innerRadius(function (data) {
                    return oVariantDensityScale(Math.min(fMaxValue, Math.max(fMinValue, data.y0 + data.y)));
                }).outerRadius(function (data) {
                    return oVariantDensityScale(Math.min(fMaxValue, Math.max(fMinValue, data.y0)));
                }).angle(function (data, index) {
                    return aLayouts[oChromosome.index].radialScale(index * binSize);
                });
                var oDensityPath = oDensity.enter().append('path').attr('class', 'variantDensity ').attr('id', function (d) {
                    return oThis.getId() + '-' + iChromosome;
                }).style('pointer-events', 'none').attr('d', function (d) {
                    return oRadialArea(d.values);
                });
                oDensityPath.style('opacity', 0).style('fill', function (d) {
                    return oBrowser.getCategoryColor(d.category);
                }).transition().duration(500).style('opacity', 1);
            }
        });
    },
    _drawDensities: function (oThis) {
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        var aLayouts = oBrowser.mOverviewLayouts;
        var binSize = oBrowser.mArcBinSize;
        this.getAggregation('_standardLegend').setProperty('color', this.getColor(), true);
        var fMinValue = this.getMinValue() ? this.getMinValue() : 0;
        var fMaxValue = this.getMaxValue() ? this.getMaxValue() : d3.max(d3.entries(this.getModel().getData()), function (chromosomeData) {
            return d3.max(chromosomeData.value);
        });
        var oVariantDensityScale = d3.scale.linear()    //Get the right array of variant density values by filtering on index for each item
                             // For the domain max value: Either take the maximum of the the data for this track or any given max value
.domain([
            fMinValue,
            fMaxValue
        ]).range([
            oThis.mOuterRadius,
            oThis.mInnerRadius
        ]);
        var oGroup = oBrowser.getChromosomeGroups().filter(function (oItem) {
            return !$.isEmptyObject(oThis.getModel().getData()[oItem.index]);
        }).append('path').attr('class', 'variantDensity ').attr('id', function (d) {
            return oThis.getId() + '-' + d.index;
        }).style('pointer-events', 'none').attr('d', function (item) {
            var oRadialLine = d3.svg.line.radial().interpolate('linear').radius(function (data) {
                return oVariantDensityScale(Math.min(fMaxValue, Math.max(fMinValue, data)));
            }).angle(function (data, index) {
                return aLayouts[item.index].radialScale(index * binSize);
            });
            return oRadialLine(oThis.getModel().getData()[item.index]) + oBrowser._completeWithArc(item.beginAngle, item.endAngle, oThis.mOuterRadius);
        });
        oGroup.style('opacity', 0).style('fill', oThis.getColor()).style('stroke', oThis.getColor()).transition().duration(500).style('opacity', 1);
    },
    draw: function () {
        this.setLegendData();
        // list of all chromosomes
        var bInitialized = this.mGroup !== undefined;
        if (bInitialized) {
            this.mGroup.remove();    //Remove paths, so the same path doesn't exist several times
        }
        if (this.getModel().getData().hasOwnProperty('categories')) {
            this._drawGroupedDensities(this);
        } else {
            this._drawDensities(this);
        }
        this.getAggregation('_standardLegend').rerender();
    },
    _clearTrack: function (bAnimation) {
        var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
        var oThis = this;
        if (bAnimation) {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).transition().duration(250).style('opacity', 0).remove();
            }
        } else {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).remove();
            }
        }
    },
    setData: function (oData) {
        var fMaxValue = 0;
        var oTrackData = this.getModel().getData();
        var sKey;
        //delete old data
        for (sKey in oTrackData) {
            delete oTrackData[sKey];
        }
        // set new data
        for (sKey in oData) {
            if (sKey === 'maxValue' && oData[sKey] && d3.max(oData[sKey]) > fMaxValue) {
                fMaxValue = d3.max(oData[sKey]);
            }
            oTrackData[sKey] = oData[sKey];
        }
        return fMaxValue;
    },
    setLegendData: function () {
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if (!$.isEmptyObject(this.getLegends()) && this.getLegends()[0] instanceof hc.hph.genomics.ui.lib.vb.VariantDensityLegend) {
            var oLegend = this.getLegends()[0];
            var aDensities = [];
            if (oBrowser.isConfigured()) {
                var oData = this.getModel().getData().categories;
                var aChromosomes = Object.keys(oData);
                for (var i = 0; i < aChromosomes.length; i++) {
                    var aCategories = oData[aChromosomes[i]];
                    for (var n = 0; n < aCategories.length; n++) {
                        for (var m = 0; m < aCategories[n].values.length; m++) {
                            aDensities.push(aCategories[n].values[m].y);
                        }
                    }
                }
            } else {
                var aKeys = Object.keys(this.getModel().getData());
                for (var key in aKeys) {
                    var aChromData = this.getModel().getData()[key];
                    for (var i = 0; i < aChromData.length; i++) {
                        aDensities.push(aChromData[i]);
                    }
                }
            }
            aDensities.sort(function (a, b) {
                return a - b;
            });
            oLegend.setProperty('minTotal', 0, true);
            oLegend.setProperty('lowerQuart', aDensities[Math.floor(aDensities.length / 4)], true);
            oLegend.setProperty('upperQuart', aDensities[Math.floor(aDensities.length * (3 / 4))], true);
            oLegend.setProperty('med', d3.median(aDensities), true);
            oLegend.setProperty('min', d3.min(aDensities), true);
            oLegend.setProperty('max', d3.max(aDensities), true);
            oLegend.setProperty('maxTotal', d3.max(aDensities));
        }
    }
});